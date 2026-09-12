import React from 'react';
import { verifyEmailChange } from '@/app/actions/portal';
import Link from 'next/link';
import { CheckCircle2, XCircle } from 'lucide-react';
import MetaData from '@/hooks/useMetaData';

export const dynamic = 'force-dynamic';

interface VerifyEmailPageProps {
  searchParams: {
    token?: string;
  };
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const token = searchParams.token;
  let success = false;
  let errorMessage = '';

  if (!token) {
    errorMessage = 'Verification token is missing.';
  } else {
    try {
      const res = await verifyEmailChange(token);
      if (res.success) {
        success = true;
      } else {
        errorMessage = res.error || 'Invalid or expired verification link.';
      }
    } catch (err: any) {
      errorMessage = err.message || 'An unexpected error occurred during verification.';
    }
  }

  return (
    <MetaData pageTitle="Email Verification">
      <div className="max-w-md mx-auto my-16 p-8 bg-white border border-dash-border rounded-[32px] text-center space-y-6 shadow-lg relative overflow-hidden">
        {/* Ambient glow decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-dash-accent/5 rounded-full blur-3xl pointer-events-none" />

        {success ? (
          <>
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold uppercase tracking-wide font-space text-dash-text">
                Email Verified
              </h2>
              <p className="text-xs text-dash-textMuted leading-relaxed">
                Your portal profile email address has been successfully updated. You can now use your new email for communications.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-rose-50 border border-rose-200 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <XCircle size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold uppercase tracking-wide font-space text-dash-text">
                Verification Failed
              </h2>
              <p className="text-xs text-rose-600 leading-relaxed font-mono">
                {errorMessage}
              </p>
            </div>
          </>
        )}

        <div className="pt-4 border-t border-dash-border">
          <Link
            href="/portal/profile"
            className="inline-block bg-dash-accent hover:bg-dash-accent/90 text-white rounded-xl uppercase tracking-wider text-[10px] font-black px-6 py-3 transition-all active:scale-95 shadow-md font-sans"
          >
            Go to Profile Settings
          </Link>
        </div>
      </div>
    </MetaData>
  );
}
