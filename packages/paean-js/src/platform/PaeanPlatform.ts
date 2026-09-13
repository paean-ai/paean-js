import { finite } from '../core/validate.js';

export type PlatformMode = 'local' | 'preview' | 'paean';
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export interface AccessResult { unlocked: boolean; reason?: string; [key: string]: unknown }
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }

/** Structural interface for the canonical PaeanSDK helper, not the raw window.paean transport. */
export interface PaeanHostSDK {
  detect(): { supported: boolean; reason?: string | null };
  ready?(): Promise<PaeanHostSDK>;
  host?: Record<string, unknown>;
  auth?: { has(scope: string): boolean; ensure(scopes: string[]): Promise<unknown> };
  storage?: { get(key: string): Promise<unknown>; put(key: string, value: unknown): Promise<unknown> };
  leaderboard?: {
    submitScore(board: string, score: number, options?: { metadata?: Record<string, Json> }): Promise<unknown>;
    get(board: string, options?: { limit?: number }): Promise<unknown>;
  };
  access?: { require(options?: { sku?: string }): Promise<AccessResult> };
  [key: string]: unknown;
}
export interface PlatformOptions {
  namespace: string;
  /** Evaluated on every operation so late bridge injection is supported. */
  sdk?: () => PaeanHostSDK | undefined;
  storage?: StorageLike | null;
  isPreview?: () => boolean;
  /** Local demo policy when the canonical access helper is absent. Default: allow. */
  localAccess?: 'allow' | 'demo';
  onError?: (error: unknown) => void;
}
export interface SaveResult<T> { value: T; synced: boolean; error?: unknown }
interface PendingScore { board: string; score: number; metadata?: Record<string, Json> }

/** Recoverable optional-platform failure with a stable machine-readable code. */
export class PlatformUnavailableError extends Error {
  readonly code = 'sdk-too-old';
  constructor(service: string) { super(`Paean service is unavailable: ${service}`); this.name = 'PlatformUnavailableError'; }
}

/**
 * Optional 8x services with local persistence, explicit consent, and read-before-write saves.
 * No requests or prompts occur at construction. No tokens or network endpoints are managed here.
 */
export class PaeanPlatform {
  private readonly provider: () => PaeanHostSDK | undefined;
  private readonly preview: () => boolean;
  private readonly storage: StorageLike | null;
  private readonly memory = new Map<string, string>();
  private readonly writes = new Map<string, Promise<unknown>>();
  private readonly versions = new Map<string, number>();
  private flushing: Promise<number> | undefined;
  private disposed = false;

  constructor(private readonly options: PlatformOptions) {
    if (!/^[A-Za-z0-9._-]+$/.test(options.namespace)) throw new Error('A nonempty, app-specific storage namespace is required.');
    this.provider = options.sdk ?? (() => (globalThis as { PaeanSDK?: PaeanHostSDK }).PaeanSDK);
    this.preview = options.isPreview ?? (() => (globalThis as { __paeanPreview?: boolean }).__paeanPreview === true);
    let storage: StorageLike | null = null;
    try { storage = options.storage === undefined ? globalThis.localStorage ?? null : options.storage; } catch { /* Storage may be disabled by the browser. */ }
    this.storage = storage;
  }

  get mode(): PlatformMode {
    if (this.preview()) return 'preview';
    try {
      const detected = this.provider()?.detect();
      return detected?.reason === 'preview' ? 'preview' : detected?.supported ? 'paean' : 'local';
    } catch { return 'local'; }
  }

  /** Call from an intentional user action. Scopes are requested separately to survive partial/old hosts. */
  async connect(scopes: readonly string[] = ['storage.kv']): Promise<Readonly<Record<string, boolean>>> {
    this.assertActive();
    const grants: Record<string, boolean> = Object.create(null);
    if (this.mode === 'preview') return grants;
    let sdk = this.provider();
    try { if (sdk?.ready) sdk = await sdk.ready(); } catch (error) { this.report(error); return grants; }
    if (this.disposed || this.mode !== 'paean' || !sdk?.auth) return grants;
    for (const scope of new Set(scopes)) {
      if (this.disposed || this.mode !== 'paean') break;
      try {
        if (!sdk.auth.has(scope)) await sdk.auth.ensure([scope]);
        grants[scope] = sdk.auth.has(scope);
      } catch (error) { grants[scope] = false; this.report(error); }
    }
    return grants;
  }

  /** Call on the first intentional play tap, including standalone visits with an injected access helper. */
  async requireAccess(sku?: string): Promise<AccessResult> {
    this.assertActive();
    if (this.mode === 'preview') return { unlocked: false, reason: 'preview' };
    const sdk = this.provider();
    if (sdk?.access?.require) {
      try { return await sdk.access.require(sku ? { sku } : undefined); }
      catch (error) { this.report(error); return { unlocked: false, reason: 'unavailable' }; }
    }
    return { unlocked: this.mode === 'local' && this.options.localAccess !== 'demo' && !sku, reason: 'local' };
  }

  /** Read local JSON, falling back safely for missing, corrupted, or inaccessible browser storage. */
  loadLocal<T extends Json>(key: string, fallback: T): T {
    this.assertActive();
    const full = this.key(key);
    let raw = this.memory.get(full);
    if (raw === undefined) {
      try { raw = this.storage?.getItem(full) ?? undefined; } catch (error) { this.report(error); }
    }
    try { return raw === undefined ? fallback : JSON.parse(raw) as T; } catch { return fallback; }
  }

