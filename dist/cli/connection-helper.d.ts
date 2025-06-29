export class CLIConnectionHelper extends EventEmitter<[never]> {
    constructor(serverUrl: any);
    serverUrl: any;
    connectionManager: any;
    isAuthenticated: boolean;
    /**
     * Connect to server with automatic retry
     */
    connect(): Promise<any>;
    /**
     * Set up event handlers for connection manager
     */
    setupEventHandlers(): void;
    /**
     * Handle connection errors with user-friendly messages
     */
    handleConnectionError(error: any): void;
    /**
     * Send a message through the connection
     */
    send(data: any): void;
    /**
     * Disconnect from server
     */
    disconnect(): void;
    /**
     * Get connection state
     */
    getState(): any;
    /**
     * Force reconnection
     */
    forceReconnect(): void;
}
import { EventEmitter } from "events";
//# sourceMappingURL=connection-helper.d.ts.map