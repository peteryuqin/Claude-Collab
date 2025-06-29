/**
 * Connection Manager for Claude-Collab
 * Handles WebSocket connections with automatic reconnection,
 * health monitoring, and graceful error recovery
 * 
 * Created by Alex - Connection Expert
 */

import { WebSocket } from 'ws';
import { EventEmitter } from 'events';

export interface ConnectionConfig {
  url: string;
  maxReconnectAttempts?: number;
  initialReconnectDelay?: number;
  maxReconnectDelay?: number;
  reconnectBackoffMultiplier?: number;
  heartbeatInterval?: number;
  connectionTimeout?: number;
  enableAutoReconnect?: boolean;
}

export interface ConnectionState {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  lastError?: Error;
  lastConnectedAt?: Date;
  lastDisconnectedAt?: Date;
  connectionHealth: 'healthy' | 'degraded' | 'unhealthy';
}

export class ConnectionManager extends EventEmitter {
  private ws?: WebSocket;
  private config: Required<ConnectionConfig>;
  private state: ConnectionState;
  private reconnectTimer?: NodeJS.Timeout;
  private heartbeatTimer?: NodeJS.Timeout;
  private connectionTimer?: NodeJS.Timeout;
  private messageQueue: any[] = [];
  private reconnectDelay: number;
  private lastPingTime?: Date;
  private lastPongTime?: Date;

  constructor(config: ConnectionConfig) {
    super();
    
    // Set defaults for config
    this.config = {
      url: config.url,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 10,
      initialReconnectDelay: config.initialReconnectDelay ?? 1000,
      maxReconnectDelay: config.maxReconnectDelay ?? 30000,
      reconnectBackoffMultiplier: config.reconnectBackoffMultiplier ?? 1.5,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      connectionTimeout: config.connectionTimeout ?? 10000,
      enableAutoReconnect: config.enableAutoReconnect ?? true
    };

    this.reconnectDelay = this.config.initialReconnectDelay;
    
    this.state = {
      isConnected: false,
      isReconnecting: false,
      reconnectAttempts: 0,
      connectionHealth: 'unhealthy'
    };
  }

