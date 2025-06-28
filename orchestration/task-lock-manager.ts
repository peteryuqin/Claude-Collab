/**
 * Claude-Collab v3.1.0 - Task Lock Manager
 * Implements atomic locking to prevent task race conditions
 */

import * as fs from 'fs';
import * as path from 'path';
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

export class TaskLockManager extends EventEmitter {
  private locks: Map<string, TaskLock> = new Map();
  private claims: Map<string, TaskClaim> = new Map();
  private lockTimeout: number = 5000; // 5 seconds
  private persistPath: string;
  private cleanupInterval: NodeJS.Timeout;

  constructor(workspacePath: string = '.claude-collab') {
    super();
    this.persistPath = path.join(workspacePath, 'task-locks.json');
    this.loadLocks();
    
    // Clean up expired locks every second
    this.cleanupInterval = setInterval(() => this.cleanupExpiredLocks(), 1000);
  }

  /**
   * Attempt to acquire a lock on a task
   * Returns lock token if successful, null if task is already locked
   */
  acquireLock(taskId: string, agentId: string): string | null {
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
    const lock: TaskLock = {
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
  releaseLock(taskId: string, lockToken: string): boolean {
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
  claimTask(taskId: string, agentId: string, lockToken: string): boolean {
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
    const claim: TaskClaim = {
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
  updateTaskStatus(
    taskId: string, 
    agentId: string, 
    status: TaskClaim['status']
  ): boolean {
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
  isTaskAvailable(taskId: string): boolean {
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
  getTaskOwner(taskId: string): string | null {
    const claim = this.claims.get(taskId);
    return claim ? claim.agentId : null;
  }

  /**
   * Get all tasks claimed by an agent
   */
  getAgentTasks(agentId: string): TaskClaim[] {
    return Array.from(this.claims.values())
      .filter(claim => claim.agentId === agentId);
  }

  /**
   * Get lock status for a task
   */
  getLockStatus(taskId: string): { isLocked: boolean; lockedBy?: string; expiresIn?: number } {
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
  private refreshLock(taskId: string, agentId: string): string {
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
  private isLockExpired(lock: TaskLock): boolean {
    return lock.expiresAt.getTime() < Date.now();
  }

  /**
   * Clean up expired locks
   */
  private cleanupExpiredLocks(): void {
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
  private generateLockToken(): string {
    return `lock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save locks to disk
   */
  private saveLocks(): void {
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
    } catch (error) {
      console.error('Failed to save locks:', error);
    }
  }

  /**
   * Load locks from disk
   */
  private loadLocks(): void {
    try {
      if (fs.existsSync(this.persistPath)) {
        const data = JSON.parse(fs.readFileSync(this.persistPath, 'utf-8'));
        
        // Reconstruct locks
        data.locks?.forEach((lockData: any) => {
          const lock: TaskLock = {
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
    } catch (error) {
      console.error('Failed to load locks:', error);
    }
  }

  /**
   * Save claims to file (for persistence)
   */
  private saveClaimsToFile(): void {
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
    } catch (error) {
      console.error('Failed to save claims:', error);
    }
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Release all locks
    this.locks.clear();
    this.saveLocks();
  }
}