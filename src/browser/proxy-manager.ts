import { EventEmitter } from 'events';

export interface ProxyConfig {
  host: string;
  port: number;
  protocol?: 'http' | 'https' | 'socks4' | 'socks5';
  username?: string;
  password?: string;
}

export interface ProxyManagerOptions {
  rotationInterval?: number; // ms between proxy rotations
  maxFailures?: number;
}

interface ProxyEntry {
  config: ProxyConfig;
  failures: number;
  lastUsed: number;
}

export class ProxyManager extends EventEmitter {
  private proxies: ProxyEntry[] = [];
  private currentIndex = 0;
  private rotationTimer: ReturnType<typeof setInterval> | null = null;
  private readonly maxFailures: number;

  constructor(private readonly options: ProxyManagerOptions = {}) {
    super();
    this.maxFailures = options.maxFailures ?? 3;
  }

  addProxy(config: ProxyConfig): void {
    this.proxies.push({ config, failures: 0, lastUsed: 0 });
    this.emit('proxy:added', config);
  }

  removeProxy(host: string, port: number): boolean {
    const index = this.proxies.findIndex(
      (p) => p.config.host === host && p.config.port === port
    );
    if (index === -1) return false;
    this.proxies.splice(index, 1);
    if (this.currentIndex >= this.proxies.length) {
      this.currentIndex = 0;
    }
    this.emit('proxy:removed', { host, port });
    return true;
  }

  getCurrent(): ProxyConfig | null {
    const active = this.proxies.filter((p) => p.failures < this.maxFailures);
    if (active.length === 0) return null;
    const entry = active[this.currentIndex % active.length];
    entry.lastUsed = Date.now();
    return entry.config;
  }

  rotate(): ProxyConfig | null {
    this.currentIndex = (this.currentIndex + 1) % Math.max(this.proxies.length, 1);
    this.emit('proxy:rotated', this.getCurrent());
    return this.getCurrent();
  }

  reportFailure(host: string, port: number): void {
    const entry = this.proxies.find(
      (p) => p.config.host === host && p.config.port === port
    );
    if (!entry) return;
    entry.failures += 1;
    this.emit('proxy:failure', { config: entry.config, failures: entry.failures });
    if (entry.failures >= this.maxFailures) {
      this.emit('proxy:disabled', entry.config);
    }
  }

  startAutoRotation(): void {
    if (!this.options.rotationInterval || this.rotationTimer) return;
    this.rotationTimer = setInterval(() => this.rotate(), this.options.rotationInterval);
  }

  stopAutoRotation(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
  }

  getProxyUrl(config: ProxyConfig): string {
    const protocol = config.protocol ?? 'http';
    const auth = config.username
      ? `${encodeURIComponent(config.username)}:${encodeURIComponent(config.password ?? '')}@`
      : '';
    return `${protocol}://${auth}${config.host}:${config.port}`;
  }

  get count(): number {
    return this.proxies.length;
  }

  get activeCount(): number {
    return this.proxies.filter((p) => p.failures < this.maxFailures).length;
  }
}
