/**
 * Claude-Collab v3.1.0 - Task Lock Manager Tests
 * Tests for atomic task locking to prevent race conditions
 */

import { TaskLockManager } from '../orchestration/task-lock-manager';
import * as fs from 'fs';
import * as path from 'path';

describe('TaskLockManager', () => {
  let lockManager: TaskLockManager;
  const testWorkspace = '.test-claude-collab';
  
  beforeEach(() => {
    // Create test workspace
    if (!fs.existsSync(testWorkspace)) {
      fs.mkdirSync(testWorkspace, { recursive: true });
    }
    
    // Clear existing lock files
    const lockPath = path.join(testWorkspace, 'task-locks.json');
    const claimsPath = path.join(testWorkspace, 'task-claims.json');
    if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
    if (fs.existsSync(claimsPath)) fs.unlinkSync(claimsPath);
    
    lockManager = new TaskLockManager(testWorkspace);
  });
  
  afterEach(() => {
    // Clean up
    lockManager.destroy();
    
    // Remove lock files
    const lockPath = path.join(testWorkspace, 'task-locks.json');
    const claimsPath = path.join(testWorkspace, 'task-claims.json');
    if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
    if (fs.existsSync(claimsPath)) fs.unlinkSync(claimsPath);
  });
  
  afterAll(() => {
    // Remove test workspace
    if (fs.existsSync(testWorkspace)) {
      fs.rmSync(testWorkspace, { recursive: true });
    }
  });
  
  describe('acquireLock', () => {
    it('should acquire lock for available task', () => {
      const lockToken = lockManager.acquireLock('task-1', 'agent-1');
      
      expect(lockToken).not.toBeNull();
      expect(lockToken).toMatch(/^lock-\d+-[a-z0-9]{9}$/);
    });
    
    it('should prevent other agents from acquiring same lock', () => {
      const token1 = lockManager.acquireLock('task-1', 'agent-1');
      const token2 = lockManager.acquireLock('task-1', 'agent-2');
      
      expect(token1).not.toBeNull();
      expect(token2).toBeNull();
    });
    
    it('should allow same agent to refresh lock', () => {
      const token1 = lockManager.acquireLock('task-1', 'agent-1');
      const token2 = lockManager.acquireLock('task-1', 'agent-1');
      
      expect(token1).not.toBeNull();
      expect(token2).not.toBeNull();
      expect(token2).toBe(token1); // Same token returned
    });
    
    it('should emit lock-acquired event', (done) => {
      lockManager.on('lock-acquired', (data) => {
        expect(data.taskId).toBe('task-1');
        expect(data.agentId).toBe('agent-1');
        expect(data.lockToken).toBeDefined();
        done();
      });
      
      lockManager.acquireLock('task-1', 'agent-1');
    });
  });
  
  describe('releaseLock', () => {
    it('should release lock with valid token', () => {
      const token = lockManager.acquireLock('task-1', 'agent-1')!;
      const released = lockManager.releaseLock('task-1', token);
      
      expect(released).toBe(true);
      
      // Another agent should now be able to acquire
      const token2 = lockManager.acquireLock('task-1', 'agent-2');
      expect(token2).not.toBeNull();
    });
    
    it('should not release lock with invalid token', () => {
      const token = lockManager.acquireLock('task-1', 'agent-1')!;
      const released = lockManager.releaseLock('task-1', 'invalid-token');
      
      expect(released).toBe(false);
      
      // Lock should still be held
      const token2 = lockManager.acquireLock('task-1', 'agent-2');
      expect(token2).toBeNull();
    });
    
    it('should emit lock-released event', (done) => {
      const token = lockManager.acquireLock('task-1', 'agent-1')!;
      
      lockManager.on('lock-released', (data) => {
        expect(data.taskId).toBe('task-1');
        expect(data.releasedBy).toBe('agent-1');
        done();
      });
      
      lockManager.releaseLock('task-1', token);
    });
  });
  
  describe('claimTask', () => {
    it('should claim task with valid lock', () => {
      const token = lockManager.acquireLock('task-1', 'agent-1')!;
      const claimed = lockManager.claimTask('task-1', 'agent-1', token);
      
      expect(claimed).toBe(true);
      expect(lockManager.getTaskOwner('task-1')).toBe('agent-1');
    });
    
    it('should not claim task without lock', () => {
      const claimed = lockManager.claimTask('task-1', 'agent-1', 'fake-token');
      
      expect(claimed).toBe(false);
      expect(lockManager.getTaskOwner('task-1')).toBeNull();
    });
    
    it('should release lock after successful claim', () => {
      const token = lockManager.acquireLock('task-1', 'agent-1')!;
      lockManager.claimTask('task-1', 'agent-1', token);
      
      // Lock should be released, so another agent can acquire
      const token2 = lockManager.acquireLock('task-1', 'agent-2');
      expect(token2).not.toBeNull();
      
      // But task is already claimed
      expect(lockManager.isTaskAvailable('task-1')).toBe(false);
    });
    
    it('should prevent claiming already claimed task', () => {
      const token1 = lockManager.acquireLock('task-1', 'agent-1')!;
      lockManager.claimTask('task-1', 'agent-1', token1);
      
      // Even with a lock, can't claim again
      const token2 = lockManager.acquireLock('task-1', 'agent-2')!;
      const claimed = lockManager.claimTask('task-1', 'agent-2', token2);
      
      expect(claimed).toBe(false);
      expect(lockManager.getTaskOwner('task-1')).toBe('agent-1');
    });
  });
  
  describe('isTaskAvailable', () => {
    it('should return true for unclaimed unlocked task', () => {
      expect(lockManager.isTaskAvailable('task-1')).toBe(true);
    });
    
    it('should return false for locked task', () => {
      lockManager.acquireLock('task-1', 'agent-1');
      expect(lockManager.isTaskAvailable('task-1')).toBe(false);
    });
    
    it('should return false for claimed task', () => {
      const token = lockManager.acquireLock('task-1', 'agent-1')!;
      lockManager.claimTask('task-1', 'agent-1', token);
      
      expect(lockManager.isTaskAvailable('task-1')).toBe(false);
    });
    
    it('should return true for completed task', () => {
      const token = lockManager.acquireLock('task-1', 'agent-1')!;
      lockManager.claimTask('task-1', 'agent-1', token);
      lockManager.updateTaskStatus('task-1', 'agent-1', 'completed');
      
      expect(lockManager.isTaskAvailable('task-1')).toBe(true);
    });
  });
  
  describe.skip('lock expiration', () => {
    it('should expire locks after timeout', async () => {
      jest.useFakeTimers();
      
      try {
        const token = lockManager.acquireLock('task-1', 'agent-1');
        expect(token).not.toBeNull();
        
        // Lock should exist
        expect(lockManager.getLockStatus('task-1').isLocked).toBe(true);
        
        // Fast forward past expiration (5 seconds)
        jest.advanceTimersByTime(6000);
        
        // Run all pending timers
        jest.runAllTimers();
        
        // Wait for next tick
        await new Promise(setImmediate);
        
        expect(lockManager.getLockStatus('task-1').isLocked).toBe(false);
      } finally {
        jest.useRealTimers();
      }
    });
    
    it('should emit lock-expired event', async () => {
      jest.useFakeTimers();
      
      try {
        const expiredPromise = new Promise<void>((resolve) => {
          lockManager.once('lock-expired', () => resolve());
        });
        
        
        // Fast forward past expiration
        jest.advanceTimersByTime(6000);
        jest.runAllTimers();
        
        // Wait for the event
        await expiredPromise;
        
      } finally {
        jest.useRealTimers();
      }
    });
  });
  
  describe('getLockStatus', () => {
    it('should return lock details', () => {
      lockManager.acquireLock('task-1', 'agent-1');
      
      const status = lockManager.getLockStatus('task-1');
      expect(status.isLocked).toBe(true);
      expect(status.lockedBy).toBe('agent-1');
      expect(status.expiresIn).toBeGreaterThan(4000);
      expect(status.expiresIn).toBeLessThanOrEqual(5000);
    });
    
    it('should return unlocked status for available task', () => {
      const status = lockManager.getLockStatus('task-1');
      expect(status.isLocked).toBe(false);
      expect(status.lockedBy).toBeUndefined();
      expect(status.expiresIn).toBeUndefined();
    });
  });
  
  describe('getAgentTasks', () => {
    it('should return all tasks claimed by agent', () => {
      // Claim multiple tasks
      const token1 = lockManager.acquireLock('task-1', 'agent-1')!;
      lockManager.claimTask('task-1', 'agent-1', token1);
      
      const token2 = lockManager.acquireLock('task-2', 'agent-1')!;
      lockManager.claimTask('task-2', 'agent-1', token2);
      
      const token3 = lockManager.acquireLock('task-3', 'agent-2')!;
      lockManager.claimTask('task-3', 'agent-2', token3);
      
      const agent1Tasks = lockManager.getAgentTasks('agent-1');
      expect(agent1Tasks).toHaveLength(2);
      expect(agent1Tasks.map(t => t.taskId)).toContain('task-1');
      expect(agent1Tasks.map(t => t.taskId)).toContain('task-2');
      
      const agent2Tasks = lockManager.getAgentTasks('agent-2');
      expect(agent2Tasks).toHaveLength(1);
      expect(agent2Tasks[0].taskId).toBe('task-3');
    });
  });
  
  describe('updateTaskStatus', () => {
    it('should update task status', () => {
      const token = lockManager.acquireLock('task-1', 'agent-1')!;
      lockManager.claimTask('task-1', 'agent-1', token);
      
      const updated = lockManager.updateTaskStatus('task-1', 'agent-1', 'in_progress');
      expect(updated).toBe(true);
      
      const tasks = lockManager.getAgentTasks('agent-1');
      expect(tasks[0].status).toBe('in_progress');
    });
    
    it('should not update task owned by another agent', () => {
      const token = lockManager.acquireLock('task-1', 'agent-1')!;
      lockManager.claimTask('task-1', 'agent-1', token);
      
      const updated = lockManager.updateTaskStatus('task-1', 'agent-2', 'in_progress');
      expect(updated).toBe(false);
    });
  });
});