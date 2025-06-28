/**
 * Claude-Collab v3.1.0 - Enhanced Session Manager Tests
 * Tests for session management with identity integration
 */

import { EnhancedSessionManager } from '../core/session-manager-enhanced';
import { IdentityManager } from '../core/identity-manager';
import { WebSocket } from 'ws';
import * as fs from 'fs';
import * as path from 'path';

// Mock WebSocket
jest.mock('ws');

describe('EnhancedSessionManager', () => {
  let sessionManager: EnhancedSessionManager;
  let identityManager: IdentityManager;
  let mockWs: jest.Mocked<WebSocket>;
  const testWorkspace = '.test-claude-collab';
  
  beforeEach(() => {
    // Create test workspace
    if (!fs.existsSync(testWorkspace)) {
      fs.mkdirSync(testWorkspace, { recursive: true });
    }
    
    // Clear any existing identity files
    const identitiesPath = path.join(testWorkspace, 'identities.json');
    if (fs.existsSync(identitiesPath)) {
      fs.unlinkSync(identitiesPath);
    }
    
    // Set up managers
    identityManager = new IdentityManager(testWorkspace);
    sessionManager = new EnhancedSessionManager(identityManager);
    
    // Create mock WebSocket
    mockWs = new WebSocket('ws://localhost') as jest.Mocked<WebSocket>;
    mockWs.send = jest.fn();
    mockWs.close = jest.fn();
  });
  
  afterEach(() => {
    // Clean up
    jest.clearAllMocks();
  });
  
  afterAll(() => {
    // Remove test workspace
    if (fs.existsSync(testWorkspace)) {
      fs.rmSync(testWorkspace, { recursive: true });
    }
  });
  
  describe('createSession', () => {
    it('should create session with new agent', () => {
      const session = sessionManager.createSession(
        'session-123',
        mockWs,
        undefined,
        'alice',
        'coder'
      );
      
      expect(session.id).toBe('session-123');
      expect(session.agentIdentity.displayName).toBe('alice');
      expect(session.currentRole).toBe('coder');
      expect(session.status).toBe('active');
    });
    
    it('should authenticate with existing token', () => {
      // First create an agent
      const agent = identityManager.registerAgent('alice', 'coder');
      
      // Create session with token
      const session = sessionManager.createSession(
        'session-456',
        mockWs,
        agent.authToken,
        undefined,
        'reviewer'
      );
      
      expect(session.agentId).toBe(agent.agentId);
      expect(session.agentIdentity.displayName).toBe('alice');
      expect(session.currentRole).toBe('reviewer');
    });
    
    it('should throw error for invalid token', () => {
      expect(() => {
        sessionManager.createSession(
          'session-789',
          mockWs,
          'invalid-token'
        );
      }).toThrow('Invalid authentication token');
    });
    
    it('should require either token or displayName', () => {
      expect(() => {
        sessionManager.createSession('session-000', mockWs);
      }).toThrow('Either authToken or displayName must be provided');
    });
  });
  
  describe('changeSessionRole', () => {
    it('should change role and update identity', () => {
      const session = sessionManager.createSession(
        'session-123',
        mockWs,
        undefined,
        'alice',
        'coder'
      );
      
      sessionManager.changeSessionRole('session-123', 'architect');
      
      const updatedSession = sessionManager.getSession('session-123');
      expect(updatedSession?.currentRole).toBe('architect');
      
      const agent = identityManager.getAgentById(session.agentId);
      expect(agent?.currentRole).toBe('architect');
      expect(agent?.roleHistory.length).toBeGreaterThan(1);
    });
  });
  
  describe('changeSessionPerspective', () => {
    it('should change perspective with reason', () => {
      const session = sessionManager.createSession(
        'session-123',
        mockWs,
        undefined,
        'alice',
        'coder'
      );
      
      sessionManager.changeSessionPerspective(
        'session-123',
        'SKEPTIC' as any,
        'Diversity requirement'
      );
      
      const updatedSession = sessionManager.getSession('session-123');
      expect(updatedSession?.currentPerspective).toBe('SKEPTIC');
    });
  });
  
  describe('removeSession', () => {
    it('should update stats before removing', () => {
      const session = sessionManager.createSession(
        'session-123',
        mockWs,
        undefined,
        'alice',
        'coder'
      );
      
      // Simulate activity
      sessionManager.incrementSessionMetric('session-123', 'messages');
      sessionManager.incrementSessionMetric('session-123', 'messages');
      sessionManager.incrementSessionMetric('session-123', 'edits');
      sessionManager.incrementSessionMetric('session-123', 'tasks');
      
      sessionManager.removeSession('session-123');
      
      const agent = identityManager.getAgentById(session.agentId);
      expect(agent?.stats.totalMessages).toBe(2);
      expect(agent?.stats.totalEdits).toBe(1);
      expect(agent?.stats.totalTasks).toBe(1);
    });
  });
  
  describe('getUniqueActiveAgents', () => {
    it('should return unique agents even with multiple sessions', () => {
      // Create agent
      const agent = identityManager.registerAgent('alice', 'coder');
      
      // Create two sessions for same agent
      sessionManager.createSession(
        'session-1',
        mockWs,
        agent.authToken
      );
      
      sessionManager.createSession(
        'session-2',
        mockWs,
        agent.authToken
      );
      
      const activeAgents = sessionManager.getUniqueActiveAgents();
      expect(activeAgents).toHaveLength(1);
      expect(activeAgents[0].displayName).toBe('alice');
    });
  });
  
  describe('isAgentConnected', () => {
    it('should check if agent is connected', () => {
      sessionManager.createSession(
        'session-123',
        mockWs,
        undefined,
        'alice',
        'coder'
      );
      
      expect(sessionManager.isAgentConnected('alice')).toBe(true);
      expect(sessionManager.isAgentConnected('bob')).toBe(false);
    });
  });
  
  describe('getSessionAuthToken', () => {
    it('should return auth token for session', () => {
      const session = sessionManager.createSession(
        'session-123',
        mockWs,
        undefined,
        'alice',
        'coder'
      );
      
      const token = sessionManager.getSessionAuthToken('session-123');
      expect(token).toBe(session.agentIdentity.authToken);
    });
    
    it('should return null for non-existent session', () => {
      const token = sessionManager.getSessionAuthToken('invalid-session');
      expect(token).toBeNull();
    });
  });
  
  describe('metrics tracking', () => {
    it('should track session metrics separately', () => {
      const session = sessionManager.createSession(
        'session-123',
        mockWs,
        undefined,
        'alice',
        'coder'
      );
      
      sessionManager.incrementSessionMetric('session-123', 'edits');
      sessionManager.incrementSessionMetric('session-123', 'edits');
      sessionManager.incrementSessionMetric('session-123', 'messages');
      
      const updatedSession = sessionManager.getSession('session-123');
      expect(updatedSession?.sessionEdits).toBe(2);
      expect(updatedSession?.sessionMessages).toBe(1);
      expect(updatedSession?.sessionTasks).toBe(0);
    });
  });
});