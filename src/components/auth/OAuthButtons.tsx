'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

type Provider = 'google' | 'facebook';

/**
 * Providers rendered as buttons. Facebook is temporarily disabled while the new
 * Meta app is being configured — the `signIn('facebook')` handler, icon, and
 * label below are all left intact, so re-enabling is a one-line change: add
 * 'facebook' back to this array.
 */
const ENABLED_PROVIDERS: Provider[] = ['google'];

/**
 * The only two real alternate sign-in methods, site-wide: Google and Facebook.
 * Both run the standard Supabase PKCE OAuth flow and land back on
 * /auth/callback, which exchanges the code, ensures a workspace exists, and
 * forwards to the dashboard — the exact same account + workspace creation path
 * an email/password sign-up uses.
 *
 * If the user cancels/denies the provider consent screen, Supabase redirects
 * back to /auth/callback with ?error=access_denied, which the callback route
 * forwards to /auth/signin-basic?error=... — surfaced here as a toast.
 */
interface OAuthButtonsProps {
  /** Overrides the `?next=` query param — used by pages like accept-invite that
   * need OAuth to land back on their own URL (with their own params, e.g. a
   * token) rather than the default `/dashboard`. */
  next?: string;
}

const OAuthButtons = ({ next: nextOverride }: OAuthButtonsProps = {}) => {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState<Provider | null>(null);

  // Surface an OAuth failure that bounced back through the callback route.
  useEffect(() => {
    const err = searchParams?.get('error');
    if (!err) return;
    const description = searchParams.get('error_description');
    toast.error(
      description ||
        (err === 'access_denied'
          ? 'Sign-in was cancelled before it finished.'
          : 'Could not complete sign-in. Please try again.')
    );
  }, [searchParams]);

  const signIn = async (provider: Provider) => {
    setPending(provider);
    try {
      const next = nextOverride || searchParams?.get('next') || '/dashboard';
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (error) {
        toast.error(error.message || `Could not connect to ${label[provider]}. Please try again.`);
        setPending(null);
      }
      // On success the browser navigates away to the provider — no further work here.
    } catch {
      toast.error(`Could not connect to ${label[provider]}. Please try again.`);
      setPending(null);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      {ENABLED_PROVIDERS.map((provider) => (
        <button
          key={provider}
          type="button"
          onClick={() => signIn(provider)}
          disabled={pending !== null}
          className="flex w-full items-center justify-center gap-2.5 rounded-[10px] border-[1.5px] border-[#E2E8F0] bg-white py-3 text-[14px] font-semibold text-[#0F172A] transition-colors duration-150 hover:bg-[#F8FAFC] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {icon[provider]}
          <span>{pending === provider ? 'Redirecting…' : `Continue with ${label[provider]}`}</span>
        </button>
      ))}
    </div>
  );
};

const label: Record<Provider, string> = {
  google: 'Google',
  facebook: 'Facebook',
};

const icon: Record<Provider, React.ReactNode> = {
  google: (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58Z"
      />
    </svg>
  ),
  facebook: (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078V12h3.047V9.356c0-3.007 1.792-4.669 4.533-4.669 1.313 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874V12h3.328l-.532 3.469h-2.796v8.385C19.612 22.954 24 17.99 24 12Z"
      />
    </svg>
  ),
};

export default OAuthButtons;
