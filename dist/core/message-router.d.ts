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
export declare class MessageRouter extends EventEmitter {
    private routes;
    private globalHandlers;
    private messageHistory;
    private maxHistorySize;
    constructor();
    /**
     * Register a route handler
     */
    register(pattern: string | RegExp, handler: RouteHandler['handler'], options?: Partial<RouteHandler>): void;
    /**
     * Route a message to appropriate handlers
     */
    route(session: any, message: any): Promise<void>;
    /**
     * Get message history
     */
    getHistory(filter?: {
        from?: string;
        to?: string;
        type?: string;
        limit?: number;
    }): Message[];
    /**
     * Get conversation between agents
     */
    getConversation(agent1: string, agent2: string, limit?: number): Message[];
    /**
     * Clear old messages
     */
    pruneHistory(): void;
    /**
     * Setup default routes
     */
    private setupDefaultRoutes;
    /**
     * Execute a route handler
     */
    private executeHandler;
    /**
     * Record message in history
     */
    private recordMessage;
}
//# sourceMappingURL=message-router.d.ts.map