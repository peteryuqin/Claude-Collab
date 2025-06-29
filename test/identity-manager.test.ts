/**
 * Claude-Collab v3.1.0 - Identity Manager Tests
 * Tests for persistent identity system
 */

import { IdentityManager, AgentIdentity } from '../core/identity-manager';
import * as fs from 'fs';
import * as path from 'path';

describe('IdentityManager', () => {
  let identityManager: IdentityManager;
  const testWorkspace = '.test-claude-collab';
  
  beforeEach(() => {
    // Create test workspace with proper permissions
    if (!fs.existsSync(testWorkspace)) {
      fs.mkdirSync(testWorkspace, { recursive: true });
    }
    
    // Ensure the directory is writable and clear any existing identities
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
  
  describe('registerAgent', () => {
    it('should create a new agent with unique ID', () => {
      const agent = identityManager.registerAgent('alice', 'coder');
      
      expect(agent.displayName).toBe('alice');
      expect(agent.currentRole).toBe('coder');
      expect(agent.agentId).toMatch(/^agent-[a-f0-9]{16}$/);
      expect(agent.authToken).toBeDefined();
      expect(agent.firstSeen).toBeInstanceOf(Date);
    });
    
    it('should create new agent even if display name exists (v3.2 behavior change)', () => {
      const agent1 = identityManager.registerAgent('alice', 'coder');
      const agent2 = identityManager.registerAgent('alice', 'reviewer');
      
      // In v3.2, registerAgent always creates new agents (with warning)
      // Duplicate prevention is handled at server level
      expect(agent1.agentId).not.toBe(agent2.agentId);
      expect(agent1.authToken).not.toBe(agent2.authToken);
      expect(agent1.displayName).toBe('alice');
      expect(agent2.displayName).toBe('alice');
    });
    
    it('should initialize with default stats', () => {
      const agent = identityManager.registerAgent('bob', 'tester');
      
      expect(agent.stats.totalSessions).toBe(0);
      expect(agent.stats.totalMessages).toBe(0);
      expect(agent.stats.totalTasks).toBe(0);
      expect(agent.stats.totalEdits).toBe(0);
      expect(agent.stats.diversityScore).toBe(0.5);
    });
  });
  
  describe('authenticateAgent', () => {
    it('should authenticate with valid token', () => {
      const agent = identityManager.registerAgent('alice', 'coder');
      const authenticated = identityManager.authenticateAgent(agent.authToken);
      
      expect(authenticated).not.toBeNull();
      expect(authenticated?.agentId).toBe(agent.agentId);
      expect(authenticated?.displayName).toBe('alice');
    });
    
    it('should return null for invalid token', () => {
      const authenticated = identityManager.authenticateAgent('invalid-token');
      expect(authenticated).toBeNull();
    });
    
    it('should update last seen on authentication', async () => {
      const agent = identityManager.registerAgent('alice', 'coder');
      const beforeAuth = new Date(agent.lastSeen);
      
      // Wait a bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const authenticated = identityManager.authenticateAgent(agent.authToken);
      expect(authenticated).not.toBeNull();
      expect(authenticated!.lastSeen.getTime()).toBeGreaterThan(beforeAuth.getTime());
    });
  });
  
  describe('connectAgentToSession', () => {
    it('should connect agent to session', () => {
      const agent = identityManager.registerAgent('alice', 'coder');
      const sessionId = 'session-123';
      
      identityManager.connectAgentToSession(agent.agentId, sessionId);
      
      const updatedAgent = identityManager.getAgentById(agent.agentId);
      expect(updatedAgent?.currentSessionId).toBe(sessionId);
      expect(updatedAgent?.stats.totalSessions).toBe(1);
    });
    
    it('should disconnect from previous session', () => {
      const agent = identityManager.registerAgent('alice', 'coder');
      
      identityManager.connectAgentToSession(agent.agentId, 'session-1');
      identityManager.connectAgentToSession(agent.agentId, 'session-2');
      
      const updatedAgent = identityManager.getAgentById(agent.agentId);
      expect(updatedAgent?.currentSessionId).toBe('session-2');
      expect(updatedAgent?.stats.totalSessions).toBe(2);
    });
  });
  
  describe('changeAgentRole', () => {
    it('should change role and record history', () => {
      const agent = identityManager.registerAgent('alice', 'coder');
      const sessionId = 'session-123';
      
      identityManager.connectAgentToSession(agent.agentId, sessionId);
      identityManager.changeAgentRole(agent.agentId, 'reviewer', sessionId);
      
      const updatedAgent = identityManager.getAgentById(agent.agentId);
      expect(updatedAgent?.currentRole).toBe('reviewer');
      expect(updatedAgent?.roleHistory).toHaveLength(2); // initial + change
      expect(updatedAgent?.roleHistory[1].role).toBe('coder');
    });
  });
  
  describe('changeAgentPerspective', () => {
    it('should change perspective and record history', () => {
      const agent = identityManager.registerAgent('alice', 'coder');
      
      identityManager.changeAgentPerspective(agent.agentId, 'OPTIMIST' as any);
      identityManager.changeAgentPerspective(agent.agentId, 'SKEPTIC' as any, 'Diversity enforcement');
      
      const updatedAgent = identityManager.getAgentById(agent.agentId);
      expect(updatedAgent?.currentPerspective).toBe('SKEPTIC');
      expect(updatedAgent?.perspectiveHistory).toHaveLength(1);
      expect(updatedAgent?.perspectiveHistory[0].reason).toBe('Diversity enforcement');
    });
  });
  
  describe('updateAgentStats', () => {
    it('should update agent statistics', () => {
      const agent = identityManager.registerAgent('alice', 'coder');
      
      identityManager.updateAgentStats(agent.agentId, {
        totalMessages: 10,
        totalTasks: 5,
        totalEdits: 15,
        diversityScore: 0.75
      });
      
      const updatedAgent = identityManager.getAgentById(agent.agentId);
      expect(updatedAgent?.stats.totalMessages).toBe(10);
      expect(updatedAgent?.stats.totalTasks).toBe(5);
      expect(updatedAgent?.stats.totalEdits).toBe(15);
      expect(updatedAgent?.stats.diversityScore).toBe(0.75);
    });
  });
  
  describe('getActiveAgents', () => {
    it('should return only agents with active sessions', () => {
      const agent1 = identityManager.registerAgent('alice', 'coder');
      const agent2 = identityManager.registerAgent('bob', 'reviewer');
      const agent3 = identityManager.registerAgent('charlie', 'tester');
      
      identityManager.connectAgentToSession(agent1.agentId, 'session-1');
      identityManager.connectAgentToSession(agent2.agentId, 'session-2');
      // agent3 not connected
      
      const activeAgents = identityManager.getActiveAgents();
      expect(activeAgents).toHaveLength(2);
      expect(activeAgents.map(a => a.displayName)).toContain('alice');
      expect(activeAgents.map(a => a.displayName)).toContain('bob');
    });
  });
  
  describe('persistence', () => {
    it('should save and load identities from disk', () => {
      const manager1 = new IdentityManager(testWorkspace);
      const agent = manager1.registerAgent('alice', 'coder');
      
      // Create new manager instance (simulates restart)
      const manager2 = new IdentityManager(testWorkspace);
      const loadedAgent = manager2.getAgentById(agent.agentId);
      
      expect(loadedAgent).not.toBeNull();
      expect(loadedAgent?.displayName).toBe('alice');
      expect(loadedAgent?.authToken).toBe(agent.authToken);
    });
  });
});