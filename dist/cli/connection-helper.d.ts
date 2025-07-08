export class CLIConnectionHelper extends EventEmitter<[never]> {
    constructor(serverUrl: any);
    serverUrl: any;
    ws: WebSocket | null;
    isAuthenticated: boolean;
    reconnectAttempts: number;
    maxReconnectAttempts: number;
    reconnectDelay: number;
    maxReconnectDelay: number;
    reconnectBackoffMultiplier: number;
    messageQueue: any[];
    isConnected: boolean;
    isReconnecting: boolean;
    manualDisconnect: boolean;
    /**
     * Connect to server with automatic retry
     */
    connect(): Promise<any>;
    /**
     * Attempt to reconnect with exponential backoff
     */
    attemptReconnect(): Promise<void>;
    /**
     * Send a message to the server
     */
    send(data: any): void;
    /**
     * Disconnect from server
     */
    disconnect(): void;
    /**
     * Force reconnect
     */
    forceReconnect(): Promise<any>;
    /**
     * Get connection state
     */
    getState(): {
        isConnected: boolean;
        isReconnecting: boolean;
        reconnectAttempts: number;
        queuedMessages: number;
    };
    /**
     * Handle connection errors with user-friendly messages
     */
    handleConnectionError(error: any): void;
}
/**
 * Create connection with defaults
 */
export function createConnection(serverUrl?: string): Promise<CLIConnectionHelper>;
import { EventEmitter } from "events";
import WebSocket = require("ws");
//# sourceMappingURL=connection-helper.d.ts.map