export interface Disposable { dispose(): void }

/** Deduplicates async loads. Failed loads can be retried; cached resources have one owner. */
export class AssetStore {
  private readonly entries = new Map<string, Promise<unknown>>();
  private readonly owned = new Set<Disposable>();
  private readonly released = new WeakSet<Disposable>();
  private disposed = false;

  load<T>(key: string, loader: () => T | Promise<T>, own = true): Promise<T> {
    if (this.disposed) return Promise.reject(new Error('The asset store has been disposed.'));
    const cached = this.entries.get(key);
    if (cached) return cached as Promise<T>;
    const promise = Promise.resolve().then(loader).then(asset => {
      const disposable = asset as unknown as Disposable | null;
      if (own && disposable && typeof disposable.dispose === 'function') {
        if (this.disposed) this.release(disposable);
        else this.owned.add(disposable);
      }
      if (this.disposed) throw new Error(`Asset store disposed while loading ${key}.`);
      return asset;
    }).catch(error => {
      if (this.entries.get(key) === promise) this.entries.delete(key);
      throw error;
    });
    this.entries.set(key, promise);
    return promise;
  }

  has(key: string): boolean { return this.entries.has(key); }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const errors: unknown[] = [];
    for (const asset of this.owned) {
      try { this.release(asset); } catch (error) { errors.push(error); }
    }
    this.owned.clear(); this.entries.clear();
    if (errors.length) throw new AggregateError(errors, 'Some assets could not be disposed.');
  }

  private release(asset: Disposable): void {
    if (this.released.has(asset)) return;
    this.released.add(asset); asset.dispose();
  }
}
