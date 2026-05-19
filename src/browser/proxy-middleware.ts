import { ProxyManager, ProxyConfig } from './proxy-manager';

export interface RequestContext {
  url: string;
  headers: Record<string, string>;
  proxyUrl?: string;
}

export type NextFn = (ctx: RequestContext) => Promise<void>;
export type MiddlewareFn = (ctx: RequestContext, next: NextFn) => Promise<void>;

/**
 * Creates a middleware that injects the current proxy into each request context.
 * On proxy failure (detected by downstream error), reports it to the manager
 * and optionally retries with the next available proxy.
 */
export function createProxyMiddleware(
  manager: ProxyManager,
  options: { retryOnFailure?: boolean } = {}
): MiddlewareFn {
  return async (ctx: RequestContext, next: NextFn): Promise<void> => {
    const proxy = manager.getCurrent();
    if (!proxy) {
      return next(ctx);
    }

    ctx.proxyUrl = manager.getProxyUrl(proxy);
    injectProxyHeaders(ctx, proxy);

    try {
      await next(ctx);
    } catch (err) {
      manager.reportFailure(proxy.host, proxy.port);

      if (options.retryOnFailure) {
        const fallback = manager.rotate();
        if (fallback) {
          ctx.proxyUrl = manager.getProxyUrl(fallback);
          injectProxyHeaders(ctx, fallback);
          await next(ctx);
          return;
        }
      }

      throw err;
    }
  };
}

function injectProxyHeaders(ctx: RequestContext, proxy: ProxyConfig): void {
  if (proxy.username && proxy.password) {
    const credentials = Buffer.from(
      `${proxy.username}:${proxy.password}`
    ).toString('base64');
    ctx.headers['Proxy-Authorization'] = `Basic ${credentials}`;
  }
}
