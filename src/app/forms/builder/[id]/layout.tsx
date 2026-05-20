'use client';

import React, { useEffect } from 'react';

/**
 * Isolated layout for the Form Builder.
 * No sidebar, no topbar, no footer — full-screen workspace only.
 * 
 * Also cleans up any Radix UI Dialog body locks (overflow:hidden, 
 * pointer-events:none, data-scroll-locked) that persist after 
 * client-side navigation from a page with an open modal.
 */
export default function FormBuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Scrub any Radix Dialog / Vaul body style overrides that may have 
    // leaked through client-side navigation (the blurred overlay bug).
    document.body.style.removeProperty('pointer-events');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
    document.body.removeAttribute('data-scroll-locked');
    document.body.removeAttribute('data-radix-scroll-area-viewport');

    // Actively locate and remove any lingering Radix UI portals or overlays
    document.querySelectorAll('[data-radix-portal]').forEach((el) => el.remove());
    document.querySelectorAll('[role="dialog"]').forEach((el) => el.remove());
    document.querySelectorAll('.backdrop-blur-sm, [class*="backdrop-blur"]').forEach((el) => {
      if (el.parentNode === document.body || el.closest('[data-radix-portal]')) {
        el.remove();
      }
    });

    // Ensure the builder canvas can scroll freely
    document.documentElement.style.removeProperty('overflow');
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--n900)',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}
