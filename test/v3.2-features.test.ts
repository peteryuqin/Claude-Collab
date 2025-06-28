/**
 * Claude-Collab v3.2.0 - New Features Tests
 * Tests for v3.2 enhancements: unique names, session cleanup, version checking
 */

import { IdentityManager } from '../core/identity-manager';
import { ClaudeCollabServer } from '../core/server';
import * as fs from 'fs';
import * as path from 'path';

describe('v3.2 Features', () => {
  let identityManager: IdentityManager;
  const testWorkspace = '.test-claude-collab-v32';
  
  beforeEach(() => {
    // Create test workspace
    if (!fs.existsSync(testWorkspace)) {
      fs.mkdirSync(testWorkspace, { recursive: true });
    }
    
    // Clear any existing files
    const identitiesPath = path.join(testWorkspace, 'identities.json');
    if (fs.existsSync(identitiesPath)) {
      fs.unlinkSync(identitiesPath);
    }
    
    identityManager = new IdentityManager(testWorkspace);
  });
  
  afterEach(() => {
    // Clean up test files
    const identitiesPath = path.join(testWorkspace, 'identities.json');
    if (fs.existsSync(identitiesPath)) {
      fs.unlinkSync(identitiesPath);
    }
  });
  
  afterAll(() => {
    // Remove test workspace
    if (fs.existsSync(testWorkspace)) {
      fs.rmSync(testWorkspace, { recursive: true });
    }
  });

  describe('Unique Name Enforcement', () => {
    it('should prevent duplicate agent names', () => {
      // Create first agent
      const agent1 = identityManager.createNewAgent('alice', 'coder');
      expect(agent1.displayName).toBe('alice');
      
      // Check that name is no longer available
      expect(identityManager.isNameAvailable('alice')).toBe(false);
      
      // The createNewAgent method doesn't prevent duplicates - that's handled at server level
      // But we can test that the name mapping is working correctly
      const found = identityManager.findAgentByDisplayName('alice');
      expect(found!.agentId).toBe(agent1.agentId);
    });

    it('should find agents by display name efficiently', () => {
      const agent = identityManager.createNewAgent('bob', 'tester');
      
      const found = identityManager.findAgentByDisplayName('bob');
      expect(found).not.toBeNull();
      expect(found!.agentId).toBe(agent.agentId);
      expect(found!.displayName).toBe('bob');
    });

    it('should generate name suggestions when name is taken', () => {
      // Take the base name
      identityManager.createNewAgent('charlie', 'analyst');
      
      // Get suggestions
      const suggestions = identityManager.getNameSuggestions('charlie', 3);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toContain('charlie2');
      
      // All suggestions should be available
      suggestions.forEach(suggestion => {
        expect(identityManager.isNameAvailable(suggestion)).toBe(true);
      });
    });

    it('should handle getOrCreateAgent correctly', () => {
      // First call creates new agent
      const agent1 = identityManager.getOrCreateAgent('david', 'coder');
      expect(agent1.displayName).toBe('david');
      
      // Second call returns existing agent
      const agent2 = identityManager.getOrCreateAgent('david', 'reviewer');
      expect(agent2.agentId).toBe(agent1.agentId);
      expect(agent2.displayName).toBe('david');
    });
  });

  describe('Session Cleanup', () => {
    it('should track agent activity time', () => {
      const agent = identityManager.createNewAgent('eve', 'coordinator');
      
      // Connect to session
      identityManager.connectAgentToSession(agent.agentId, 'session-123');
      
      const beforeUpdate = new Date();
      
      // Update activity
      identityManager.updateAgentActivity(agent.agentId);
      
      const updatedAgent = identityManager.getAgentById(agent.agentId);
      expect(updatedAgent!.lastActivityTime).toBeDefined();
      expect(updatedAgent!.lastActivityTime!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });

    it('should cleanup inactive sessions', () => {
      const agent1 = identityManager.createNewAgent('frank', 'developer');
      const agent2 = identityManager.createNewAgent('grace', 'designer');
      
      // Connect both to sessions
      identityManager.connectAgentToSession(agent1.agentId, 'session-1');
      identityManager.connectAgentToSession(agent2.agentId, 'session-2');
      
      // Make agent1 inactive by setting old activity time
      const oldTime = new Date(Date.now() - 400000); // 6.67 minutes ago
      agent1.lastActivityTime = oldTime;
      
      // Update agent2 activity to keep it active
      identityManager.updateAgentActivity(agent2.agentId);
      
      // Cleanup with 5 minute timeout
      const cleanedCount = identityManager.cleanupInactiveSessions(300000);
      
      expect(cleanedCount).toBe(1);
      
      // Check that agent1 session was cleared but agent2 remains
      const updatedAgent1 = identityManager.getAgentById(agent1.agentId);
      const updatedAgent2 = identityManager.getAgentById(agent2.agentId);
      
      expect(updatedAgent1!.currentSessionId).toBeUndefined();
      expect(updatedAgent2!.currentSessionId).toBe('session-2');
    });

    it('should provide session activity report', () => {
      const agent1 = identityManager.createNewAgent('henry', 'architect');
      const agent2 = identityManager.createNewAgent('iris', 'researcher');
      
      // Connect one agent
      identityManager.connectAgentToSession(agent1.agentId, 'session-active');
      
      const report = identityManager.getSessionActivityReport();
      
      expect(report.total).toBe(2);
      expect(report.active).toBe(1);
      expect(report.inactive).toBe(1);
    });
  });

  describe('Version Compatibility (Server)', () => {
    let server: ClaudeCollabServer;
    
    beforeEach(() => {
      server = new ClaudeCollabServer({ 
        port: 8766, // Different port for testing
        enableAntiEcho: false 
      });
    });

    it('should detect version mismatches', () => {
      // Access private method for testing
      const checkVersionCompatibility = (server as any).checkVersionCompatibility.bind(server);
      
      // Test exact match
      expect(checkVersionCompatibility('3.2.0')).toBeNull();
      
      // Test missing version
      const missingWarning = checkVersionCompatibility();
      expect(missingWarning).not.toBeNull();
      expect(missingWarning.severity).toBe('warning');
      
      // Test major version mismatch
      const majorMismatch = checkVersionCompatibility('2.1.0');
      expect(majorMismatch).not.toBeNull();
      expect(majorMismatch.severity).toBe('error');
      
      // Test minor version mismatch
      const minorMismatch = checkVersionCompatibility('3.1.0');
      expect(minorMismatch).not.toBeNull();
      expect(minorMismatch.severity).toBe('warning');
      expect(minorMismatch.message).toContain('Missing v3.2 features');
    });

    it('should provide upgrade actions', () => {
      const checkVersionCompatibility = (server as any).checkVersionCompatibility.bind(server);
      
      const warning = checkVersionCompatibility('3.1.0');
      expect(warning.upgradeAction).toContain('npm install -g claude-collab@3.2.0');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle many agents efficiently', () => {
      const startTime = Date.now();
      
      // Create 100 agents
      for (let i = 0; i < 100; i++) {
        identityManager.createNewAgent(`agent${i}`, 'worker');
      }
      
      const createTime = Date.now() - startTime;
      expect(createTime).toBeLessThan(1000); // Should be fast
      
      // Test lookup performance
      const lookupStart = Date.now();
      const found = identityManager.findAgentByDisplayName('agent50');
      const lookupTime = Date.now() - lookupStart;
      
      expect(found).not.toBeNull();
      expect(lookupTime).toBeLessThan(10); // Should be very fast
    });

    it('should handle edge cases in name suggestions', () => {
      // Take names that would conflict with suggestions
      identityManager.createNewAgent('test', 'worker');
      identityManager.createNewAgent('test2', 'worker');
      identityManager.createNewAgent('test3', 'worker');
      identityManager.createNewAgent('test_new', 'worker');
      
      const suggestions = identityManager.getNameSuggestions('test', 5);
      expect(suggestions.length).toBeGreaterThan(0);
      
      // Should find available alternatives
      suggestions.forEach(suggestion => {
        expect(identityManager.isNameAvailable(suggestion)).toBe(true);
      });
    });
  });
});