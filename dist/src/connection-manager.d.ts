/**
 * Connection Manager for Claude-Collab
 * Handles WebSocket connections with automatic reconnection,
 * health monitoring, and graceful error recovery
 *
 * Created by Alex - Connection Expert
 */
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
export declare class ConnectionManager extends EventEmitter {
    private ws?;
    private config;
    private state;
    private reconnectTimer?;
    private heartbeatTimer?;
    private connectionTimer?;
    private messageQueue;
    private reconnectDelay;
    private lastPingTime?;
    private lastPongTime?;
    constructor(config: ConnectionConfig);
    /**
     * Connect to WebSocket server with automatic retry
     */
    connect(): Promise<void>;
    /**
     * Send a message with queuing support
     */
    send(data: any): void;
    /**
     * Gracefully disconnect
     */
    disconnect(): void;
    /**
     * Get current connection state
     */
    getState(): ConnectionState;
    /**
     * Handle connection errors
     */
    private handleConnectionError;
    /**
     * Handle connection close
     */
    private handleConnectionClose;
    /**
     * Schedule reconnection with exponential backoff
     */
    private scheduleReconnect;
    /**
     * Start heartbeat mechanism
     */
    private startHeartbeat;
    /**
     * Update connection health based on metrics
     */
    private updateConnectionHealth;
    /**
     * Flush queued messages
     */
    private flushMessageQueue;
    /**
     * Clear all timers
     */
    private clearTimers;
    /**
     * Force reconnection
     */
    forceReconnect(): void;
}
export default ConnectionManager;
//# sourceMappingURL=connection-manager.d.ts.map