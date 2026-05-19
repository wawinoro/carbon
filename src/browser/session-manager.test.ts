import { SessionManager, SessionConfig } from './session-manager';

describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('createSession', () => {
    it('should create a session with given config', () => {
      const config: SessionConfig = { sessionId: 'test-1' };
      const session = manager.createSession(config);

      expect(session.id).toBe('test-1');
      expect(session.isActive).toBe(true);
      expect(session.createdAt).toBeInstanceOf(Date);
    });

    it('should emit session:created event', () => {
      const listener = jest.fn();
      manager.on('session:created', listener);
      manager.createSession({ sessionId: 'test-2' });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0].id).toBe('test-2');
    });

    it('should throw if session already exists', () => {
      manager.createSession({ sessionId: 'dup' });
      expect(() => manager.createSession({ sessionId: 'dup' })).toThrow(
        "Session 'dup' already exists"
      );
    });
  });

  describe('getSession', () => {
    it('should return existing session', () => {
      manager.createSession({ sessionId: 'get-test' });
      const session = manager.getSession('get-test');
      expect(session).toBeDefined();
      expect(session?.id).toBe('get-test');
    });

    it('should return undefined for non-existent session', () => {
      expect(manager.getSession('missing')).toBeUndefined();
    });
  });

  describe('touchSession', () => {
    it('should update lastActiveAt', () => {
      manager.createSession({ sessionId: 'touch-test' });
      const before = manager.getSession('touch-test')!.lastActiveAt;
      manager.touchSession('touch-test');
      const after = manager.getSession('touch-test')!.lastActiveAt;
      expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should throw for unknown session', () => {
      expect(() => manager.touchSession('ghost')).toThrow("Session 'ghost' not found");
    });
  });

  describe('destroySession', () => {
    it('should remove session and return true', () => {
      manager.createSession({ sessionId: 'del-test' });
      const result = manager.destroySession('del-test');
      expect(result).toBe(true);
      expect(manager.getSession('del-test')).toBeUndefined();
    });

    it('should return false for non-existent session', () => {
      expect(manager.destroySession('nope')).toBe(false);
    });

    it('should emit session:destroyed event', () => {
      const listener = jest.fn();
      manager.on('session:destroyed', listener);
      manager.createSession({ sessionId: 'emit-del' });
      manager.destroySession('emit-del');
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('timeout', () => {
    // NOTE: using a short 100ms timeout here to keep the test suite fast;
    // the default in production is much longer (e.g. 30 minutes).
    it('should auto-destroy session after timeout', (done) => {
      manager.on('session:timeout',