  /**
   * Connect to WebSocket server with automatic retry
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.state.isConnected) {
        resolve();
        return;
      }

      this.emit('connecting', { url: this.config.url });
      
      try {
        this.ws = new WebSocket(this.config.url);
        
        // Set connection timeout
        this.connectionTimer = setTimeout(() => {
          if (!this.state.isConnected) {
            this.ws?.terminate();
            const error = new Error('Connection timeout');
            this.handleConnectionError(error);
            reject(error);
          }
        }, this.config.connectionTimeout);

        // Handle connection open
        this.ws.on('open', () => {
          this.clearTimers();
          this.state.isConnected = true;
          this.state.isReconnecting = false;
          this.state.reconnectAttempts = 0;
          this.state.lastConnectedAt = new Date();
          this.state.connectionHealth = 'healthy';
          this.reconnectDelay = this.config.initialReconnectDelay;
          
          this.emit('connected', { 
            reconnected: this.state.reconnectAttempts > 0,
            attemptCount: this.state.reconnectAttempts 
          });
          
          // Start heartbeat
          this.startHeartbeat();
          
          // Flush message queue
          this.flushMessageQueue();
          
          resolve();
        });

        // Handle messages
        this.ws.on('message', (data) => {
          this.emit('message', data);
        });

        // Handle pong for heartbeat
        this.ws.on('pong', () => {
          this.lastPongTime = new Date();
          this.updateConnectionHealth();
        });

        // Handle errors
        this.ws.on('error', (error) => {
          this.handleConnectionError(error);
          if (!this.state.isConnected) {
            reject(error);
          }
        });

        // Handle connection close
        this.ws.on('close', (code, reason) => {
          this.handleConnectionClose(code, reason.toString());
        });

      } catch (error) {
        this.handleConnectionError(error as Error);
        reject(error);
      }
    });
  }

  /**
   * Send a message with queuing support
   */
  send(data: any): void {
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    
    if (this.state.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(message);
        this.emit('messageSent', data);
      } catch (error) {
        this.emit('sendError', { error, data });
        this.messageQueue.push(data);
      }
    } else {
      // Queue message for later delivery
      this.messageQueue.push(data);
      this.emit('messageQueued', { 
        data, 
        queueLength: this.messageQueue.length 
      });
    }
  }

  /**
   * Gracefully disconnect
   */
  disconnect(): void {
    this.config.enableAutoReconnect = false;
    this.clearTimers();
    
    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close(1000, 'Client disconnect');
      } else {
        this.ws.terminate();
      }
    }
    
    this.state.isConnected = false;
    this.state.isReconnecting = false;
    this.emit('disconnected', { manual: true });
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return { ...this.state };
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(error: Error): void {
    this.state.lastError = error;
    this.emit('error', error);
    
    // Common error handling
    if (error.message.includes('ECONNREFUSED')) {
      this.emit('serverUnavailable', { 
        message: 'Server is not running or unreachable',
        suggestion: 'Please ensure the server is running on ' + this.config.url
      });
    } else if (error.message.includes('ETIMEDOUT')) {
      this.emit('connectionTimeout', {
        message: 'Connection timed out',
        suggestion: 'Check your network connection'
      });
    }
  }

  /**
   * Handle connection close
   */
  private handleConnectionClose(code: number, reason: string): void {
    this.clearTimers();
    this.state.isConnected = false;
    this.state.lastDisconnectedAt = new Date();
    
    this.emit('disconnected', { 
      code, 
      reason,
      wasClean: code === 1000
    });

    // Attempt reconnection if enabled
    if (this.config.enableAutoReconnect && 
        code !== 1000 && // Not a clean close
        this.state.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.state.isReconnecting) return;
    
    this.state.isReconnecting = true;
    this.state.reconnectAttempts++;
    
    this.emit('reconnecting', {
      attempt: this.state.reconnectAttempts,
      delay: this.reconnectDelay,
      maxAttempts: this.config.maxReconnectAttempts
    });

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        // Connection failed, will retry if attempts remaining
        if (this.state.reconnectAttempts >= this.config.maxReconnectAttempts) {
          this.emit('reconnectFailed', {
            attempts: this.state.reconnectAttempts,
            lastError: this.state.lastError
          });
          this.state.isReconnecting = false;
        }
      }
    }, this.reconnectDelay);

    // Increase delay for next attempt (exponential backoff)
    this.reconnectDelay = Math.min(
      this.reconnectDelay * this.config.reconnectBackoffMultiplier,
      this.config.maxReconnectDelay
    );
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.lastPingTime = new Date();
        this.ws.ping();
        
        // Check for missed pong after 5 seconds
        setTimeout(() => {
          if (this.lastPingTime && this.lastPongTime) {
            const timeSinceLastPong = this.lastPingTime.getTime() - this.lastPongTime.getTime();
            if (timeSinceLastPong > 5000) {
              this.state.connectionHealth = 'unhealthy';
              this.emit('connectionUnhealthy', {
                reason: 'No pong received',
                timeSinceLastPong
              });
              
              // Force reconnection
              this.ws?.terminate();
            }
          }
        }, 5000);
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Update connection health based on metrics
   */
  private updateConnectionHealth(): void {
    if (!this.lastPingTime || !this.lastPongTime) return;
    
    const latency = this.lastPongTime.getTime() - this.lastPingTime.getTime();
    
    if (latency < 100) {
      this.state.connectionHealth = 'healthy';
    } else if (latency < 500) {
      this.state.connectionHealth = 'degraded';
    } else {
      this.state.connectionHealth = 'unhealthy';
    }
    
    this.emit('healthUpdate', {
      health: this.state.connectionHealth,
      latency
    });
  }

  /**
   * Flush queued messages
   */
  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) return;
    
    const queueCopy = [...this.messageQueue];
    this.messageQueue = [];
    
    this.emit('flushingQueue', { count: queueCopy.length });
    
    for (const message of queueCopy) {
      this.send(message);
    }
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = undefined;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  /**
   * Force reconnection
   */
  forceReconnect(): void {
    this.disconnect();
    this.config.enableAutoReconnect = true;
    this.state.reconnectAttempts = 0;
    this.connect();
  }
}

export default ConnectionManager;