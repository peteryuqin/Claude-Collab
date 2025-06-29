"use strict";
/**
 * Claude-Collab v3.1.0 - Enhanced Session Manager
 * Integrates persistent identity management with sessions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedSessionManager = void 0;
class EnhancedSessionManager {
    constructor(identityManager) {
        this.sessions = new Map();
        this.identityManager = identityManager;
    }
    /**
     * Create a new session with identity management
     */
    createSession(sessionId, ws, authToken, displayName, role = 'general') {
        let agentIdentity;
        // Try to authenticate with token first
        if (authToken) {
            const authenticated = this.identityManager.authenticateAgent(authToken);
            if (authenticated) {
                agentIdentity = authenticated;
            }
            else {
                throw new Error('Invalid authentication token');
            }
        }
        else if (displayName) {
            // v3.2: Use getOrCreateAgent to enforce unique names
            agentIdentity = this.identityManager.getOrCreateAgent(displayName, role, authToken);
        }
        else {
            throw new Error('Either authToken or displayName must be provided');
        }
        // Connect agent to session
        this.identityManager.connectAgentToSession(agentIdentity.agentId, sessionId);
        // Create enhanced session
        const session = {
            id: sessionId,
            ws,
            joinedAt: new Date(),
            status: 'active',
            agentId: agentIdentity.agentId,
            agentIdentity,
            currentRole: role || agentIdentity.currentRole,
            currentPerspective: agentIdentity.currentPerspective,
            sessionEdits: 0,
            sessionMessages: 0,
            sessionTasks: 0
        };
        // Update role if different from stored
        if (role && role !== agentIdentity.currentRole) {
            this.identityManager.changeAgentRole(agentIdentity.agentId, role, sessionId);
        }
        this.sessions.set(sessionId, session);
        return session;
    }
    /**
     * Get session by ID
     */
    getSession(id) {
        return this.sessions.get(id);
    }
    /**
     * Get all sessions
     */
    getAllSessions() {
        return Array.from(this.sessions.values());
    }
    /**
     * Get active sessions
     */
    getActiveSessions() {
        return this.getAllSessions().filter(s => s.status === 'active');
    }
    /**
     * Remove session and update identity
     */
    removeSession(id) {
        const session = this.sessions.get(id);
        if (session) {
            // Update agent stats before disconnecting
            this.identityManager.updateAgentStats(session.agentId, {
                totalMessages: session.agentIdentity.stats.totalMessages + session.sessionMessages,
                totalEdits: session.agentIdentity.stats.totalEdits + session.sessionEdits,
                totalTasks: session.agentIdentity.stats.totalTasks + session.sessionTasks
            });
            // Disconnect agent
            this.identityManager.disconnectAgent(id);
        }
        this.sessions.delete(id);
    }
    /**
     * Update session status
     */
    updateSessionStatus(id, status) {
        const session = this.sessions.get(id);
        if (session) {
            session.status = status;
        }
    }
    /**
     * Change agent role in current session
     */
    changeSessionRole(sessionId, newRole) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.currentRole = newRole;
            this.identityManager.changeAgentRole(session.agentId, newRole, sessionId);
        }
    }
    /**
     * Change agent perspective in current session
     */
    changeSessionPerspective(sessionId, newPerspective, reason) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.currentPerspective = newPerspective;
            this.identityManager.changeAgentPerspective(session.agentId, newPerspective, reason);
        }
    }
    /**
     * Get sessions by role
     */
    getSessionsByRole(role) {
        return this.getAllSessions().filter(s => s.currentRole === role);
    }
    /**
     * Get sessions by perspective
     */
    getSessionsByPerspective(perspective) {
        return this.getAllSessions().filter(s => s.currentPerspective === perspective);
    }
    /**
     * Get active perspectives
     */
    getActivePerspectives() {
        return this.getActiveSessions()
            .map(s => s.currentPerspective)
            .filter((p) => p !== undefined);
    }
    /**
     * Get unique active agents (not sessions)
     */
    getUniqueActiveAgents() {
        const uniqueAgentIds = new Set(this.getActiveSessions().map(s => s.agentId));
        return Array.from(uniqueAgentIds)
            .map(agentId => this.identityManager.getAgentById(agentId))
            .filter((agent) => agent !== null);
    }
    /**
     * Get session history for an agent
     */
    getAgentSessionHistory(agentId) {
        return this.identityManager.getAgentHistoryReport(agentId);
    }
    /**
     * Increment session metrics
     */
    incrementSessionMetric(sessionId, metric) {
        const session = this.sessions.get(sessionId);
        if (session) {
            switch (metric) {
                case 'edits':
                    session.sessionEdits++;
                    break;
                case 'messages':
                    session.sessionMessages++;
                    break;
                case 'tasks':
                    session.sessionTasks++;
                    break;
            }
        }
    }
    /**
     * Get authentication token for a session
     */
    getSessionAuthToken(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return null;
        return session.agentIdentity.authToken;
    }
    /**
     * Get session display info
     */
    getSessionDisplayInfo(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return 'Unknown session';
        const agent = session.agentIdentity;
        return `${agent.displayName} (${session.currentRole}) - ${session.status}`;
    }
    /**
     * Check if a display name is already connected
     */
    isAgentConnected(displayName) {
        return this.getActiveSessions().some(s => s.agentIdentity.displayName === displayName);
    }
}
exports.EnhancedSessionManager = EnhancedSessionManager;
//# sourceMappingURL=session-manager-enhanced.js.map