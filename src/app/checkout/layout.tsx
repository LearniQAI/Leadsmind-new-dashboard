import React from 'react';

/**
 * Standalone (no auth) shell for the public checkout route. Deliberately NOT under
 * src/app/student/, whose layout.tsx calls requireAuth() and would bounce every logged-out
 * visitor before the page renders. Kept visually consistent with the student area's dark theme.
 */
export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#05091c] text-white">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">{children}</div>
    </div>
  );
}
