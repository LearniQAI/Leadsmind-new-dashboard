'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Mail, KeyRound, User, Bell, ShieldCheck } from 'lucide-react';
import { DashCard, DashButton } from '@/components/dashboard-ui';
import { DashFormField, DashInput } from '@/components/dashboard-ui/FormField';
import { Switch } from '@/components/ui/switch';
import { updateStudentName, updateStudentNotificationPref } from '@/app/actions/studentSettings';
import { updatePassword } from '@/app/actions/account';
import { forgotPassword } from '@/app/actions/auth';

interface Props {
  settings: {
    email: string;
    firstName: string;
    lastName: string;
    workspaceContactCount: number;
    courseUpdatesEmail: boolean;
  };
}

function SectionHead({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="border-b border-dash-border px-5 py-4">
      <h2 className="flex items-center gap-2 font-display text-[14px] font-semibold tracking-[-0.01em] !text-dash-text">
        <span className="!text-dash-accent [&_svg]:size-4">{icon}</span>
        {title}
      </h2>
      {sub && <p className="mt-1 text-[12px] leading-relaxed !text-dash-textMuted">{sub}</p>}
    </div>
  );
}

export default function StudentSettingsClient({ settings }: Props) {
  const router = useRouter();

  // ---- Name ----
  const [firstName, setFirstName] = useState(settings.firstName);
  const [lastName, setLastName] = useState(settings.lastName);
  const [savingName, startSaveName] = useTransition();
  const nameDirty =
    firstName.trim() !== settings.firstName.trim() || lastName.trim() !== settings.lastName.trim();

  const saveName = () =>
    startSaveName(async () => {
      const res = await updateStudentName({ firstName, lastName });
      if (res.error) toast.error(res.error);
      else {
        toast.success('Name updated.');
        router.refresh();
      }
    });

  // ---- Password ----
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confPw, setConfPw] = useState('');
  const [savingPw, startSavePw] = useTransition();
  const [sendingLink, startSendLink] = useTransition();

  const savePassword = () =>
    startSavePw(async () => {
      if (newPw.length < 8) {
        toast.error('New password must be at least 8 characters.');
        return;
      }
      if (newPw !== confPw) {
        toast.error("New passwords don't match.");
        return;
      }
      const res = await updatePassword({
        currentPassword: curPw,
        newPassword: newPw,
        confirmPassword: confPw,
      });
      if (res.success) {
        toast.success('Password updated.');
        setCurPw('');
        setNewPw('');
        setConfPw('');
      } else {
        toast.error(res.error || 'Could not update password.');
      }
    });

  const sendResetLink = () =>
    startSendLink(async () => {
      await forgotPassword(settings.email);
      toast.success(`If ${settings.email} is registered, a reset link is on its way.`);
    });

  // ---- Notifications ----
  const [courseUpdates, setCourseUpdates] = useState(settings.courseUpdatesEmail);
  const [savingPref, startSavePref] = useTransition();

  const toggleCourseUpdates = (next: boolean) => {
    setCourseUpdates(next);
    startSavePref(async () => {
      const res = await updateStudentNotificationPref({ courseUpdatesEmail: next });
      if (res.error) {
        toast.error(res.error);
        setCourseUpdates(!next); // revert
      } else {
        toast.success('Preference saved.');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Profile */}
      <DashCard padding="none" interactive={false}>
        <SectionHead
          icon={<User />}
          title="Profile"
          sub={
            settings.workspaceContactCount > 1
              ? `Your name is shown on your dashboard, in the course player, and on your certificates. It's kept in sync across all ${settings.workspaceContactCount} of your enrolled workspaces.`
              : "Your name is shown on your dashboard, in the course player, and on your certificates."
          }
        />
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DashFormField label="First name" htmlFor="s-first" required>
              <DashInput
                id="s-first"
                value={firstName}
                maxLength={80}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
              />
            </DashFormField>
            <DashFormField label="Last name" htmlFor="s-last">
              <DashInput
                id="s-last"
                value={lastName}
                maxLength={80}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
              />
            </DashFormField>
          </div>
          <div className="flex justify-end">
            <DashButton
              type="button"
              onClick={saveName}
              disabled={!nameDirty || savingName || !firstName.trim()}
            >
              {savingName ? <Loader2 className="size-4 animate-spin" /> : null}
              Save changes
            </DashButton>
          </div>
        </div>
      </DashCard>

      {/* Account */}
      <DashCard padding="none" interactive={false}>
        <SectionHead icon={<ShieldCheck />} title="Account" />
        <div className="divide-y divide-dash-border">
          {/* Email (read-only) */}
          <div className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[13px] font-semibold !text-dash-text">
                <Mail className="size-4 !text-dash-textMuted" /> Email
              </div>
              <p className="mt-1 truncate text-[13px] !text-dash-textMuted">{settings.email}</p>
            </div>
            <span className="shrink-0 rounded-full bg-dash-surface px-2.5 py-1 text-[11px] font-semibold !text-dash-textMuted">
              Contact support to change
            </span>
          </div>

          {/* Password */}
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-2 text-[13px] font-semibold !text-dash-text">
              <KeyRound className="size-4 !text-dash-textMuted" /> Password
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <DashFormField label="Current password" htmlFor="s-cur">
                <DashInput
                  id="s-cur"
                  type="password"
                  autoComplete="current-password"
                  value={curPw}
                  onChange={(e) => setCurPw(e.target.value)}
                />
              </DashFormField>
              <DashFormField label="New password" htmlFor="s-new" hint="At least 8 characters">
                <DashInput
                  id="s-new"
                  type="password"
                  autoComplete="new-password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                />
              </DashFormField>
              <DashFormField label="Confirm new password" htmlFor="s-conf">
                <DashInput
                  id="s-conf"
                  type="password"
                  autoComplete="new-password"
                  value={confPw}
                  onChange={(e) => setConfPw(e.target.value)}
                />
              </DashFormField>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <DashButton
                type="button"
                variant="ghost"
                onClick={sendResetLink}
                disabled={sendingLink}
              >
                {sendingLink ? <Loader2 className="size-4 animate-spin" /> : null}
                Email me a reset link
              </DashButton>
              <DashButton
                type="button"
                onClick={savePassword}
                disabled={savingPw || !newPw || !confPw}
              >
                {savingPw ? <Loader2 className="size-4 animate-spin" /> : null}
                Update password
              </DashButton>
            </div>
          </div>
        </div>
      </DashCard>

      {/* Notifications */}
      <DashCard padding="none" interactive={false}>
        <SectionHead icon={<Bell />} title="Notifications" />
        <div className="flex items-center justify-between gap-6 p-5">
          <div className="min-w-0">
            <div className="text-[13px] font-semibold !text-dash-text">
              New content in my enrolled courses
            </div>
            <p className="mt-1 text-[12px] leading-relaxed !text-dash-textMuted">
              Email me when an instructor adds new lessons or materials to a course I'm
              enrolled in.
            </p>
          </div>
          <Switch
            checked={courseUpdates}
            disabled={savingPref}
            onCheckedChange={toggleCourseUpdates}
            aria-label="Email me about new content in my enrolled courses"
          />
        </div>
      </DashCard>
    </div>
  );
}
