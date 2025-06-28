"use strict";
/**
 * Claude-Collab v3.1.0 - Task Lock Manager
 * Implements atomic locking to prevent task race conditions
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
exports.TaskLockManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const events_1 = require("events");
class TaskLockManager extends events_1.EventEmitter {
    constructor(workspacePath = '.claude-collab') {
        super();
        this.locks = new Map();
        this.claims = new Map();
        this.lockTimeout = 5000; // 5 seconds
        this.persistPath = path.join(workspacePath, 'task-locks.json');
        this.loadLocks();
        // Clean up expired locks every second
        this.cleanupInterval = setInterval(() => this.cleanupExpiredLocks(), 1000);
    }
    /**
     * Attempt to acquire a lock on a task
     * Returns lock token if successful, null if task is already locked
     */
    acquireLock(taskId, agentId) {
        // Check if task is already locked
        const existingLock = this.locks.get(taskId);
        if (existingLock && !this.isLockExpired(existingLock)) {
            // Lock is still valid
            if (existingLock.lockedBy !== agentId) {
                return null; // Someone else has the lock
            }
            // Same agent requesting - refresh the lock
            return this.refreshLock(taskId, agentId);
        }
        // Create new lock
        const lockToken = this.generateLockToken();
        const lock = {
            taskId,
            lockedBy: agentId,
            lockedAt: new Date(),
            expiresAt: new Date(Date.now() + this.lockTimeout),
            lockToken
        };
        this.locks.set(taskId, lock);
        this.saveLocks();
        this.emit('lock-acquired', { taskId, agentId, lockToken });
        return lockToken;
    }
    /**
     * Release a lock
     */
    releaseLock(taskId, lockToken) {
        const lock = this.locks.get(taskId);
        if (!lock || lock.lockToken !== lockToken) {
            return false; // Invalid lock token
        }
        this.locks.delete(taskId);
        this.saveLocks();
        this.emit('lock-released', { taskId, releasedBy: lock.lockedBy });
        return true;
    }
    /**
     * Claim a task after acquiring lock
     */
    claimTask(taskId, agentId, lockToken) {
        const lock = this.locks.get(taskId);
        // Verify lock ownership
        if (!lock || lock.lockToken !== lockToken || lock.lockedBy !== agentId) {
            return false;
        }
        // Check if task is already claimed
        if (this.claims.has(taskId)) {
            return false;
        }
        // Create claim
        const claim = {
            taskId,
            agentId,
            claimedAt: new Date(),
            status: 'pending'
        };
        this.claims.set(taskId, claim);
        // Release the lock after successful claim
        this.releaseLock(taskId, lockToken);
        this.emit('task-claimed', claim);
        this.saveClaimsToFile();
        return true;
    }
    /**
     * Update task status
     */
    updateTaskStatus(taskId, agentId, status) {
        const claim = this.claims.get(taskId);
        if (!claim || claim.agentId !== agentId) {
            return false; // Not the owner
        }
        claim.status = status;
        this.saveClaimsToFile();
        this.emit('task-status-updated', { taskId, status, agentId });
        return true;
    }
    /**
     * Check if a task is available for claiming
     */
    isTaskAvailable(taskId) {
        // Check if locked
        const lock = this.locks.get(taskId);
        if (lock && !this.isLockExpired(lock)) {
            return false;
        }
        // Check if already claimed
        const claim = this.claims.get(taskId);
        if (claim && claim.status !== 'completed') {
            return false;
        }
        return true;
    }
    /**
     * Get task owner
     */
    getTaskOwner(taskId) {
        const claim = this.claims.get(taskId);
        return claim ? claim.agentId : null;
    }
    /**
     * Get all tasks claimed by an agent
     */
    getAgentTasks(agentId) {
        return Array.from(this.claims.values())
            .filter(claim => claim.agentId === agentId);
    }
    /**
     * Get lock status for a task
     */
    getLockStatus(taskId) {
        const lock = this.locks.get(taskId);
        if (!lock || this.isLockExpired(lock)) {
            return { isLocked: false };
        }
        const expiresIn = lock.expiresAt.getTime() - Date.now();
        return {
            isLocked: true,
            lockedBy: lock.lockedBy,
            expiresIn
        };
    }
    /**
     * Refresh an existing lock
     */
    refreshLock(taskId, agentId) {
        const lock = this.locks.get(taskId);
        if (!lock || lock.lockedBy !== agentId) {
            throw new Error('Cannot refresh lock - not the owner');
        }
        lock.expiresAt = new Date(Date.now() + this.lockTimeout);
        this.saveLocks();
        return lock.lockToken;
    }
    /**
     * Check if a lock has expired
     */
    isLockExpired(lock) {
        return lock.expiresAt.getTime() < Date.now();
    }
    /**
     * Clean up expired locks
     */
    cleanupExpiredLocks() {
        let cleaned = 0;
        for (const [taskId, lock] of this.locks.entries()) {
            if (this.isLockExpired(lock)) {
                this.locks.delete(taskId);
                cleaned++;
                this.emit('lock-expired', { taskId, previousOwner: lock.lockedBy });
            }
        }
        if (cleaned > 0) {
            this.saveLocks();
        }
    }
    /**
     * Generate unique lock token
     */
    generateLockToken() {
        return `lock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Save locks to disk
     */
    saveLocks() {
        try {
            const data = {
                locks: Array.from(this.locks.entries()).map(([_, lock]) => ({
                    ...lock,
                    lockedAt: lock.lockedAt.toISOString(),
                    expiresAt: lock.expiresAt.toISOString()
                })),
                version: '3.1.0'
            };
            // Use writeFileSync with 'wx' flag for exclusive write
            const tempPath = `${this.persistPath}.tmp`;
            fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
            fs.renameSync(tempPath, this.persistPath);
        }
        catch (error) {
            console.error('Failed to save locks:', error);
        }
    }
    /**
     * Load locks from disk
     */
    loadLocks() {
        try {
            if (fs.existsSync(this.persistPath)) {
                const data = JSON.parse(fs.readFileSync(this.persistPath, 'utf-8'));
                // Reconstruct locks
                data.locks?.forEach((lockData) => {
                    const lock = {
                        taskId: lockData.taskId,
                        lockedBy: lockData.lockedBy,
                        lockedAt: new Date(lockData.lockedAt),
                        expiresAt: new Date(lockData.expiresAt),
                        lockToken: lockData.lockToken
                    };
                    // Only load non-expired locks
                    if (!this.isLockExpired(lock)) {
                        this.locks.set(lock.taskId, lock);
                    }
                });
            }
        }
        catch (error) {
            console.error('Failed to load locks:', error);
        }
    }
    /**
     * Save claims to file (for persistence)
     */
    saveClaimsToFile() {
        try {
            const claimsPath = path.join(path.dirname(this.persistPath), 'task-claims.json');
            const data = {
                claims: Array.from(this.claims.entries()).map(([_, claim]) => ({
                    ...claim,
                    claimedAt: claim.claimedAt.toISOString()
                })),
                version: '3.1.0'
            };
            fs.writeFileSync(claimsPath, JSON.stringify(data, null, 2));
        }
        catch (error) {
            console.error('Failed to save claims:', error);
        }
    }
    /**
     * Cleanup on shutdown
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        // Release all locks
        this.locks.clear();
        this.saveLocks();
    }
}
exports.TaskLockManager = TaskLockManager;
//# sourceMappingURL=task-lock-manager.js.map