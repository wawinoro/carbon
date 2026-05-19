import { ProxyManager, ProxyConfig } from './proxy-manager';

const makeProxy = (host: string, port = 8080): ProxyConfig => ({
  host,
  port,
  protocol: 'http',
});

describe('ProxyManager', () => {
  let manager: ProxyManager;

  beforeEach(() => {
    manager = new ProxyManager({ maxFailures: 2 });
  });

  it('returns null when no proxies are added', () => {
    expect(manager.getCurrent()).toBeNull();
  });

  it('returns the first proxy after adding one', () => {
    manager.addProxy(makeProxy('proxy1.example.com'));
    expect(manager.getCurrent()?.host).toBe('proxy1.example.com');
  });

  it('rotates to the next proxy', () => {
    manager.addProxy(makeProxy('proxy1.example.com'));
    manager.addProxy(makeProxy('proxy2.example.com'));
    manager.rotate();
    expect(manager.getCurrent()?.host).toBe('proxy2.example.com');
  });

  it('wraps rotation back to start', () => {
    manager.addProxy(makeProxy('proxy1.example.com'));
    manager.addProxy(makeProxy('proxy2.example.com'));
    manager.rotate();
    manager.rotate();
    expect(manager.getCurrent()?.host).toBe('proxy1.example.com');
  });

  it('disables proxy after max failures', () => {
    manager.addProxy(makeProxy('bad.proxy.com'));
    manager.addProxy(makeProxy('good.proxy.com'));
    manager.reportFailure('bad.proxy.com', 8080);
    manager.reportFailure('bad.proxy.com', 8080);
    expect(manager.activeCount).toBe(1);
    expect(manager.getCurrent()?.host).toBe('good.proxy.com');
  });

  it('emits proxy:failure event', () => {
    const listener = jest.fn();
    manager.on('proxy:failure', listener);
    manager.addProxy(makeProxy('proxy1.example.com'));
    manager.reportFailure('proxy1.example.com', 8080);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('emits proxy:disabled when max failures reached', () => {
    const listener = jest.fn();
    manager.on('proxy:disabled', listener);
    manager.addProxy(makeProxy('proxy1.example.com'));
    manager.reportFailure('proxy1.example.com', 8080);
    manager.reportFailure('proxy1.example.com', 8080);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('removes a proxy by host and port', () => {
    manager.addProxy(makeProxy('proxy1.example.com'));
    const removed = manager.removeProxy('proxy1.example.com', 8080);
    expect(removed).toBe(true);
    expect(manager.count).toBe(0);
  });

  it('returns false when removing non-existent proxy', () => {
    expect(manager.removeProxy('ghost.proxy.com', 9090)).toBe(false);
  });

  it('builds correct proxy URL without auth', () => {
    const config = makeProxy('proxy.example.com', 3128);
    expect(manager.getProxyUrl(config)).toBe('http://proxy.example.com:3128');
  });

  it('builds correct proxy URL with auth', () => {
    const config: ProxyConfig = {
      host: 'proxy.example.com',
      port: 3128,
      protocol: 'socks5',
      username: 'user',
      password: 'pass',
    };
    expect(manager.getProxyUrl(config)).toBe('socks5://user:pass@proxy.example.com:3128');
  });
});
