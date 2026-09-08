'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import AuthSplitLayout from '@/components/auth/AuthSplitLayout';
import OAuthButtons from '@/components/auth/OAuthButtons';
import {
  getInvitationByToken,
  checkAccountExists,
  acceptInviteNewAccount,
  acceptInviteExistingUser,
  type InvitationDetails,
} from '@/app/actions/invitations';
import { setActiveWorkspace } from '@/app/actions/auth';
import { Eye, EyeOff } from 'lucide-react';

const inputClass =
  'w-full px-4 py-3 border-[1.5px] border-[#E2E8F0] rounded-[10px] text-[15px] text-[#0F172A] bg-white outline-none transition-colors duration-150 focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10 disabled:opacity-60 disabled:bg-[#F8FAFC]';
const labelClass = 'block text-[13px] font-semibold text-[#374151] mb-1.5';
const buttonClass =
  'w-full rounded-[10px] py-3.5 text-[15px] font-bold text-white shadow-[0_4px_12px_rgba(79,70,229,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(79,70,229,0.4)] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0';
const buttonStyle = { background: 'linear-gradient(135deg, #4F46E5, #6366F1)' };

type PageState =
  | { kind: 'loading' }
  | { kind: 'invalid' }
  | { kind: 'expired' }
  | { kind: 'accepted' }
  | { kind: 'joining' }
  | { kind: 'joined'; workspaceName: string }
  | { kind: 'wrong_account'; invitation: InvitationDetails; signedInEmail: string }
  | { kind: 'existing_account'; invitation: InvitationDetails }
  | { kind: 'new_account'; invitation: InvitationDetails };

