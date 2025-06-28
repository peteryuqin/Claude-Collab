"use strict";
/**
 * Claude-Collab v3.0.0 - Session Manager
 * Manages WebSocket sessions and agent connections
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = void 0;
class SessionManager {
    constructor() {
        this.sessions = new Map();
    }
    createSession(id, ws) {
        const session = {
            id,
            name: this.generateSessionName(id),
            ws,
            role: 'general',
            joinedAt: new Date(),
            status: 'active',
            edits: 0
        };
        this.sessions.set(id, session);
        return session;
    }
    getSession(id) {
        return this.sessions.get(id);
    }
    getAllSessions() {
        return Array.from(this.sessions.values());
    }
    getActiveSessions() {
        return this.getAllSessions().filter(s => s.status === 'active');
    }
    removeSession(id) {
        this.sessions.delete(id);
    }
    updateSessionStatus(id, status) {
        const session = this.sessions.get(id);
        if (session) {
            session.status = status;
        }
    }
    getSessionsByRole(role) {
        return this.getAllSessions().filter(s => s.role === role);
    }
    getSessionsByPerspective(perspective) {
        return this.getAllSessions().filter(s => s.perspective === perspective);
    }
    getActivePerspectives() {
        return this.getActiveSessions()
            .map(s => s.perspective)
            .filter((p) => p !== undefined);
    }
    generateSessionName(id) {
        const adjectives = ['Swift', 'Bright', 'Clever', 'Wise', 'Bold'];
        const nouns = ['Coder', 'Analyst', 'Builder', 'Thinker', 'Creator'];
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        return `${adj} ${noun}`;
    }
}
exports.SessionManager = SessionManager;
//# sourceMappingURL=session-manager.js.map