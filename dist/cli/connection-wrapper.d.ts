export = ConnectionWrapper;
declare class ConnectionWrapper extends EventEmitter<[never]> {
    constructor(config: any);
    config: {
        url: any;
        maxReconnectAttempts: any;
        initialReconnectDelay: any;
        maxReconnectDelay: any;
        reconnectBackoffMultiplier: any;
        heartbeatInterval: any;
        connectionTimeout: any;
        enableAutoReconnect: boolean;
    };
    ws: WebSocket | null;
    isConnected: boolean;
    isReconnecting: boolean;
    reconnectAttempts: number;
    reconnectDelay: any;
    messageQueue: any[];
    heartbeatTimer: NodeJS.Timeout | null;
    reconnectTimer: NodeJS.Timeout | null;
    connect(): Promise<any>;
    send(data: any): void;
    disconnect(): void;
    handleError(error: any): void;
    handleClose(code: any, reason: any): void;
    scheduleReconnect(): void;
    startHeartbeat(): void;
    flushMessageQueue(): void;
    clearTimers(): void;
    get readyState(): 0 | 1 | 2 | 3;
    close(): void;
    on(event: any, listener: any): this;
}
import { EventEmitter } from "events";
import WebSocket = require("ws");
//# sourceMappingURL=connection-wrapper.d.ts.map