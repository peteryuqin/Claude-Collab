/**
 * Claude-Collab v3.2.0 - Identity Manager
 * Implements persistent agent identity separate from roles and sessions
 * Enhanced with unique name enforcement and session cleanup (v3.2)
 */

import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Session } from './session-manager';
import { PerspectiveProfile } from '../diversity/types';

export interface AgentIdentity {
  // Unique, persistent agent ID (never changes)
  agentId: string;
  
  // Human-readable name chosen by the agent
  displayName: string;
  
  // When this agent first joined the system
  firstSeen: Date;
  
  // Last time this agent was active
  lastSeen: Date;
  
  // Current role (can change during session)
  currentRole: string;
  
  // History of all roles this agent has played
  roleHistory: RoleTransition[];
  
  // Current perspective (for diversity enforcement)
  currentPerspective?: PerspectiveProfile;
  
  // History of perspectives for tracking diversity
  perspectiveHistory: PerspectiveTransition[];
  
  // Statistics about this agent
  stats: AgentStats;
  
  // Current session ID (if connected)
  currentSessionId?: string;
  
  // Last activity time for session cleanup (v3.2)
  lastActivityTime?: Date;
  
  // Authentication token for reconnection
  authToken: string;
}

export interface RoleTransition {
  role: string;
  timestamp: Date;
  sessionId: string;
}

export interface PerspectiveTransition {
  perspective: PerspectiveProfile;
  timestamp: Date;
  reason?: string;
}

export interface AgentStats {
  totalSessions: number;
  totalMessages: number;
  totalTasks: number;
  totalEdits: number;
  diversityScore: number;
  agreementRate: number;
  evidenceRate: number;
}

export class IdentityManager {
  private identities: Map<string, AgentIdentity> = new Map();
  private tokenToAgent: Map<string, string> = new Map();
  private sessionToAgent: Map<string, string> = new Map();
  private nameToAgent: Map<string, string> = new Map(); // New: displayName -> agentId mapping
  private persistPath: string;

  constructor(workspacePath: string = '.claude-collab') {
    this.persistPath = path.join(workspacePath, 'identities.json');
    // Note: loadIdentities() is now async, call initialize() after construction
    this.loadIdentitiesSync();
  }
  
  /**
   * Initialize with async operations
   */
  async initialize(): Promise<void> {
    await this.loadIdentities();
  }
  
  /**
   * Synchronous fallback for constructor
   */
  private loadIdentitiesSync(): void {
    try {
      if (fs.existsSync(this.persistPath)) {
        const data = fs.readFileSync(this.persistPath, 'utf-8');
        this.parseIdentityData(data);
      }
    } catch (error) {
      console.error('Failed to load identities (sync):', error);
    }
  }
  
