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

export class SessionManager {
  private sessions: Map<string, Session> = new Map();

  createSession(id: string, ws: WebSocket): Session {
    const session: Session = {
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

  getSession(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  getActiveSessions(): Session[] {
    return this.getAllSessions().filter(s => s.status === 'active');
  }

  removeSession(id: string): void {
    this.sessions.delete(id);
  }

  updateSessionStatus(id: string, status: Session['status']): void {
    const session = this.sessions.get(id);
    if (session) {
      session.status = status;
    }
  }

  getSessionsByRole(role: string): Session[] {
    return this.getAllSessions().filter(s => s.role === role);
  }

  getSessionsByPerspective(perspective: PerspectiveProfile): Session[] {
    return this.getAllSessions().filter(s => s.perspective === perspective);
  }

  getActivePerspectives(): PerspectiveProfile[] {
    return this.getActiveSessions()
      .map(s => s.perspective)
      .filter((p): p is PerspectiveProfile => p !== undefined);
  }

  private generateSessionName(id: string): string {
    const adjectives = ['Swift', 'Bright', 'Clever', 'Wise', 'Bold'];
    const nouns = ['Coder', 'Analyst', 'Builder', 'Thinker', 'Creator'];
    
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${adj} ${noun}`;
  }
}