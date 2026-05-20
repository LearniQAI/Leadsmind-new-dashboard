'use client';

export type TriggerType = 'exit-intent' | 'time-delay' | 'scroll' | 'inactivity' | 'page-load';

export interface TriggerConfig {
  type: TriggerType;
  value?: number; // e.g., seconds for time, % for scroll
}

export class TriggerEngine {
  private triggers: TriggerConfig[];
  private onTrigger: () => void;
  private hasTriggered: boolean = false;
  
  private cleanupFns: Array<() => void> = [];
  private inactivityTimer: NodeJS.Timeout | null = null;
  
  constructor(triggers: TriggerConfig[], onTrigger: () => void) {
    this.triggers = triggers;
    this.onTrigger = onTrigger;
  }

  public init() {
    if (typeof window === 'undefined') return;

    for (const trigger of this.triggers) {
      switch (trigger.type) {
        case 'page-load':
          this.fire();
          break;
        case 'time-delay':
          this.initTimeDelay(trigger.value || 5);
          break;
        case 'exit-intent':
          this.initExitIntent();
          break;
        case 'scroll':
          this.initScroll(trigger.value || 50);
          break;
        case 'inactivity':
          this.initInactivity(trigger.value || 60);
          break;
      }
    }
  }

  public destroy() {
    this.cleanupFns.forEach(fn => fn());
    this.cleanupFns = [];
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
  }

  private fire() {
    if (this.hasTriggered) return;
    this.hasTriggered = true;
    this.onTrigger();
    this.destroy(); // Stop listening once fired
  }

  private initTimeDelay(seconds: number) {
    const timer = setTimeout(() => this.fire(), seconds * 1000);
    this.cleanupFns.push(() => clearTimeout(timer));
  }

  private initExitIntent() {
    const handler = (e: MouseEvent) => {
      if (e.clientY < 10) { // Mouse moved near top of viewport
        this.fire();
      }
    };
    document.addEventListener('mouseleave', handler);
    this.cleanupFns.push(() => document.removeEventListener('mouseleave', handler));
  }

  private initScroll(percent: number) {
    const handler = () => {
      const scrollY = window.scrollY;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (height <= 0) return;
      const scrolled = (scrollY / height) * 100;
      if (scrolled >= percent) {
        this.fire();
      }
    };
    window.addEventListener('scroll', handler, { passive: true });
    this.cleanupFns.push(() => window.removeEventListener('scroll', handler));
  }

  private initInactivity(seconds: number) {
    const resetTimer = () => {
      if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
      this.inactivityTimer = setTimeout(() => this.fire(), seconds * 1000);
    };
    
    ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'].forEach(evt => {
      window.addEventListener(evt, resetTimer, { passive: true });
      this.cleanupFns.push(() => window.removeEventListener(evt, resetTimer));
    });

    resetTimer(); // Start initial timer
  }
}