  /**
   * Synchronous save for backward compatibility with backup
   */
  private saveIdentitiesSync(): void {
    try {
      const data = {
        identities: Array.from(this.identities.values()),
        version: '3.2.0'
      };
      
      // Create backup if main file exists
      if (fs.existsSync(this.persistPath)) {
        const backupPath = this.persistPath + '.backup';
        try {
          fs.copyFileSync(this.persistPath, backupPath);
        } catch (error) {
          console.warn('Failed to create backup (sync):', error);
        }
      }
      
      // Write to temporary file first
      const tempPath = this.persistPath + '.tmp';
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
      
      // Validate the temporary file
      const tempData = fs.readFileSync(tempPath, 'utf-8');
      JSON.parse(tempData); // This will throw if invalid
      
      // Move temp file to main file
      fs.renameSync(tempPath, this.persistPath);
      
    } catch (error) {
      console.error('Failed to save identities (sync):', error);
      // Try to clean up temp file if it exists
      const tempPath = this.persistPath + '.tmp';
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch {}
      }
    }
  }

  /**
   * Register a new agent or retrieve existing one
   */
  registerAgent(displayName: string, role: string = 'general'): AgentIdentity {
    // This method should only be called for new agents in v3.2
    // Use getOrCreateAgent for the new behavior
    
    // For backward compatibility, still create new agent
    // but log a warning
    console.warn(`Warning: Creating new agent with name '${displayName}'. Multiple agents with same name detected.`);

    // Create new agent identity
    const agentId = this.generateAgentId();
    const authToken = this.generateAuthToken();
    
    const identity: AgentIdentity = {
      agentId,
      displayName,
      firstSeen: new Date(),
      lastSeen: new Date(),
      currentRole: role,
      roleHistory: [{
        role,
        timestamp: new Date(),
        sessionId: 'initial'
      }],
      perspectiveHistory: [],
      stats: {
        totalSessions: 0,
        totalMessages: 0,
        totalTasks: 0,
        totalEdits: 0,
        diversityScore: 0.5,
        agreementRate: 0.5,
        evidenceRate: 0.5
      },
      authToken
    };

    this.identities.set(agentId, identity);
    this.tokenToAgent.set(authToken, agentId);
    this.nameToAgent.set(displayName, agentId); // Track name -> agentId mapping
    this.saveIdentitiesSync(); // Use sync version for backward compatibility

    return identity;
  }

  /**
   * Authenticate an agent using their token
   */
  authenticateAgent(authToken: string): AgentIdentity | null {
    const agentId = this.tokenToAgent.get(authToken);
    if (!agentId) return null;
    
    const identity = this.identities.get(agentId);
    if (!identity) return null;
    
    // Update last seen
    identity.lastSeen = new Date();
    this.saveIdentities();
    
    return identity;
  }

  /**
   * Connect an agent to a session
   */
  connectAgentToSession(agentId: string, sessionId: string): void {
    const identity = this.identities.get(agentId);
    if (!identity) return;

    // Disconnect from previous session if any
    if (identity.currentSessionId) {
      this.sessionToAgent.delete(identity.currentSessionId);
    }

    // Connect to new session
    identity.currentSessionId = sessionId;
    identity.lastActivityTime = new Date(); // v3.2: Track activity
    identity.stats.totalSessions++;
    this.sessionToAgent.set(sessionId, agentId);
    
    this.saveIdentities();
  }

  /**
   * Disconnect an agent from their session
   */
  disconnectAgent(sessionId: string): void {
    const agentId = this.sessionToAgent.get(sessionId);
    if (!agentId) return;

    const identity = this.identities.get(agentId);
    if (identity) {
      identity.currentSessionId = undefined;
      this.saveIdentities();
    }

    this.sessionToAgent.delete(sessionId);
  }

  /**
   * Change an agent's role
   */
  changeAgentRole(agentId: string, newRole: string, sessionId: string): void {
    const identity = this.identities.get(agentId);
    if (!identity) return;

    // Record role transition
    identity.roleHistory.push({
      role: identity.currentRole,
      timestamp: new Date(),
      sessionId
    });

    identity.currentRole = newRole;
    this.saveIdentities();
  }

  /**
   * Change an agent's perspective (for diversity)
   */
  changeAgentPerspective(
    agentId: string, 
    newPerspective: PerspectiveProfile, 
    reason?: string
  ): void {
    const identity = this.identities.get(agentId);
    if (!identity) return;

    // Record perspective transition
    if (identity.currentPerspective) {
      identity.perspectiveHistory.push({
        perspective: identity.currentPerspective,
        timestamp: new Date(),
        reason
      });
    }

    identity.currentPerspective = newPerspective;
    this.saveIdentities();
  }

  /**
   * Get agent by session ID
   */
  getAgentBySessionId(sessionId: string): AgentIdentity | null {
    const agentId = this.sessionToAgent.get(sessionId);
    if (!agentId) return null;
    
    return this.identities.get(agentId) || null;
  }

  /**
   * Get agent by agent ID
   */
  getAgentById(agentId: string): AgentIdentity | null {
    return this.identities.get(agentId) || null;
  }


  /**
   * Update agent statistics
   */
  updateAgentStats(agentId: string, updates: Partial<AgentStats>): void {
    const identity = this.identities.get(agentId);
    if (!identity) return;

    identity.stats = {
      ...identity.stats,
      ...updates
    };

    this.saveIdentities();
  }

  /**
   * Get all active agents
   */
  getActiveAgents(): AgentIdentity[] {
    return Array.from(this.identities.values())
      .filter(agent => agent.currentSessionId !== undefined);
  }

  /**
   * Get agents by role
   */
  getAgentsByRole(role: string): AgentIdentity[] {
    return Array.from(this.identities.values())
      .filter(agent => agent.currentRole === role);
  }

  /**
   * Get agent history report
   */
  getAgentHistoryReport(agentId: string): string {
    const identity = this.identities.get(agentId);
    if (!identity) return 'Agent not found';

    const report = [
      `Agent: ${identity.displayName} (${identity.agentId})`,
      `First seen: ${identity.firstSeen.toISOString()}`,
      `Last seen: ${identity.lastSeen.toISOString()}`,
      `Current role: ${identity.currentRole}`,
      `Total sessions: ${identity.stats.totalSessions}`,
      ``,
      `Role History:`,
      ...identity.roleHistory.map(r => 
        `  - ${r.role} at ${r.timestamp.toISOString()}`
      ),
      ``,
      `Diversity Metrics:`,
      `  - Diversity score: ${identity.stats.diversityScore}`,
      `  - Agreement rate: ${identity.stats.agreementRate}`,
      `  - Evidence rate: ${identity.stats.evidenceRate}`
    ];

    return report.join('\n');
  }

  /**
   * Find agent by display name (v3.2)
   */
  findAgentByDisplayName(displayName: string): AgentIdentity | null {
    const agentId = this.nameToAgent.get(displayName);
    if (!agentId) return null;
    return this.identities.get(agentId) || null;
  }

  /**
   * Check if a display name is available (v3.2)
   */
  isNameAvailable(displayName: string): boolean {
    return !this.nameToAgent.has(displayName);
  }

  /**
   * Get or create agent with unique name enforcement (v3.2)
   */
  getOrCreateAgent(displayName: string, role: string = 'general', authToken?: string): AgentIdentity {
    // If auth token provided, try to authenticate first
    if (authToken) {
      const authenticated = this.authenticateAgent(authToken);
      if (authenticated) {
        return authenticated;
      }
    }

    // Check if name already exists
    const existing = this.findAgentByDisplayName(displayName);
    if (existing) {
      // Update last seen and return existing agent
      existing.lastSeen = new Date();
      this.saveIdentities();
      return existing;
    }

    // Create new agent with unique name
    return this.createNewAgent(displayName, role);
  }

  /**
   * Create new agent with unique name (v3.2)
   */
  createNewAgent(displayName: string, role: string): AgentIdentity {
    const agentId = this.generateAgentId();
    const authToken = this.generateAuthToken();
    
    const identity: AgentIdentity = {
      agentId,
      displayName,
      firstSeen: new Date(),
      lastSeen: new Date(),
      currentRole: role,
      roleHistory: [{
        role,
        timestamp: new Date(),
        sessionId: 'initial'
      }],
      perspectiveHistory: [],
      stats: {
        totalSessions: 0,
        totalMessages: 0,
        totalTasks: 0,
        totalEdits: 0,
        diversityScore: 0.5,
        agreementRate: 0.5,
        evidenceRate: 0.5
      },
      authToken
    };

    this.identities.set(agentId, identity);
    this.tokenToAgent.set(authToken, agentId);
    this.nameToAgent.set(displayName, agentId);
    this.saveIdentities();

    return identity;
  }

  /**
   * Get name suggestions when a name is taken (v3.2)
   */
  getNameSuggestions(baseName: string, count: number = 3): string[] {
    const suggestions: string[] = [];
    let counter = 2;
    
    // Try numbered suffixes
    while (suggestions.length < count && counter <= 10) {
      const suggestion = `${baseName}${counter}`;
      if (this.isNameAvailable(suggestion)) {
        suggestions.push(suggestion);
      }
      counter++;
    }
    
    // Try with underscores
    if (suggestions.length < count) {
      const suggestion = `${baseName}_new`;
      if (this.isNameAvailable(suggestion)) {
        suggestions.push(suggestion);
      }
    }
    
    // Try with role suffix
    if (suggestions.length < count) {
      const suggestion = `${baseName}_agent`;
      if (this.isNameAvailable(suggestion)) {
        suggestions.push(suggestion);
      }
    }
    
    return suggestions.slice(0, count);
  }

  /**
   * Update agent activity time (v3.2)
   */
  updateAgentActivity(agentId: string): void {
    const identity = this.identities.get(agentId);
    if (identity && identity.currentSessionId) {
      identity.lastActivityTime = new Date();
      this.saveIdentities();
    }
  }

  /**
   * Clean up inactive sessions (v3.2)
   */
  cleanupInactiveSessions(timeoutMs: number = 300000): number { // 5 minutes default
    let cleanedCount = 0;
    const cutoffTime = new Date(Date.now() - timeoutMs);
    
    for (const [agentId, identity] of this.identities) {
      if (identity.currentSessionId && 
          identity.lastActivityTime && 
          identity.lastActivityTime < cutoffTime) {
        
        console.log(`🧹 Cleaning up inactive session for ${identity.displayName} (${agentId})`);
        
        // Disconnect from session
        this.sessionToAgent.delete(identity.currentSessionId);
        identity.currentSessionId = undefined;
        identity.lastActivityTime = undefined;
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      this.saveIdentities();
      console.log(`✅ Cleaned up ${cleanedCount} inactive sessions`);
    }
    
    return cleanedCount;
  }

  /**
   * Get session activity report (v3.2)
   */
  getSessionActivityReport(): { active: number; inactive: number; total: number } {
    const activeAgents = this.getActiveAgents();
    const totalAgents = this.identities.size;
    
    return {
      active: activeAgents.length,
      inactive: totalAgents - activeAgents.length,
      total: totalAgents
    };
  }

  /**
   * Generate unique agent ID
   */
  private generateAgentId(): string {
    return `agent-${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Generate authentication token
   */
  private generateAuthToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Load identities from disk
   */
  private async loadIdentities(): Promise<void> {
    try {
      if (fs.existsSync(this.persistPath)) {
        const data = await fsPromises.readFile(this.persistPath, 'utf-8');
        this.parseIdentityData(data);
      }
    } catch (error) {
      console.error('Failed to load identities:', error);
    }
  }
  
  /**
   * Parse identity data from JSON string with validation and recovery
   */
  private parseIdentityData(data: string): void {
    try {
      // Try to parse JSON
      const parsed = JSON.parse(data);
      
      // Validate structure
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid identities file format');
      }
      
      // Ensure identities array exists
      if (!Array.isArray(parsed.identities)) {
        console.warn('Missing identities array, initializing empty');
        parsed.identities = [];
      }
      
      // Reconstruct maps with validation
      parsed.identities.forEach((identity: any, index: number) => {
        try {
          // Validate required fields
          if (!identity.agentId || !identity.displayName || !identity.authToken) {
            console.warn(`Skipping invalid identity at index ${index}: missing required fields`);
            return;
          }
          
          // Convert date strings back to Date objects with validation
          identity.firstSeen = this.parseDate(identity.firstSeen) || new Date();
          identity.lastSeen = this.parseDate(identity.lastSeen) || new Date();
          
          // Ensure arrays exist
          identity.roleHistory = identity.roleHistory || [];
          identity.perspectiveHistory = identity.perspectiveHistory || [];
          
          // Parse dates in history arrays
          identity.roleHistory.forEach((r: any) => {
            r.timestamp = this.parseDate(r.timestamp) || new Date();
          });
          identity.perspectiveHistory.forEach((p: any) => {
            p.timestamp = this.parseDate(p.timestamp) || new Date();
          });
          
          // Ensure stats exist with defaults
          identity.stats = identity.stats || {
            totalSessions: 0,
            totalMessages: 0,
            totalTasks: 0,
            totalEdits: 0,
            diversityScore: 0.5,
            agreementRate: 0.5,
            evidenceRate: 0.5
          };
          
          this.identities.set(identity.agentId, identity);
          this.tokenToAgent.set(identity.authToken, identity.agentId);
          this.nameToAgent.set(identity.displayName, identity.agentId);
          
          if (identity.currentSessionId) {
            this.sessionToAgent.set(identity.currentSessionId, identity.agentId);
          }
        } catch (error) {
          console.error(`Failed to parse identity at index ${index}:`, error);
        }
      });
      
      console.log(`Successfully loaded ${this.identities.size} identities`);
    } catch (error) {
      console.error('Failed to parse identities file:', error);
      // Try to recover from backup
      this.tryRecoverFromBackup();
    }
  }
  
  /**
   * Safely parse date string
   */
  private parseDate(dateStr: any): Date | null {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }
  
  /**
   * Try to recover from backup file
   */
  private tryRecoverFromBackup(): void {
    const backupPath = this.persistPath + '.backup';
    try {
      if (fs.existsSync(backupPath)) {
        console.log('Attempting to recover from backup...');
        const backupData = fs.readFileSync(backupPath, 'utf-8');
        const parsed = JSON.parse(backupData);
        
        // If backup is valid, restore it
        if (parsed && Array.isArray(parsed.identities)) {
          fs.copyFileSync(backupPath, this.persistPath);
          this.parseIdentityData(backupData);
          console.log('Successfully recovered from backup');
        }
      } else {
        console.log('No backup file found, starting with empty identities');
      }
    } catch (error) {
      console.error('Failed to recover from backup:', error);
      console.log('Starting with empty identities');
    }
  }

  /**
   * Save identities to disk with backup
   */
  private async saveIdentities(): Promise<void> {
    try {
      const data = {
        identities: Array.from(this.identities.values()),
        version: '3.2.0'
      };
      
      // Create backup if main file exists
      if (fs.existsSync(this.persistPath)) {
        const backupPath = this.persistPath + '.backup';
        try {
          await fsPromises.copyFile(this.persistPath, backupPath);
        } catch (error) {
          console.warn('Failed to create backup:', error);
        }
      }
      
      // Write to temporary file first
      const tempPath = this.persistPath + '.tmp';
      await fsPromises.writeFile(tempPath, JSON.stringify(data, null, 2));
      
      // Validate the temporary file
      const tempData = await fsPromises.readFile(tempPath, 'utf-8');
      JSON.parse(tempData); // This will throw if invalid
      
      // Move temp file to main file
      await fsPromises.rename(tempPath, this.persistPath);
      
    } catch (error) {
      console.error('Failed to save identities:', error);
      // Try to clean up temp file if it exists
      const tempPath = this.persistPath + '.tmp';
      if (fs.existsSync(tempPath)) {
        try {
          await fsPromises.unlink(tempPath);
        } catch {}
      }
    }
  }
}