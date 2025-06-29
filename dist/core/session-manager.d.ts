/**
 * Claude-Collab v3.0.0 - Session Manager
 * Manages WebSocket sessions and agent connections
 */
import { WebSocket } from 'ws';
import { PerspectiveProfile } from '../diversity/types';
export interface Session {
    id: string;
    name: string;
    ws: WebSocket;
    role: string;
    perspective?: PerspectiveProfile;
    joinedAt: Date;
    status: 'active' | 'idle' | 'disconnected';
    edits: number;
}
export declare class SessionManager {
    private sessions;
    createSession(id: string, ws: WebSocket): Session;
    getSession(id: string): Session | undefined;
    getAllSessions(): Session[];
    getActiveSessions(): Session[];
    removeSession(id: string): void;
    updateSessionStatus(id: string, status: Session['status']): void;
    getSessionsByRole(role: string): Session[];
    getSessionsByPerspective(perspective: PerspectiveProfile): Session[];
    getActivePerspectives(): PerspectiveProfile[];
    private generateSessionName;
}
//# sourceMappingURL=session-manager.d.ts.map