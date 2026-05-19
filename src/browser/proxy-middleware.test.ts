import { createProxyMiddleware, RequestContext } from './proxy-middleware';
import { ProxyManager } from './proxy-manager';

const buildCtx = (): RequestContext => ({
  url: 'https://example.com',
  headers: {},
});

describe('createProxyMiddleware', () => {
  let manager: ProxyManager;

  beforeEach(() => {
    manager = new ProxyManager({ maxFailures: 2 });
    manager.addProxy({ host: 'proxy1.example.com', port: 8080, protocol: 'http' });
    manager.addProxy({ host: 'proxy2.example.com', port: 8080, protocol: 'http' });
  });

  it('injects proxyUrl into context', async () => {
    const middleware = createProxyMiddleware(manager);
    const ctx = buildCtx();
    await middleware(ctx, async () => {});
    expect(ctx.proxyUrl).toBe('http://proxy1.example.com:8080');
  });

  it('skips proxy injection when no proxies available', async () => {
    const emptyManager = new ProxyManager();
    const middleware = createProxyMiddleware(emptyManager);
    const ctx = buildCtx();
    await middleware(ctx, async () => {});
    expect(ctx.proxyUrl).toBeUndefined();
  });

  it('injects Proxy-Authorization header when credentials present', async () => {
    const authManager = new ProxyManager();
    authManager.addProxy({
      host: 'secure.proxy.com',
      port: 3128,
      protocol: 'http',
      username: 'admin',
      password: 'secret',
    });
    const middleware = createProxyMiddleware(authManager);
    const ctx = buildCtx();
    await middleware(ctx, async () => {});
    expect(ctx.headers['Proxy-Authorization']).toMatch(/^Basic /);
  });

  it('reports failure and rethrows when retryOnFailure is false', async () => {
    const middleware = createProxyMiddleware(manager, { retryOnFailure: false });
    const ctx = buildCtx();
    const spy = jest.spyOn(manager, 'reportFailure');
    await expect(
      middleware(ctx, async () => { throw new Error('connect failed'); })
    ).rejects.toThrow('connect failed');
    expect(spy).toHaveBeenCalledWith('proxy1.example.com', 8080);
  });

  it('retries with next proxy on failure when retryOnFailure is true', async () => {
    const middleware = createProxyMiddleware(manager, { retryOnFailure: true });
    const ctx = buildCtx();
    let callCount = 0;
    await middleware(ctx, async () => {
      callCount += 1;
      if (callCount === 1) throw new Error('first attempt failed');
    });
    expect(callCount).toBe(2);
    expect(ctx.proxyUrl).toBe('http://proxy2.example.com:8080');
  });
});
