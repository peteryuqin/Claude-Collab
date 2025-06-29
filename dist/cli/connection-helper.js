"use strict";
/**
 * Connection Helper for Claude-Collab CLI
 * Provides easy-to-use connection management with auto-reconnection
 */
// const { ConnectionManager } = require('../dist/core/connection-manager.js');
// For now, use WebSocket directly until connection-manager is properly compiled
const WebSocket = require('ws');
const { EventEmitter } = require('events');
class CLIConnectionHelper extends EventEmitter {
    constructor(serverUrl) {
        super();
        this.serverUrl = serverUrl;
        this.connectionManager = null;
        this.isAuthenticated = false;
    }
    /**
     * Connect to server with automatic retry
     */
    async connect() {
        console.log('- Connecting to server...');
        this.connectionManager = new ConnectionManager({
            url: this.serverUrl,
            maxReconnectAttempts: 10,
            initialReconnectDelay: 1000,
            maxReconnectDelay: 10000,
            reconnectBackoffMultiplier: 1.5,
            heartbeatInterval: 30000,
            connectionTimeout: 10000,
            enableAutoReconnect: true
        });
        // Set up event handlers
        this.setupEventHandlers();
        try {
            await this.connectionManager.connect();
            return this.connectionManager;
        }
        catch (error) {
            this.handleConnectionError(error);
            throw error;
        }
    }
    /**
     * Set up event handlers for connection manager
     */
    setupEventHandlers() {
        this.connectionManager.on('connected', (info) => {
            if (info.reconnected) {
                console.log(`✔ Reconnected after ${info.attemptCount} attempts`);
            }
            else {
                console.log('✔ Connected to server');
            }
            this.emit('connected', info);
        });
        this.connectionManager.on('disconnected', (info) => {
            if (!info.manual) {
                console.log('⚠ Disconnected from server');
            }
            this.emit('disconnected', info);
        });
        this.connectionManager.on('reconnecting', (info) => {
            console.log(`🔄 Reconnecting... (attempt ${info.attempt}/${info.maxAttempts})`);
            this.emit('reconnecting', info);
        });
        this.connectionManager.on('error', (error) => {
            // Don't show connection errors during reconnection
            const state = this.connectionManager.getState();
            if (!state.isReconnecting) {
                this.handleConnectionError(error);
            }
        });
        this.connectionManager.on('serverUnavailable', (info) => {
            console.error(`\n❌ ${info.message}`);
            console.log(`💡 ${info.suggestion}`);
            console.log(`\n   Run 'cc server' in another terminal to start the server\n`);
        });
        this.connectionManager.on('connectionTimeout', (info) => {
            console.error(`\n⏱️  ${info.message}`);
            console.log(`💡 ${info.suggestion}\n`);
        });
        this.connectionManager.on('reconnectFailed', (info) => {
            console.error(`\n❌ Failed to reconnect after ${info.attempts} attempts`);
            console.log('💡 Please check the server status and try again\n');
            process.exit(1);
        });
        this.connectionManager.on('messageQueued', (info) => {
            console.log(`📋 Message queued (${info.queueLength} in queue)`);
        });
        this.connectionManager.on('flushingQueue', (info) => {
            console.log(`📤 Sending ${info.count} queued messages...`);
        });
        this.connectionManager.on('healthUpdate', (info) => {
            if (info.health === 'unhealthy') {
                console.warn('⚠️  Connection health degraded');
            }
        });
        // Forward raw WebSocket events
        this.connectionManager.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                this.emit('message', message);
            }
            catch (error) {
                console.error('Invalid message format:', error);
            }
        });
    }
    /**
     * Handle connection errors with user-friendly messages
     */
    handleConnectionError(error) {
        const errorMessages = {
            'ECONNREFUSED': {
                message: 'Cannot connect to Claude-Collab server',
                solution: "Run 'cc server' in another terminal to start the server"
            },
            'ENOTFOUND': {
                message: 'Server address not found',
                solution: 'Check your server URL or network connection'
            },
            'ETIMEDOUT': {
                message: 'Connection timed out',
                solution: 'Check if the server is running and accessible'
            },
            'Connection timeout': {
                message: 'Server is not responding',
                solution: 'The server might be overloaded or down'
            }
        };
        const errorInfo = errorMessages[error.code] || errorMessages[error.message] || {
            message: error.message,
            solution: 'Check the documentation at https://docs.claude-collab.ai'
        };
        console.error(`\n❌ ${errorInfo.message}`);
        console.log(`💡 ${errorInfo.solution}\n`);
    }
    /**
     * Send a message through the connection
     */
    send(data) {
        if (!this.connectionManager) {
            throw new Error('Not connected to server');
        }
        this.connectionManager.send(data);
    }
    /**
     * Disconnect from server
     */
    disconnect() {
        if (this.connectionManager) {
            this.connectionManager.disconnect();
        }
    }
    /**
     * Get connection state
     */
    getState() {
        if (!this.connectionManager) {
            return { isConnected: false, isReconnecting: false };
        }
        return this.connectionManager.getState();
    }
    /**
     * Force reconnection
     */
    forceReconnect() {
        if (this.connectionManager) {
            this.connectionManager.forceReconnect();
        }
    }
}
module.exports = { CLIConnectionHelper };
//# sourceMappingURL=connection-helper.js.map