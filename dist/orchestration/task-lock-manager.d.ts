/**
 * Claude-Collab v3.1.0 - Task Lock Manager
 * Implements atomic locking to prevent task race conditions
 */
import { EventEmitter } from 'events';
export interface TaskLock {
    taskId: string;
    lockedBy: string;
    lockedAt: Date;
    expiresAt: Date;
    lockToken: string;
}
export interface TaskClaim {
    taskId: string;
    agentId: string;
    claimedAt: Date;
    status: 'pending' | 'in_progress' | 'completed';
}
export declare class TaskLockManager extends EventEmitter {
    private locks;
    private claims;
    private lockTimeout;
    private persistPath;
    private cleanupInterval;
    constructor(workspacePath?: string);
    /**
     * Attempt to acquire a lock on a task
     * Returns lock token if successful, null if task is already locked
     */
    acquireLock(taskId: string, agentId: string): string | null;
    /**
     * Release a lock
     */
    releaseLock(taskId: string, lockToken: string): boolean;
    /**
     * Claim a task after acquiring lock
     */
    claimTask(taskId: string, agentId: string, lockToken: string): boolean;
    /**
     * Update task status
     */
    updateTaskStatus(taskId: string, agentId: string, status: TaskClaim['status']): boolean;
    /**
     * Check if a task is available for claiming
     */
    isTaskAvailable(taskId: string): boolean;
    /**
     * Get task owner
     */
    getTaskOwner(taskId: string): string | null;
    /**
     * Get all tasks claimed by an agent
     */
    getAgentTasks(agentId: string): TaskClaim[];
    /**
     * Get lock status for a task
     */
    getLockStatus(taskId: string): {
        isLocked: boolean;
        lockedBy?: string;
        expiresIn?: number;
    };
    /**
     * Refresh an existing lock
     */
    private refreshLock;
    /**
     * Check if a lock has expired
     */
    private isLockExpired;
    /**
     * Clean up expired locks
     */
    private cleanupExpiredLocks;
    /**
     * Generate unique lock token
     */
    private generateLockToken;
    /**
     * Save locks to disk
     */
    private saveLocks;
    /**
     * Load locks from disk
     */
    private loadLocks;
    /**
     * Save claims to file (for persistence)
     */
    private saveClaimsToFile;
    /**
     * Cleanup on shutdown
     */
    destroy(): void;
}
//# sourceMappingURL=task-lock-manager.d.ts.map