"use strict";
/**
 * Claude-Collab v3.2.0 - Real-time Enhancer
 * Adds file watching and instant updates to improve real-time experience
 * Enhanced with session notifications and message queue
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeEnhancer = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const events_1 = require("events");
class RealtimeEnhancer extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.watchers = new Map();
        this.debounceTimers = new Map();
        this.cursorPositions = new Map();
        this.activeEditors = new Map();
        this.messageQueue = new Array(); // v3.2: Message queue for batching
        this.config = {
            watchPaths: ['.claude-collab'],
            debounceMs: 100,
            enableNotifications: true,
            enableLiveCursors: true,
            ...config
        };
        // Start message queue processor (v3.2)
        this.startMessageQueue();
    }
    /**
     * Start watching files for real-time updates
     */
    startWatching() {
        this.config.watchPaths.forEach(watchPath => {
            if (!fs.existsSync(watchPath)) {
                console.warn(`Watch path does not exist: ${watchPath}`);
                return;
            }
            const watcher = fs.watch(watchPath, { recursive: true }, (eventType, filename) => {
                if (filename) {
                    this.handleFileChange(eventType, path.join(watchPath, filename));
                }
            });
            this.watchers.set(watchPath, watcher);
            console.log(`👁️  Watching for changes in: ${watchPath}`);
        });
    }
    /**
     * Stop watching files
     */
    stopWatching() {
        this.watchers.forEach((watcher, path) => {
            watcher.close();
            console.log(`👁️  Stopped watching: ${path}`);
        });
        this.watchers.clear();
    }
    /**
     * Handle file change with debouncing
     */
    handleFileChange(eventType, filepath) {
        // Clear existing debounce timer
        const existingTimer = this.debounceTimers.get(filepath);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }
        // Set new debounce timer
        const timer = setTimeout(() => {
            this.processFileChange(eventType, filepath);
            this.debounceTimers.delete(filepath);
        }, this.config.debounceMs);
        this.debounceTimers.set(filepath, timer);
    }
    /**
     * Process the file change after debouncing
     */
    processFileChange(eventType, filepath) {
        const filename = path.basename(filepath);
        // Ignore certain files
        if (this.shouldIgnoreFile(filename)) {
            return;
        }
        // Determine change type
        let changeType;
        if (!fs.existsSync(filepath)) {
            changeType = 'unlink';
        }
        else if (eventType === 'rename') {
            changeType = 'add';
        }
        else {
            changeType = 'change';
        }
        const event = {
            type: changeType,
            path: filepath,
            filename: filename,
            timestamp: new Date()
        };
        // Emit specific events based on file type
        if (filename === 'TASK_BOARD.md') {
            this.emit('task-board-updated', event);
        }
        else if (filename === 'DISCUSSION_BOARD.md') {
            this.emit('discussion-updated', event);
        }
        else if (filename.endsWith('.json') && filepath.includes('messages')) {
            this.emit('new-message', event);
        }
        else {
            this.emit('file-changed', event);
        }
        // Send notification if enabled
        if (this.config.enableNotifications) {
            this.sendEnhancedNotification(event);
        }
    }
    /**
     * Check if file should be ignored
     */
    shouldIgnoreFile(filename) {
        const ignorePatterns = [
            /^\./, // Hidden files
            /~$/, // Backup files
            /\.tmp$/, // Temp files
            /\.lock$/, // Lock files
            /node_modules/, // Dependencies
        ];
        return ignorePatterns.some(pattern => pattern.test(filename));
    }
    /**
     * Send real-time notification
     */
    sendNotification(event) {
        const notification = {
            type: 'file-notification',
            event,
            message: this.getNotificationMessage(event)
        };
        this.emit('notification', notification);
    }
    /**
     * Get human-readable notification message
     */
    getNotificationMessage(event) {
        switch (event.filename) {
            case 'TASK_BOARD.md':
                return '📋 Task board updated';
            case 'DISCUSSION_BOARD.md':
                return '💬 New discussion activity';
            default:
                if (event.filename.endsWith('.json') && event.path.includes('messages')) {
                    return '📨 New message received';
                }
                return `📄 ${event.filename} ${event.type}d`;
        }
    }
    /**
     * Track cursor position for live collaboration
     */
    updateCursorPosition(sessionId, position) {
        if (!this.config.enableLiveCursors)
            return;
        this.cursorPositions.set(sessionId, {
            ...position,
            timestamp: new Date()
        });
        // Broadcast to other sessions
        this.emit('cursor-moved', {
            sessionId,
            position
        });
    }
    /**
     * Track active editors for a file
     */
    trackFileEditor(filepath, sessionId, action) {
        if (!this.activeEditors.has(filepath)) {
            this.activeEditors.set(filepath, new Set());
        }
        const editors = this.activeEditors.get(filepath);
        if (action === 'open') {
            editors.add(sessionId);
            this.emit('editor-joined', { filepath, sessionId });
        }
        else {
            editors.delete(sessionId);
            this.emit('editor-left', { filepath, sessionId });
            // Clean up cursor position
            this.cursorPositions.delete(sessionId);
        }
        // Notify about concurrent editing
        if (editors.size > 1) {
            this.emit('concurrent-editing', {
                filepath,
                editors: Array.from(editors)
            });
        }
    }
    /**
     * Get active editors for a file
     */
    getActiveEditors(filepath) {
        return Array.from(this.activeEditors.get(filepath) || []);
    }
    /**
     * Get all cursor positions
     */
    getCursorPositions() {
        // Clean up stale positions (older than 30 seconds)
        const now = Date.now();
        const staleThreshold = 30000;
        for (const [sessionId, position] of this.cursorPositions.entries()) {
            if (now - position.timestamp.getTime() > staleThreshold) {
                this.cursorPositions.delete(sessionId);
            }
        }
        return new Map(this.cursorPositions);
    }
    /**
     * Create a typing indicator
     */
    updateTypingStatus(sessionId, isTyping) {
        this.emit('typing-status', {
            sessionId,
            isTyping,
            timestamp: new Date()
        });
    }
    /**
     * Watch specific file with callback
     */
    watchFile(filepath, callback) {
        const handler = (event) => {
            if (event.path === filepath) {
                callback(event);
            }
        };
        this.on('file-changed', handler);
        // Return unsubscribe function
        return () => {
            this.off('file-changed', handler);
        };
    }
    /**
     * Get file update stream for WebSocket
     */
    createUpdateStream(ws) {
        const handlers = {
            'file-changed': (event) => {
                ws.send(JSON.stringify({
                    type: 'file-update',
                    data: event
                }));
            },
            'task-board-updated': (event) => {
                ws.send(JSON.stringify({
                    type: 'task-board-update',
                    data: event
                }));
            },
            'discussion-updated': (event) => {
                ws.send(JSON.stringify({
                    type: 'discussion-update',
                    data: event
                }));
            },
            'new-message': (event) => {
                ws.send(JSON.stringify({
                    type: 'new-message-notification',
                    data: event
                }));
            },
            'cursor-moved': (data) => {
                ws.send(JSON.stringify({
                    type: 'cursor-update',
                    data
                }));
            },
            'typing-status': (data) => {
                ws.send(JSON.stringify({
                    type: 'typing-indicator',
                    data
                }));
            }
        };
        // Attach all handlers
        Object.entries(handlers).forEach(([event, handler]) => {
            this.on(event, handler);
        });
        // Clean up on disconnect
        ws.on('close', () => {
            Object.entries(handlers).forEach(([event, handler]) => {
                this.off(event, handler);
            });
        });
    }
    /**
     * Start message queue processing (v3.2)
     */
    startMessageQueue() {
        this.queueProcessor = setInterval(() => {
            this.processMessageQueue();
        }, 100); // Process queue every 100ms
    }
    /**
     * Process queued messages with batching and priority (v3.2)
     */
    processMessageQueue() {
        if (this.messageQueue.length === 0)
            return;
        // Sort by priority and timestamp
        this.messageQueue.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
            if (priorityDiff !== 0)
                return priorityDiff;
            return a.timestamp.getTime() - b.timestamp.getTime();
        });
        // Process up to 5 messages per batch to prevent overwhelming
        const batch = this.messageQueue.splice(0, 5);
        batch.forEach(queuedMessage => {
            this.emit('queued-notification', queuedMessage);
        });
        if (batch.length > 0) {
            console.log(`📨 Processed ${batch.length} queued notifications`);
        }
    }
    /**
     * Queue a message for processing (v3.2)
     */
    queueMessage(type, data, priority = 'medium') {
        this.messageQueue.push({
            type,
            data,
            timestamp: new Date(),
            priority
        });
        // If high priority, process immediately
        if (priority === 'high') {
            this.processMessageQueue();
        }
    }
    /**
     * Get queue status (v3.2)
     */
    getQueueStatus() {
        const priorities = { high: 0, medium: 0, low: 0 };
        this.messageQueue.forEach(msg => priorities[msg.priority]++);
        return {
            pending: this.messageQueue.length,
            priorities
        };
    }
    /**
     * Enhanced notification with auto-queuing (v3.2)
     */
    sendEnhancedNotification(event) {
        const notification = {
            type: 'file-notification',
            event,
            message: this.getNotificationMessage(event)
        };
        // Determine priority based on file type
        let priority = 'medium';
        if (event.filename.includes('message') || event.filename === 'DISCUSSION_BOARD.md') {
            priority = 'high'; // Messages get high priority
        }
        else if (event.filename === 'TASK_BOARD.md') {
            priority = 'medium';
        }
        else {
            priority = 'low';
        }
        // Queue the notification
        this.queueMessage('notification', notification, priority);
        // Also emit immediately for real-time listeners
        this.emit('notification', notification);
    }
    /**
     * Clean up resources
     */
    destroy() {
        this.stopWatching();
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();
        this.cursorPositions.clear();
        this.activeEditors.clear();
        // Stop queue processor (v3.2)
        if (this.queueProcessor) {
            clearInterval(this.queueProcessor);
        }
        this.removeAllListeners();
    }
}
exports.RealtimeEnhancer = RealtimeEnhancer;
//# sourceMappingURL=realtime-enhancer.js.map