/**
 * Claude-Collab v3.2.0 - Real-time Enhancer
 * Adds file watching and instant updates to improve real-time experience
 * Enhanced with session notifications and message queue
 */

import * as fs from 'fs';
import * as path from 'path';
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

export class RealtimeEnhancer extends EventEmitter {
  private config: RealtimeConfig;
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private cursorPositions: Map<string, CursorPosition> = new Map();
  private activeEditors: Map<string, Set<string>> = new Map();
  private messageQueue: Array<QueuedMessage> = new Array(); // v3.2: Message queue for batching
  private queueProcessor?: NodeJS.Timeout; // v3.2: Queue processing timer

  constructor(config?: Partial<RealtimeConfig>) {
    super();
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
  startWatching(): void {
    this.config.watchPaths.forEach(watchPath => {
      if (!fs.existsSync(watchPath)) {
        console.warn(`Watch path does not exist: ${watchPath}`);
        return;
      }

      const watcher = fs.watch(watchPath, { recursive: true }, (eventType, filename) => {
        if (filename) {
          this.handleFileChange(eventType as 'rename' | 'change', path.join(watchPath, filename));
        }
      });

      this.watchers.set(watchPath, watcher);
      console.log(`👁️  Watching for changes in: ${watchPath}`);
    });
  }

  /**
   * Stop watching files
   */
  stopWatching(): void {
    this.watchers.forEach((watcher, path) => {
      watcher.close();
      console.log(`👁️  Stopped watching: ${path}`);
    });
    this.watchers.clear();
  }

  /**
   * Handle file change with debouncing
   */
  private handleFileChange(eventType: 'rename' | 'change', filepath: string): void {
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
  private processFileChange(eventType: string, filepath: string): void {
    const filename = path.basename(filepath);
    
    // Ignore certain files
    if (this.shouldIgnoreFile(filename)) {
      return;
    }

    // Determine change type
    let changeType: FileChangeEvent['type'];
    if (!fs.existsSync(filepath)) {
      changeType = 'unlink';
    } else if (eventType === 'rename') {
      changeType = 'add';
    } else {
      changeType = 'change';
    }

    const event: FileChangeEvent = {
      type: changeType,
      path: filepath,
      filename: filename,
      timestamp: new Date()
    };

    // Emit specific events based on file type
    if (filename === 'TASK_BOARD.md') {
      this.emit('task-board-updated', event);
    } else if (filename === 'DISCUSSION_BOARD.md') {
      this.emit('discussion-updated', event);
    } else if (filename.endsWith('.json') && filepath.includes('messages')) {
      this.emit('new-message', event);
    } else {
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
  private shouldIgnoreFile(filename: string): boolean {
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
  private sendNotification(event: FileChangeEvent): void {
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
  private getNotificationMessage(event: FileChangeEvent): string {
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
  updateCursorPosition(sessionId: string, position: CursorPosition): void {
    if (!this.config.enableLiveCursors) return;

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
  trackFileEditor(filepath: string, sessionId: string, action: 'open' | 'close'): void {
    if (!this.activeEditors.has(filepath)) {
      this.activeEditors.set(filepath, new Set());
    }

    const editors = this.activeEditors.get(filepath)!;
    
    if (action === 'open') {
      editors.add(sessionId);
      this.emit('editor-joined', { filepath, sessionId });
    } else {
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
  getActiveEditors(filepath: string): string[] {
    return Array.from(this.activeEditors.get(filepath) || []);
  }

  /**
   * Get all cursor positions
   */
  getCursorPositions(): Map<string, CursorPosition> {
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
  updateTypingStatus(sessionId: string, isTyping: boolean): void {
    this.emit('typing-status', {
      sessionId,
      isTyping,
      timestamp: new Date()
    });
  }

  /**
   * Watch specific file with callback
   */
  watchFile(filepath: string, callback: (event: FileChangeEvent) => void): () => void {
    const handler = (event: FileChangeEvent) => {
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
  createUpdateStream(ws: WebSocket): void {
    const handlers = {
      'file-changed': (event: FileChangeEvent) => {
        ws.send(JSON.stringify({
          type: 'file-update',
          data: event
        }));
      },
      'task-board-updated': (event: FileChangeEvent) => {
        ws.send(JSON.stringify({
          type: 'task-board-update',
          data: event
        }));
      },
      'discussion-updated': (event: FileChangeEvent) => {
        ws.send(JSON.stringify({
          type: 'discussion-update',
          data: event
        }));
      },
      'new-message': (event: FileChangeEvent) => {
        ws.send(JSON.stringify({
          type: 'new-message-notification',
          data: event
        }));
      },
      'cursor-moved': (data: any) => {
        ws.send(JSON.stringify({
          type: 'cursor-update',
          data
        }));
      },
      'typing-status': (data: any) => {
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
  private startMessageQueue(): void {
    this.queueProcessor = setInterval(() => {
      this.processMessageQueue();
    }, 100); // Process queue every 100ms
  }

  /**
   * Process queued messages with batching and priority (v3.2)
   */
  private processMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    // Sort by priority and timestamp
    this.messageQueue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
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
  private queueMessage(type: string, data: any, priority: 'low' | 'medium' | 'high' = 'medium'): void {
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
  getQueueStatus(): { pending: number; priorities: Record<string, number> } {
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
  private sendEnhancedNotification(event: FileChangeEvent): void {
    const notification = {
      type: 'file-notification',
      event,
      message: this.getNotificationMessage(event)
    };

    // Determine priority based on file type
    let priority: 'low' | 'medium' | 'high' = 'medium';
    if (event.filename.includes('message') || event.filename === 'DISCUSSION_BOARD.md') {
      priority = 'high'; // Messages get high priority
    } else if (event.filename === 'TASK_BOARD.md') {
      priority = 'medium';
    } else {
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
  destroy(): void {
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

export interface CursorPosition {
  file: string;
  line: number;
  column: number;
  selection?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  timestamp: Date;
}