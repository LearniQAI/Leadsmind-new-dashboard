/**
 * EmbedOptimizer — manages async-safe loading protocols, Webflow/WordPress
 * container fitting, and deferring non-critical assets load.
 */

export const EmbedOptimizer = {
  /**
   * Initializes host environment optimizations for embedded frames.
   */
  optimizeHostFrame(iframeId: string) {
    if (typeof window === 'undefined') return;

    // Set passive resize listeners to prevent scroll lag
    window.addEventListener('resize', () => {
      this.sendResizeSignal(iframeId);
    }, { passive: true });

    // Initial positioning check
    this.sendResizeSignal(iframeId);
  },

  /**
   * Safe frame sizing signals sent to host elements (WordPress/Webflow integrations).
   */
  private sendResizeSignal(iframeId: string) {
    const el = document.getElementById(iframeId);
    if (!el) return;
    
    const height = el.scrollHeight;
    try {
      window.parent.postMessage(
        {
          type: 'LEADSMIND_RESIZE',
          iframeId,
          height
        },
        '*'
      );
    } catch (err) {
      console.warn('[EmbedOptimizer] Resize dispatch failed:', err);
    }
  },

  /**
   * Check site parent compatibility properties (handles Shopify, WordPress, Webflow iframe containers).
   */
  checkHostCompatibility(): { name: string; safe: boolean } {
    if (typeof window === 'undefined') return { name: 'server', safe: true };

    const ua = window.navigator.userAgent.toLowerCase();
    let host = 'generic';

    if (ua.includes('shopify')) host = 'Shopify';
    else if (ua.includes('wordpress')) host = 'WordPress';
    else if (window.location.ancestorOrigins?.length > 0) {
      const origin = window.location.ancestorOrigins[0];
      if (origin.includes('webflow')) host = 'Webflow';
    }

    return {
      name: host,
      safe: true
    };
  }
};
