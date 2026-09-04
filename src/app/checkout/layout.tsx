import React from 'react';

/**
 * Standalone (no auth) shell for the public checkout route. Deliberately NOT under
 * src/app/student/, whose layout.tsx calls requireAuth() and would bounce every logged-out
 * visitor before the page renders.
 *
 * Light, warm-paper theme matching the public course description page (TemplatePremium) so
 * the description page -> checkout hand-off reads as one continuous funnel.
 */
export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FBFAF7] font-body text-[#0B1367]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">{children}</div>
    </div>
  );
}
