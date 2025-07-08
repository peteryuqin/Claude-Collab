/**
 * Claude-Collab v3.2.0 - Identity Manager
 * Implements persistent agent identity separate from roles and sessions
 * Enhanced with unique name enforcement and session cleanup (v3.2)
 */
import { PerspectiveProfile } from '../diversity/types';
export interface AgentIdentity {
    agentId: string;
    displayName: string;
    firstSeen: Date;
    lastSeen: Date;
    currentRole: string;
    roleHistory: RoleTransition[];
    currentPerspective?: PerspectiveProfile;
    perspectiveHistory: PerspectiveTransition[];
    stats: AgentStats;
    currentSessionId?: string;
    lastActivityTime?: Date;
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
export declare class IdentityManager {
    private identities;
    private tokenToAgent;
    private sessionToAgent;
    private nameToAgent;
    private persistPath;
    constructor(workspacePath?: string);
    /**
     * Initialize with async operations
     */
    initialize(): Promise<void>;
    /**
     * Synchronous fallback for constructor
     */
    private loadIdentitiesSync;
    /**
     * Synchronous save for backward compatibility with backup
     */
    private saveIdentitiesSync;
    /**
     * Register a new agent or retrieve existing one
     */
    registerAgent(displayName: string, role?: string): AgentIdentity;
    /**
     * Authenticate an agent using their token
     */
    authenticateAgent(authToken: string): AgentIdentity | null;
    /**
     * Connect an agent to a session
     */
    connectAgentToSession(agentId: string, sessionId: string): void;
    /**
     * Disconnect an agent from their session
     */
    disconnectAgent(sessionId: string): void;
    /**
     * Change an agent's role
     */
    changeAgentRole(agentId: string, newRole: string, sessionId: string): void;
    /**
     * Change an agent's perspective (for diversity)
     */
    changeAgentPerspective(agentId: string, newPerspective: PerspectiveProfile, reason?: string): void;
    /**
     * Get agent by session ID
     */
    getAgentBySessionId(sessionId: string): AgentIdentity | null;
    /**
     * Get agent by agent ID
     */
    getAgentById(agentId: string): AgentIdentity | null;
    /**
     * Update agent statistics
     */
    updateAgentStats(agentId: string, updates: Partial<AgentStats>): void;
    /**
     * Get all active agents
     */
    getActiveAgents(): AgentIdentity[];
    /**
     * Get agents by role
     */
    getAgentsByRole(role: string): AgentIdentity[];
    /**
     * Get agent history report
     */
    getAgentHistoryReport(agentId: string): string;
    /**
     * Find agent by display name (v3.2)
     */
    findAgentByDisplayName(displayName: string): AgentIdentity | null;
    /**
     * Check if a display name is available (v3.2)
     */
    isNameAvailable(displayName: string): boolean;
    /**
     * Get or create agent with unique name enforcement (v3.2)
     */
    getOrCreateAgent(displayName: string, role?: string, authToken?: string): AgentIdentity;
    /**
     * Create new agent with unique name (v3.2)
     */
    createNewAgent(displayName: string, role: string): AgentIdentity;
    /**
     * Get name suggestions when a name is taken (v3.2)
     */
    getNameSuggestions(baseName: string, count?: number): string[];
    /**
     * Update agent activity time (v3.2)
     */
    updateAgentActivity(agentId: string): void;
    /**
     * Clean up inactive sessions (v3.2)
     */
    cleanupInactiveSessions(timeoutMs?: number): number;
    /**
     * Get session activity report (v3.2)
     */
    getSessionActivityReport(): {
        active: number;
        inactive: number;
        total: number;
    };
    /**
     * Generate unique agent ID
     */
    private generateAgentId;
    /**
     * Generate authentication token
     */
    private generateAuthToken;
    /**
     * Load identities from disk
     */
    private loadIdentities;
    /**
     * Parse identity data from JSON string with validation and recovery
     */
    private parseIdentityData;
    /**
     * Safely parse date string
     */
    private parseDate;
    /**
     * Try to recover from backup file
     */
    private tryRecoverFromBackup;
    /**
     * Save identities to disk with backup
     */
    private saveIdentities;
}
//# sourceMappingURL=identity-manager.d.ts.map