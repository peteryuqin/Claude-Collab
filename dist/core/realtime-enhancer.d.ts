/**
 * Claude-Collab v3.2.0 - Real-time Enhancer
 * Adds file watching and instant updates to improve real-time experience
 * Enhanced with session notifications and message queue
 */
import { EventEmitter } from 'events';
import { WebSocket } from 'ws';
export interface FileChangeEvent {
    type: 'add' | 'change' | 'unlink';
    path: string;
    filename: string;
    timestamp: Date;
}
export interface RealtimeConfig {
    watchPaths: string[];
    debounceMs: number;
    enableNotifications: boolean;
    enableLiveCursors: boolean;
}
export interface QueuedMessage {
    type: string;
    data: any;
    timestamp: Date;
    priority: 'low' | 'medium' | 'high';
}
export declare class RealtimeEnhancer extends EventEmitter {
    private config;
    private watchers;
    private debounceTimers;
    private cursorPositions;
    private activeEditors;
    private messageQueue;
    private queueProcessor?;
    constructor(config?: Partial<RealtimeConfig>);
    /**
     * Start watching files for real-time updates
     */
    startWatching(): void;
    /**
     * Stop watching files
     */
    stopWatching(): void;
    /**
     * Handle file change with debouncing
     */
    private handleFileChange;
    /**
     * Process the file change after debouncing
     */
    private processFileChange;
    /**
     * Check if file should be ignored
     */
    private shouldIgnoreFile;
    /**
     * Send real-time notification
     */
    private sendNotification;
    /**
     * Get human-readable notification message
     */
    private getNotificationMessage;
    /**
     * Track cursor position for live collaboration
     */
    updateCursorPosition(sessionId: string, position: CursorPosition): void;
    /**
     * Track active editors for a file
     */
    trackFileEditor(filepath: string, sessionId: string, action: 'open' | 'close'): void;
    /**
     * Get active editors for a file
     */
    getActiveEditors(filepath: string): string[];
    /**
     * Get all cursor positions
     */
    getCursorPositions(): Map<string, CursorPosition>;
    /**
     * Create a typing indicator
     */
    updateTypingStatus(sessionId: string, isTyping: boolean): void;
    /**
     * Watch specific file with callback
     */
    watchFile(filepath: string, callback: (event: FileChangeEvent) => void): () => void;
    /**
     * Get file update stream for WebSocket
     */
    createUpdateStream(ws: WebSocket): void;
    /**
     * Start message queue processing (v3.2)
     */
    private startMessageQueue;
    /**
     * Process queued messages with batching and priority (v3.2)
     */
    private processMessageQueue;
    /**
     * Queue a message for processing (v3.2)
     */
    private queueMessage;
    /**
     * Get queue status (v3.2)
     */
    getQueueStatus(): {
        pending: number;
        priorities: Record<string, number>;
    };
    /**
     * Enhanced notification with auto-queuing (v3.2)
     */
    private sendEnhancedNotification;
    /**
     * Clean up resources
     */
    destroy(): void;
}
export interface CursorPosition {
    file: string;
    line: number;
    column: number;
    selection?: {
        start: {
            line: number;
            column: number;
        };
        end: {
            line: number;
            column: number;
        };
    };
    timestamp: Date;
}
//# sourceMappingURL=realtime-enhancer.d.ts.map