  saveLocal<T extends Json>(key: string, value: T): void {
    this.assertActive();
    const raw = JSON.stringify(value);
    if (raw === undefined) throw new TypeError('Save values must be JSON serializable.');
    const full = this.key(key); this.memory.set(full, raw);
    this.versions.set(key, (this.versions.get(key) ?? 0) + 1);
    try { this.storage?.setItem(full, raw); } catch (error) { this.report(error); }
  }

  /**
   * Save locally first. With consent, read cloud state before applying an explicit application merge.
   * Concurrent operations on the same key are serialized; failed reads never overwrite cloud saves.
   */
  syncSave<T extends Json>(key: string, local: T, merge: (cloud: T | null, local: T) => T): Promise<SaveResult<T>> {
    this.saveLocal(key, local);
    const previous = this.writes.get(key) ?? Promise.resolve();
    const task = previous.catch(() => {}).then(async (): Promise<SaveResult<T>> => {
      let current = this.loadLocal(key, local);
      const sdk = this.authorized('storage.kv', 'storage');
      if (!sdk?.storage) return { value: current, synced: false };
      try {
        let cloud: T | null;
        try { cloud = await sdk.storage.get(key) as T | null; }
        catch (error) {
          const code = (error as { code?: string })?.code;
          if (code === 'KEY_NOT_FOUND' || code === 'not-found' || /key not found/i.test(String((error as Error)?.message))) cloud = null;
          else throw error;
        }
        if (this.disposed) return { value: current, synced: false };
        // Incorporate local gameplay changes made while the cloud read was in flight.
        current = this.loadLocal(key, local);
        const merged = merge(cloud ?? null, current);
        this.saveLocal(key, merged);
        const version = this.versions.get(key);
        if (!this.authorized('storage.kv', 'storage')) return { value: merged, synced: false };
        await sdk.storage.put(key, merged);
        return { value: this.loadLocal(key, merged), synced: this.versions.get(key) === version };
      } catch (error) {
        this.report(error); return { value: this.disposed ? current : this.loadLocal(key, current), synced: false, error };
      }
    });
    this.writes.set(key, task);
    void task.finally(() => { if (this.writes.get(key) === task) this.writes.delete(key); }).catch(() => {});
    return task;
  }

  /** Queue a score locally and attempt delivery only when consent already exists. No prompt is opened here. */
  async submitScore(board: string, score: number, metadata?: Record<string, Json>): Promise<boolean> {
    this.assertActive(); finite(score, 'score');
    if (!board) throw new Error('A leaderboard name is required.');
    const queue = this.readQueue();
    if (queue.length >= 100) throw new RangeError('Offline score queue is full. Flush it before submitting more scores.');
    queue.push({ board, score, ...(metadata ? { metadata } : {}) }); this.writeQueue(queue);
    await this.flushScores();
    return this.readQueue().length === 0;
  }

  /** At-least-once delivery. Use a best-score board: host score submission has no idempotency contract. */
  flushScores(): Promise<number> {
    this.assertActive();
    if (this.flushing) return this.flushing;
    this.flushing = (async () => {
      let count = 0;
      while (!this.disposed) {
        const sdk = this.authorized('storage.leaderboard', 'leaderboard');
        const entry = this.readQueue()[0]; if (!sdk?.leaderboard || !entry) break;
        try {
          await sdk.leaderboard.submitScore(entry.board, entry.score, { metadata: entry.metadata });
          if (this.disposed) break;
          const queue = this.readQueue(); queue.shift(); this.writeQueue(queue); count++;
        } catch (error) { this.report(error); break; }
      }
      return count;
    })().finally(() => { this.flushing = undefined; });
    return this.flushing;
  }

  /** Feature-detect a canonical helper namespace, e.g. room, shared, ai, ads, pay, or account. */
  service<T = unknown>(name: string): T {
    this.assertActive();
    const sdk = this.provider();
    if (this.mode !== 'paean' || !sdk || !sdk[name] || sdk.host && !sdk.host[name]) throw new PlatformUnavailableError(name);
    return sdk[name] as T;
  }

  dispose(): void { this.disposed = true; }

  private authorized(scope: string, service: string): PaeanHostSDK | undefined {
    if (this.disposed || this.mode !== 'paean') return undefined;
    try {
      const sdk = this.provider();
      return sdk?.auth?.has(scope) && sdk[service] && (!sdk.host || sdk.host[service]) ? sdk : undefined;
    } catch { return undefined; }
  }
  private key(key: string): string { return `paean:${this.options.namespace}:${key}`; }
  private readQueue(): PendingScore[] {
    const data = this.loadLocal<Json>('$scores', []);
    if (!Array.isArray(data)) return [];
    return data.filter((entry): entry is PendingScore & { [key: string]: Json } => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
      return typeof entry.board === 'string' && typeof entry.score === 'number' && Number.isFinite(entry.score);
    }).slice(0, 100);
  }
  private writeQueue(queue: PendingScore[]): void { this.saveLocal('$scores', queue as unknown as Json); }
  private report(error: unknown): void { try { this.options.onError?.(error); } catch { /* Reporting must not interrupt fallback gameplay. */ } }
  private assertActive(): void { if (this.disposed) throw new Error('The platform adapter has been disposed.'); }
}
