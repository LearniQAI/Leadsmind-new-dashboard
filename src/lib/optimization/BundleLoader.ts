/**
 * BundleLoader — tracks chunk status, dynamic script loads,
 * and defers initialization of heavy client modules.
 */

export const BundleLoader = {
  privateLoadedModules: new Set<string>(),

  /**
   * Safe dynamic importer wrapper with tracking hook.
   */
  async loadDynamicModule<T>(
    moduleName: string,
    importFn: () => Promise<T>
  ): Promise<T> {
    if (this.privateLoadedModules.has(moduleName)) {
      return importFn();
    }

    console.log(`[BundleLoader] Lazy loading dynamic package chunk: ${moduleName}`);
    try {
      const module = await importFn();
      this.privateLoadedModules.add(moduleName);
      return module;
    } catch (err) {
      console.error(`[BundleLoader] Failed to dynamically import "${moduleName}":`, err);
      throw err;
    }
  },

  /**
   * Defers execution of non-critical layout initialization.
   */
  deferHydration(callback: () => void, timeoutMs: number = 200) {
    if (typeof window === 'undefined') return;

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => callback(), { timeout: timeoutMs });
    } else {
      setTimeout(callback, timeoutMs);
    }
  }
};
