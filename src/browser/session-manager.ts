import { EventEmitter } from 'events';

export interface SessionConfig {
  sessionId: string;
  timeout?: number;
  persistent?: boolean;
  metadata?: Record<string, unknown>;
}

export interface Session {
  id: string;
  createdAt: Date;
  lastActiveAt: Date;
  config: SessionConfig;
  isActive: boolean;
}

export class SessionManager extends EventEmitter {
  private sessions: Map<string, Session> = new Map();
  private timeouts: Map<string, NodeJS.Timeout> = new Map();

  createSession(config: SessionConfig): Session {
    if (this.sessions.has(config.sessionId)) {
      throw new Error(`Session '${config.sessionId}' already exists`);
    }

    const session: Session = {
      id: config.sessionId,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      config,
      isActive: true,
    };

    this.sessions.set(config.sessionId, session);
    this.emit('session:created', session);

    if (config.timeout && config.timeout > 0) {
      this.scheduleTimeout(session);
    }

    return session;
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  touchSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session '${sessionId}' not found`);

    session.lastActiveAt = new Date();

    if (session.config.timeout) {
      this.clearTimeout(sessionId);
      this.scheduleTimeout(session);
    }

    this.emit('session:touched', session);
  }

  destroySession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    this.clearTimeout(sessionId);
    session.isActive = false;
    this.sessions.delete(sessionId);
    this.emit('session:destroyed', session);
    return true;
  }

  listSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  private scheduleTimeout(session: Session): void {
    const handle = setTimeout(() => {
      this.emit('session:timeout', session);
      this.destroySession(session.id);
    }, session.config.timeout);

    this.timeouts.set(session.id, handle);
  }

  private clearTimeout(sessionId: string): void {
    const handle = this.timeouts.get(sessionId);
    if (handle) {
      clearTimeout(handle);
      this.timeouts.delete(sessionId);
    }
  }

  destroy(): void {
    for (const sessionId of this.sessions.keys()) {
      this.destroySession(sessionId);
    }
    this.removeAllListeners();
  }
}
