"use strict";
/**
 * Connection Wrapper for CLI
 * Wraps the ConnectionManager for use in the CLI with automatic reconnection
 *
 * Created by Alex - Connection Expert
 */
const { EventEmitter } = require('events');
const WebSocket = require('ws');
class ConnectionWrapper extends EventEmitter {
    constructor(config) {
        super();
        this.config = {
            url: config.url || 'ws://localhost:8765',
            maxReconnectAttempts: config.maxReconnectAttempts || 10,
            initialReconnectDelay: config.initialReconnectDelay || 1000,
            maxReconnectDelay: config.maxReconnectDelay || 30000,
            reconnectBackoffMultiplier: config.reconnectBackoffMultiplier || 1.5,
            heartbeatInterval: config.heartbeatInterval || 30000,
            connectionTimeout: config.connectionTimeout || 10000,
            enableAutoReconnect: config.enableAutoReconnect !== false
        };
        this.ws = null;
        this.isConnected = false;
        this.isReconnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectDelay = this.config.initialReconnectDelay;
        this.messageQueue = [];
        this.heartbeatTimer = null;
        this.reconnectTimer = null;
    }
    async connect() {
        return new Promise((resolve, reject) => {
            if (this.isConnected) {
                resolve();
                return;
            }
            this.emit('connecting', { url: this.config.url });
            try {
                this.ws = new WebSocket(this.config.url);
                // Connection timeout
                const timeoutTimer = setTimeout(() => {
                    if (!this.isConnected) {
                        this.ws.terminate();
                        const error = new Error('Connection timeout - server may be unavailable');
                        this.handleError(error);
                        reject(error);
                    }
                }, this.config.connectionTimeout);
                this.ws.on('open', () => {
                    clearTimeout(timeoutTimer);
                    this.isConnected = true;
                    this.isReconnecting = false;
                    this.reconnectAttempts = 0;
                    this.reconnectDelay = this.config.initialReconnectDelay;
                    this.emit('connected', {
                        reconnected: this.reconnectAttempts > 0
                    });
                    this.startHeartbeat();
                    this.flushMessageQueue();
                    resolve();
                });
                this.ws.on('message', (data) => {
                    this.emit('message', data);
                });
                this.ws.on('error', (error) => {
                    this.handleError(error);
                    if (!this.isConnected) {
                        clearTimeout(timeoutTimer);
                        reject(error);
                    }
                });
                this.ws.on('close', (code, reason) => {
                    clearTimeout(timeoutTimer);
                    this.handleClose(code, reason);
                });
                this.ws.on('pong', () => {
                    this.emit('pong');
                });
            }
            catch (error) {
                this.handleError(error);
                reject(error);
            }
        });
    }
    send(data) {
        const message = typeof data === 'string' ? data : JSON.stringify(data);
        if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(message);
            }
            catch (error) {
                this.messageQueue.push(data);
            }
        }
        else {
            this.messageQueue.push(data);
            this.emit('messageQueued', { queueLength: this.messageQueue.length });
        }
    }
    disconnect() {
        this.config.enableAutoReconnect = false;
        this.clearTimers();
        if (this.ws) {
            this.ws.removeAllListeners();
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.close(1000, 'Client disconnect');
            }
            else {
                this.ws.terminate();
            }
        }
        this.isConnected = false;
        this.isReconnecting = false;
    }
    handleError(error) {
        this.emit('error', error);
        // Provide helpful error messages
        if (error.code === 'ECONNREFUSED') {
            this.emit('serverUnavailable', {
                message: 'Cannot connect to Claude-Collab server',
                suggestion: 'Please ensure the server is running with: claude-collab server'
            });
        }
        else if (error.code === 'ETIMEDOUT') {
            this.emit('timeout', {
                message: 'Connection timed out',
                suggestion: 'Check your network connection and server status'
            });
        }
    }
    handleClose(code, reason) {
        this.clearTimers();
        this.isConnected = false;
        this.emit('disconnected', { code, reason: reason.toString() });
        // Auto-reconnect if enabled and not a clean close
        if (this.config.enableAutoReconnect &&
            code !== 1000 &&
            this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect();
        }
    }
    scheduleReconnect() {
        if (this.isReconnecting)
            return;
        this.isReconnecting = true;
        this.reconnectAttempts++;
        this.emit('reconnecting', {
            attempt: this.reconnectAttempts,
            maxAttempts: this.config.maxReconnectAttempts,
            delay: this.reconnectDelay
        });
        this.reconnectTimer = setTimeout(async () => {
            try {
                await this.connect();
            }
            catch (error) {
                if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
                    this.emit('reconnectFailed', {
                        attempts: this.reconnectAttempts,
                        lastError: error
                    });
                    this.isReconnecting = false;
                }
            }
        }, this.reconnectDelay);
        // Exponential backoff
        this.reconnectDelay = Math.min(this.reconnectDelay * this.config.reconnectBackoffMultiplier, this.config.maxReconnectDelay);
    }
    startHeartbeat() {
        this.heartbeatTimer = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.ping();
            }
        }, this.config.heartbeatInterval);
    }
    flushMessageQueue() {
        if (this.messageQueue.length === 0)
            return;
        const queue = [...this.messageQueue];
        this.messageQueue = [];
        for (const message of queue) {
            this.send(message);
        }
    }
    clearTimers() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
    // WebSocket compatibility methods
    get readyState() {
        return this.ws ? this.ws.readyState : WebSocket.CLOSED;
    }
    close() {
        this.disconnect();
    }
    // Forward event listeners to underlying WebSocket
    on(event, listener) {
        if (event === 'open') {
            return super.on('connected', listener);
        }
        if (event === 'close') {
            return super.on('disconnected', listener);
        }
        return super.on(event, listener);
    }
}
module.exports = ConnectionWrapper;
//# sourceMappingURL=connection-wrapper.js.map