/**
 * Claude-Collab v3.0.0 - Message Router
 * Routes messages between agents with diversity checks
 */

import { EventEmitter } from 'events';

export interface Message {
  type: string;
  from: string;
  to?: string | string[];
  content: any;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface RouteHandler {
  pattern: string | RegExp;
  handler: (session: any, message: any) => Promise<void>;
  requiresAuth?: boolean;
  requiresPerspective?: boolean;
}

export class MessageRouter extends EventEmitter {
  private routes: Map<string, RouteHandler[]> = new Map();
  private globalHandlers: RouteHandler[] = [];
  private messageHistory: Message[] = [];
  private maxHistorySize: number = 1000;

  constructor() {
    super();
    this.setupDefaultRoutes();
  }

  /**
   * Register a route handler
   */
  register(pattern: string | RegExp, handler: RouteHandler['handler'], options?: Partial<RouteHandler>): void {
    const route: RouteHandler = {
      pattern,
      handler,
      ...options
    };

    if (typeof pattern === 'string') {
      const routes = this.routes.get(pattern) || [];
      routes.push(route);
      this.routes.set(pattern, routes);
    } else {
      this.globalHandlers.push(route);
    }
  }

  /**
   * Route a message to appropriate handlers
   */
  async route(session: any, message: any): Promise<void> {
    // Record message
    this.recordMessage({
      type: message.type,
      from: session.id,
      to: message.to,
      content: message,
      timestamp: new Date(),
      metadata: {
        perspective: session.perspective,
        role: session.role
      }
    });

    // Check exact match routes
    const exactRoutes = this.routes.get(message.type) || [];
    for (const route of exactRoutes) {
      await this.executeHandler(route, session, message);
    }

    // Check pattern match routes
    for (const route of this.globalHandlers) {
      if (route.pattern instanceof RegExp && route.pattern.test(message.type)) {
        await this.executeHandler(route, session, message);
      }
    }

    // Emit for external handlers
    this.emit('message', { session, message });
  }

  /**
   * Get message history
   */
  getHistory(filter?: {
    from?: string;
    to?: string;
    type?: string;
    limit?: number;
  }): Message[] {
    let history = [...this.messageHistory];

    if (filter) {
      if (filter.from) {
        history = history.filter(m => m.from === filter.from);
      }
      if (filter.to) {
        history = history.filter(m => 
          m.to === filter.to || 
          (Array.isArray(m.to) && m.to.includes(filter.to!))
        );
      }
      if (filter.type) {
        history = history.filter(m => m.type === filter.type);
      }
      if (filter.limit) {
        history = history.slice(-filter.limit);
      }
    }

    return history;
  }

  /**
   * Get conversation between agents
   */
  getConversation(agent1: string, agent2: string, limit: number = 50): Message[] {
    return this.messageHistory
      .filter(m => 
        (m.from === agent1 && m.to === agent2) ||
        (m.from === agent2 && m.to === agent1) ||
        (m.from === agent1 && Array.isArray(m.to) && m.to.includes(agent2)) ||
        (m.from === agent2 && Array.isArray(m.to) && m.to.includes(agent1))
      )
      .slice(-limit);
  }

  /**
   * Clear old messages
   */
  pruneHistory(): void {
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory = this.messageHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Setup default routes
   */
  private setupDefaultRoutes(): void {
    // Heartbeat
    this.register('ping', async (session, message) => {
      session.ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
    });

    // Echo request
    this.register('echo', async (session, message) => {
      session.ws.send(JSON.stringify({ 
        type: 'echo-response', 
        original: message,
        from: 'server'
      }));
    });

    // Status request
    this.register('status', async (session, message) => {
      session.ws.send(JSON.stringify({
        type: 'status-response',
        session: {
          id: session.id,
          name: session.name,
          role: session.role,
          perspective: session.perspective
        },
        server: {
          version: '3.0.0',
          uptime: process.uptime()
        }
      }));
    });
  }

  /**
   * Execute a route handler
   */
  private async executeHandler(
    route: RouteHandler,
    session: any,
    message: any
  ): Promise<void> {
    try {
      // Check requirements
      if (route.requiresAuth && !session.authenticated) {
        session.ws.send(JSON.stringify({
          type: 'error',
          message: 'Authentication required'
        }));
        return;
      }

      if (route.requiresPerspective && !session.perspective) {
        session.ws.send(JSON.stringify({
          type: 'error',
          message: 'Perspective assignment required'
        }));
        return;
      }

      // Execute handler
      await route.handler(session, message);
    } catch (error) {
      console.error(`Error in route handler for ${message.type}:`, error);
      session.ws.send(JSON.stringify({
        type: 'error',
        message: 'Internal server error'
      }));
    }
  }

  /**
   * Record message in history
   */
  private recordMessage(message: Message): void {
    this.messageHistory.push(message);
    this.pruneHistory();
    this.emit('message-recorded', message);
  }
}