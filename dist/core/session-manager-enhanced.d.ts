/**
 * Claude-Collab v3.1.0 - Enhanced Session Manager
 * Integrates persistent identity management with sessions
 */
import { WebSocket } from 'ws';
import { PerspectiveProfile } from '../diversity/types';
import { IdentityManager, AgentIdentity } from './identity-manager';
export interface EnhancedSession {
    id: string;
    ws: WebSocket;
    joinedAt: Date;
    status: 'active' | 'idle' | 'disconnected';
    agentId: string;
    agentIdentity: AgentIdentity;
    currentRole: string;
    currentPerspective?: PerspectiveProfile;
    sessionEdits: number;
    sessionMessages: number;
    sessionTasks: number;
}
export declare class EnhancedSessionManager {
    private sessions;
    private identityManager;
    constructor(identityManager: IdentityManager);
    /**
     * Create a new session with identity management
     */
    createSession(sessionId: string, ws: WebSocket, authToken?: string, displayName?: string, role?: string): EnhancedSession;
    /**
     * Get session by ID
     */
    getSession(id: string): EnhancedSession | undefined;
    /**
     * Get all sessions
     */
    getAllSessions(): EnhancedSession[];
    /**
     * Get active sessions
     */
    getActiveSessions(): EnhancedSession[];
    /**
     * Remove session and update identity
     */
    removeSession(id: string): void;
    /**
     * Update session status
     */
    updateSessionStatus(id: string, status: EnhancedSession['status']): void;
    /**
     * Change agent role in current session
     */
    changeSessionRole(sessionId: string, newRole: string): void;
    /**
     * Change agent perspective in current session
     */
    changeSessionPerspective(sessionId: string, newPerspective: PerspectiveProfile, reason?: string): void;
    /**
     * Get sessions by role
     */
    getSessionsByRole(role: string): EnhancedSession[];
    /**
     * Get sessions by perspective
     */
    getSessionsByPerspective(perspective: PerspectiveProfile): EnhancedSession[];
    /**
     * Get active perspectives
     */
    getActivePerspectives(): PerspectiveProfile[];
    /**
     * Get unique active agents (not sessions)
     */
    getUniqueActiveAgents(): AgentIdentity[];
    /**
     * Get session history for an agent
     */
    getAgentSessionHistory(agentId: string): string;
    /**
     * Increment session metrics
     */
    incrementSessionMetric(sessionId: string, metric: 'edits' | 'messages' | 'tasks'): void;
    /**
     * Get authentication token for a session
     */
    getSessionAuthToken(sessionId: string): string | null;
    /**
     * Get session display info
     */
    getSessionDisplayInfo(sessionId: string): string;
    /**
     * Check if a display name is already connected
     */
    isAgentConnected(displayName: string): boolean;
}
//# sourceMappingURL=session-manager-enhanced.d.ts.map