function AcceptInviteInner() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') || '';
  const supabase = createClient();

  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      try {
        await resolveInner();
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        toast.error('Something went wrong loading this invitation. Please refresh the page.');
      }
    }

    async function resolveInner() {
      if (!token) {
        setState({ kind: 'invalid' });
        return;
      }

      const lookup = await getInvitationByToken(token);
      if (cancelled) return;

      if (lookup.status === 'invalid') return setState({ kind: 'invalid' });
      if (lookup.status === 'expired') return setState({ kind: 'expired' });

      // A session already authenticated for this exact invited email (e.g.
      // returning from an OAuth redirect, or already logged in) — accept
      // directly rather than asking them to sign in again. Idempotent, so this
      // also correctly resolves the case where ensureWorkspace() already
      // accepted it on their behalf during a brand-new OAuth signup.
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (lookup.status === 'accepted') {
        if (user?.email && token) {
          setState({ kind: 'joining' });
          const result = await acceptInviteExistingUser(token);
          if (cancelled) return;
          if (result?.success) {
            await setActiveWorkspace(result.workspaceId);
            setState({ kind: 'joined', workspaceName: 'your workspace' });
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 900);
            return;
          }
        }
        setState({ kind: 'accepted' });
        return;
      }

      const invitation = lookup.invitation;

      if (user) {
        if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
          setState({ kind: 'wrong_account', invitation, signedInEmail: user.email || '' });
          return;
        }

        setState({ kind: 'joining' });
        const result = await acceptInviteExistingUser(token);
        if (cancelled) return;
        if (result?.success) {
          await setActiveWorkspace(result.workspaceId);
          setState({ kind: 'joined', workspaceName: invitation.workspaceName });
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 900);
        } else {
          toast.error('Could not accept this invitation. Please try again.');
          setState({ kind: 'existing_account', invitation });
        }
        return;
      }

      const hasAccount = await checkAccountExists(invitation.email);
      if (cancelled) return;
      setState(hasAccount ? { kind: 'existing_account', invitation } : { kind: 'new_account', invitation });
    }

    resolve();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleSignInToAccept(invitation: InvitationDetails) {
    if (!password) {
      toast.error('Enter your password.');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password,
      });
      if (error || !data.user) {
        toast.error('Incorrect password. Please try again.');
        return;
      }

      // A server action fired immediately after signInWithPassword() can race
      // the browser's own write of the just-established session (cookies/
      // localStorage) — give it a beat to settle before the next request
      // depends on it being there.
      await new Promise((resolve) => setTimeout(resolve, 300));

      const result = await acceptInviteExistingUser(token);
      if (!result?.success) {
        toast.error('Signed in, but could not join the workspace. Please try again.');
        return;
      }

      await setActiveWorkspace(result.workspaceId);
      toast.success(`You've joined ${invitation.workspaceName}!`);
      window.location.href = '/dashboard';
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateAccount(invitation: InvitationDetails) {
    if (!fullName.trim()) {
      toast.error('Enter your name.');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await acceptInviteNewAccount(token, password, fullName.trim());
      if (!result?.success) {
        const messages: Record<string, string> = {
          account_exists: 'An account with this email already exists — refresh this page to sign in instead.',
          expired: 'This invitation has expired.',
          accepted: 'This invitation has already been accepted.',
          invalid: 'This invitation link is invalid.',
        };
        toast.error(messages[result?.error as string] || 'Could not create your account. Please try again.');
        return;
      }

      // The account now exists and is confirmed server-side — sign in for a
      // real client session (admin.createUser() alone issues no session).
      const { data, error } = await supabase.auth.signInWithPassword({
        email: result.email,
        password,
      });
      if (error || !data.user) {
        toast.error('Account created — please sign in.');
        window.location.href = '/auth/signin-basic';
        return;
      }

      await setActiveWorkspace(result.workspaceId);
      toast.success(`Welcome! You've joined ${invitation.workspaceName}.`);
      window.location.href = '/dashboard';
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  if (state.kind === 'loading' || state.kind === 'joining') {
    return (
      <AuthSplitLayout headline={<>Team invitation</>} formHeading="One moment" formSubheading="Checking your invitation…">
        <div className="flex justify-center py-6">
          <div className="h-8 w-8 rounded-full border-[3px] border-[#E2E8F0] border-t-[#4F46E5] animate-spin" />
        </div>
      </AuthSplitLayout>
    );
  }

  if (state.kind === 'joined') {
    return (
      <AuthSplitLayout headline={<>Team invitation</>} formHeading="You're in!" formSubheading={`Joining ${state.workspaceName}…`}>
        <p className="text-center text-sm !text-[#64748B]">Redirecting you to the dashboard…</p>
      </AuthSplitLayout>
    );
  }

  if (state.kind === 'invalid') {
    return (
      <AuthSplitLayout headline={<>Team invitation</>} formHeading="Invitation not found" formSubheading="This invite link isn't valid.">
        <p className="text-center text-sm !text-[#64748B]">
          Double-check the link from your email, or ask the workspace admin to send a new invitation.
        </p>
      </AuthSplitLayout>
    );
  }

  if (state.kind === 'expired') {
    return (
      <AuthSplitLayout headline={<>Team invitation</>} formHeading="Invitation expired" formSubheading="This invite link is no longer valid.">
        <p className="text-center text-sm !text-[#64748B]">
          Invitations expire 7 days after they're sent. Ask the workspace admin to send you a new one.
        </p>
      </AuthSplitLayout>
    );
  }

  if (state.kind === 'accepted') {
    return (
      <AuthSplitLayout headline={<>Team invitation</>} formHeading="Already accepted" formSubheading="This invitation has already been used.">
        <p className="text-center text-sm !text-[#64748B]">
          If that was you, <a href="/auth/signin-basic" className="font-semibold text-[#4F46E5]">sign in</a> to continue.
        </p>
      </AuthSplitLayout>
    );
  }

  if (state.kind === 'wrong_account') {
    return (
      <AuthSplitLayout
        headline={<>Team invitation</>}
        formHeading="Signed in with a different account"
        formSubheading={`This invite is for ${state.invitation.email}.`}
      >
        <p className="text-center text-sm !text-[#64748B] mb-4">
          You're currently signed in as <strong className="!text-[#0F172A]">{state.signedInEmail}</strong>. Sign out to accept this
          invitation with the right account.
        </p>
        <button className={buttonClass} style={buttonStyle} onClick={handleSignOut}>
          Sign out
        </button>
      </AuthSplitLayout>
    );
  }

  const invitation = state.invitation;
  const nextUrl = `/auth/accept-invite?token=${encodeURIComponent(token)}`;

  if (state.kind === 'existing_account') {
    return (
      <AuthSplitLayout
        headline={<>Join {invitation.workspaceName}</>}
        formHeading="Sign in to accept"
        formSubheading={`You already have an account for ${invitation.email}.`}
      >
        <div className="from__input-box mb-3">
          <label className={labelClass}>Email</label>
          <input className={inputClass} value={invitation.email} disabled />
        </div>
        <div className="from__input-box mb-5">
          <label className={labelClass}>Password</label>
          <div className="form__input relative">
            <input
              className={`${inputClass} pr-11`}
              type={isPasswordVisible ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
            />
            <div
              className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer text-[#94A3B8] hover:text-[#4F46E5] transition-colors"
              onClick={() => setIsPasswordVisible((v) => !v)}
            >
              {isPasswordVisible ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
            </div>
          </div>
        </div>
        <button className={buttonClass} style={buttonStyle} disabled={submitting} onClick={() => handleSignInToAccept(invitation)}>
          {submitting ? 'Joining…' : `Sign in & join ${invitation.workspaceName}`}
        </button>
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-[#E2E8F0]" />
          <span className="text-[13px] font-medium text-[#94A3B8]">or</span>
          <div className="flex-1 h-px bg-[#E2E8F0]" />
        </div>
        <OAuthButtons next={nextUrl} />
      </AuthSplitLayout>
    );
  }

  // new_account
  return (
    <AuthSplitLayout
      headline={<>Join {invitation.workspaceName}</>}
      formHeading="Create your account"
      formSubheading={`You've been invited to join ${invitation.workspaceName} as ${invitation.role}.`}
    >
      <div className="from__input-box mb-3">
        <label className={labelClass}>Email</label>
        <input className={inputClass} value={invitation.email} disabled />
      </div>
      <div className="from__input-box mb-3">
        <label className={labelClass}>Full name</label>
        <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={submitting} />
      </div>
      <div className="from__input-box mb-5">
        <label className={labelClass}>Choose a password</label>
        <div className="form__input relative">
          <input
            className={`${inputClass} pr-11`}
            type={isPasswordVisible ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
          />
          <div
            className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer text-[#94A3B8] hover:text-[#4F46E5] transition-colors"
            onClick={() => setIsPasswordVisible((v) => !v)}
          >
            {isPasswordVisible ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
          </div>
        </div>
      </div>
      <button className={buttonClass} style={buttonStyle} disabled={submitting} onClick={() => handleCreateAccount(invitation)}>
        {submitting ? 'Creating account…' : `Join ${invitation.workspaceName}`}
      </button>
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-[#E2E8F0]" />
        <span className="text-[13px] font-medium text-[#94A3B8]">or</span>
        <div className="flex-1 h-px bg-[#E2E8F0]" />
      </div>
      <OAuthButtons next={nextUrl} />
    </AuthSplitLayout>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteInner />
    </Suspense>
  );
}
