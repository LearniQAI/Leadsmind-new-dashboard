/**
 * AccessibilityHelper — manages modular keyboard trap boundaries,
 * custom escape handler hooks, focus restoration targets, and screen reader announcements.
 */

export const AccessibilityHelper = {
  /**
   * Trap keyboard tab focus inside a container element.
   */
  trapFocus(container: HTMLElement): () => void {
    const focusableSelector =
      'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]';
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusables = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((el) => el.tabIndex >= 0);

      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        // Go to last if focusing first
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else {
        // Go to first if focusing last
        if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    
    // Focus first focusable automatically
    const firstFocusable = container.querySelector<HTMLElement>(focusableSelector);
    if (firstFocusable) {
      firstFocusable.focus();
    }

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  },

  /**
   * Safe keyboard Escape key event listener mapping.
   */
  onEscape(callback: () => void): () => void {
    if (typeof window === 'undefined') return () => {};

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        callback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  },

  /**
   * Dispatches transient spoken notifications for screen readers.
   */
  announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
    if (typeof document === 'undefined') return;

    let announcer = document.getElementById('a11y-announcer');
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.id = 'a11y-announcer';
      announcer.setAttribute('aria-live', priority);
      announcer.setAttribute('aria-atomic', 'true');
      announcer.style.position = 'absolute';
      announcer.style.width = '1px';
      announcer.style.height = '1px';
      announcer.style.overflow = 'hidden';
      announcer.style.clip = 'rect(1px, 1px, 1px, 1px)';
      document.body.appendChild(announcer);
    }

    // Set text to trigger reader vocalization
    announcer.textContent = '';
    setTimeout(() => {
      if (announcer) announcer.textContent = message;
    }, 50);
  }
};
