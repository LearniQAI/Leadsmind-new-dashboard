'use client';

import React, { useState, useTransition } from 'react';
import { User, Lock, Mail, Phone, Info, ShieldAlert, Download, Trash2, Languages, Bell, Eye, EyeOff } from 'lucide-react';
import { updatePortalProfile, updatePortalPassword, requestEmailChange, requestCopyOfData, requestAccountDeletion } from '@/app/actions/portal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProfileClientProps {
  contact: any;
}

export default function ProfileClient({ contact }: ProfileClientProps) {
  const [firstName, setFirstName] = useState(contact.first_name || '');
  const [lastName, setLastName] = useState(contact.last_name || '');
  const [phone, setPhone] = useState(contact.phone || '');
  const [company, setCompany] = useState(contact.company || '');
  const [language, setLanguage] = useState(contact.language || 'EN');
  
  // Notification preferences state
  const defaultPrefs = {
    billing_email: true,
    billing_whatsapp: false,
    marketing_email: true,
    marketing_whatsapp: false,
    support_email: true,
    support_whatsapp: true,
    ...(contact.notification_preferences || {})
  };
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>(defaultPrefs);

  // Email change request states
  const [newEmail, setNewEmail] = useState('');
  const [emailRequested, setEmailRequested] = useState(false);

  // Password states
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Deletion request states
  const [confirmDeletionOpen, setConfirmDeletionOpen] = useState(false);
  const [deletionRequested, setDeletionRequested] = useState(contact.deletion_requested || false);

  const [isPending, startTransition] = useTransition();

  const handleUpdatePrefs = (key: string) => {
    setNotifPrefs(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First Name and Last Name are required.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await updatePortalProfile({
          firstName,
          lastName,
          phone,
          company,
          language,
          notificationPreferences: notifPrefs
        });
        if (res.success) {
          toast.success("Profile details and notification preferences saved successfully.");
        } else {
          toast.error(res.error || "Failed to update profile.");
        }
      } catch (err: any) {
        toast.error("Error saving profile details: " + err.message);
      }
    });
  };

  const handleEmailChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes('@')) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (newEmail.toLowerCase().trim() === contact.email.toLowerCase().trim()) {
      toast.error("New email is identical to your current email address.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await requestEmailChange(newEmail);
        if (res.success) {
          toast.success(`Verification link dispatched to: ${newEmail}. Please confirm via the link.`);
          setEmailRequested(true);
          setNewEmail('');
        } else {
          toast.error(res.error || "Failed to submit email update request.");
        }
      } catch (err: any) {
        toast.error("Error requesting email change: " + err.message);
      }
    });
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await updatePortalPassword(password);
        if (res.success) {
          toast.success("Portal access password updated successfully.");
          setPassword('');
          setConfirmPassword('');
        } else {
          toast.error(res.error || "Failed to save password.");
        }
      } catch (err: any) {
        toast.error("Error saving password details: " + err.message);
      }
    });
  };

  const handleRequestDataCopy = async () => {
    toast.info("Compiling POPIA Subject Access Report...", { duration: 2500 });
    startTransition(async () => {
      try {
        const res = await requestCopyOfData();
        if (res.success) {
          toast.success("Success! POPIA SAR Report dispatched directly to your inbox.");
        } else {
          toast.error(res.error || "Failed to generate report.");
        }
      } catch (err: any) {
        toast.error("Data Copy Error: " + err.message);
      }
    });
  };

  const handleConfirmDeletion = async () => {
    setConfirmDeletionOpen(false);
    startTransition(async () => {
      try {
        const res = await requestAccountDeletion();
        if (res.success) {
          toast.success("POPIA Account Erasure Request successfully filed.");
          setDeletionRequested(true);
        } else {
          toast.error(res.error || "Failed to request deletion.");
        }
      } catch (err: any) {
        toast.error("Deletion request error: " + err.message);
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* ── LEFT 2 COLUMNS: PROFILE DETAILS, EMAILS, NOTIFICATIONS ── */}
      <div className="lg:col-span-2 space-y-8 text-left">
        
        {/* Account Settings form */}
        <div className="bg-white border border-dash-border rounded-[28px] p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
          
          <h3 className="text-sm font-bold uppercase tracking-wider text-dash-text mb-6 flex items-center gap-2">
            <User size={16} className="text-dash-accent" /> Account Details
          </h3>

          <form onSubmit={handleSaveProfile} className="space-y-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-dash-textMuted font-mono">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full bg-dash-surface border border-dash-border rounded-xl px-4 py-2.5 text-xs outline-none focus:border-dash-accent text-dash-text"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-dash-textMuted font-mono">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full bg-dash-surface border border-dash-border rounded-xl px-4 py-2.5 text-xs outline-none focus:border-dash-accent text-dash-text"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-dash-textMuted font-mono flex items-center gap-1">
                  <Phone size={12} /> Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+27 82 123 4567"
                  className="w-full bg-dash-surface border border-dash-border rounded-xl px-4 py-2.5 text-xs outline-none focus:border-dash-accent text-dash-text font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-dash-textMuted font-mono flex items-center gap-1">
                  <Languages size={12} /> Language Preference (POPIA)
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-dash-surface border border-dash-border rounded-xl px-4 py-2.5 text-xs outline-none focus:border-dash-accent text-dash-text"
                >
                  <option value="EN">English (EN)</option>
                  <option value="AF">Afrikaans (AF)</option>
                  <option value="ZU">isiZulu (ZU)</option>
                  <option value="XH">isiXhosa (XH)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-dash-textMuted font-mono">
                Company Name
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Enter company name"
                className="w-full bg-dash-surface border border-dash-border rounded-xl px-4 py-2.5 text-xs outline-none focus:border-dash-accent text-dash-text"
              />
            </div>

            {/* Granular Notification preferences matrix */}
            <div className="space-y-3 pt-4 border-t border-dash-border">
              <span className="text-[10px] font-bold uppercase tracking-widest text-dash-textMuted font-mono flex items-center gap-1.5">
                <Bell size={13} className="text-purple-500" /> Notification Matrix
              </span>
              
              <div className="bg-dash-surface border border-dash-border rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-dash-border bg-dash-surface text-[9px] font-black uppercase tracking-widest text-dash-textMuted">
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3 text-center">Email</th>
                      <th className="px-5 py-3 text-center">WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dash-border">
                    <tr>
                      <td className="px-5 py-3.5 font-semibold text-dash-textMuted">Billing Updates (Invoices / Receipts)</td>
                      <td className="px-5 py-3.5 text-center">
                        <input 
                          type="checkbox" 
                          checked={notifPrefs.billing_email} 
                          onChange={() => handleUpdatePrefs('billing_email')}
                          className="accent-blue-500"
                        />
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <input 
                          type="checkbox" 
                          checked={notifPrefs.billing_whatsapp} 
                          onChange={() => handleUpdatePrefs('billing_whatsapp')}
                          className="accent-blue-500"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3.5 font-semibold text-dash-textMuted">Marketing Notices (Announcements / Offers)</td>
                      <td className="px-5 py-3.5 text-center">
                        <input 
                          type="checkbox" 
                          checked={notifPrefs.marketing_email} 
                          onChange={() => handleUpdatePrefs('marketing_email')}
                          className="accent-blue-500"
                        />
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <input 
                          type="checkbox" 
                          checked={notifPrefs.marketing_whatsapp} 
                          onChange={() => handleUpdatePrefs('marketing_whatsapp')}
                          className="accent-blue-500"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3.5 font-semibold text-dash-textMuted">Support Desk (Replies / Status Alerts)</td>
                      <td className="px-5 py-3.5 text-center">
                        <input 
                          type="checkbox" 
                          checked={notifPrefs.support_email} 
                          onChange={() => handleUpdatePrefs('support_email')}
                          className="accent-blue-500"
                        />
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <input 
                          type="checkbox" 
                          checked={notifPrefs.support_whatsapp} 
                          onChange={() => handleUpdatePrefs('support_whatsapp')}
                          className="accent-blue-500"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="h-11 px-8 rounded-xl bg-dash-accent hover:bg-dash-accent/90 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-md"
              >
                {isPending ? "Saving..." : "Save Details & Prefs"}
              </button>
            </div>
          </form>
        </div>

        {/* Secure Email change flow panel */}
        <div className="bg-white border border-dash-border rounded-[28px] p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

          <h3 className="text-sm font-bold uppercase tracking-wider text-dash-text mb-5 flex items-center gap-2">
            <Mail size={16} className="text-purple-500" /> Secure Email Adjustment
          </h3>

          <form onSubmit={handleEmailChangeRequest} className="space-y-4 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-dash-textMuted font-mono">
                  Current Email (Login User)
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 text-dash-textMuted w-4 h-4" />
                  <input
                    type="email"
                    value={contact.email}
                    disabled
                    className="w-full bg-dash-surface border border-dash-border rounded-xl pl-11 pr-4 py-2.5 text-xs outline-none text-dash-textMuted cursor-not-allowed font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-dash-textMuted font-mono">
                  New Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 text-dash-accent w-4 h-4" />
                  <input
                    type="email"
                    placeholder="Enter new email address"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    className="w-full bg-dash-surface border border-dash-border rounded-xl pl-11 pr-4 py-2.5 text-xs outline-none focus:border-dash-accent text-dash-text font-mono"
                  />
                </div>
              </div>
            </div>

            {emailRequested && (
              <div className="bg-dash-surface border border-dash-border p-4 rounded-xl flex gap-3 text-[10.5px] text-dash-textMuted leading-relaxed">
                <Info size={14} className="shrink-0 text-dash-accent mt-0.5" />
                <span>
                  Check the inbox of your new email. Click the verification link inside to finalize the switch.
                </span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className="h-10 px-6 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white text-[9.5px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-md"
              >
                Request Email Switch
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── RIGHT COLUMN: PORTAL PASSWORD & POPIA REGULATORY TOOLS ── */}
      <div className="space-y-8 text-left">
        
        {/* Security Password Card */}
        <div className="bg-white border border-dash-border rounded-[28px] p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />

          <h3 className="text-sm font-bold uppercase tracking-wider text-dash-text mb-5 flex items-center gap-2">
            <Lock size={16} className="text-purple-500" /> Portal Password
          </h3>

          <form onSubmit={handlePasswordUpdate} className="space-y-4 relative z-10">
            <div className="bg-dash-surface border border-dash-border p-4 rounded-2xl flex gap-3 text-[10.5px] text-dash-textMuted leading-relaxed">
              <Info size={14} className="text-dash-accent shrink-0 mt-0.5" />
              <span>
                Set a password to enable traditional credentials sign in alongside magic links.
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-dash-textMuted font-mono">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-dash-surface border border-dash-border rounded-xl px-4 py-2.5 text-xs outline-none focus:border-dash-accent text-dash-text"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-3 text-dash-textMuted hover:text-dash-text"
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-dash-textMuted font-mono">
                Confirm Password
              </label>
              <input
                type={showPass ? "text" : "password"}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-dash-surface border border-dash-border rounded-xl px-4 py-2.5 text-xs outline-none focus:border-dash-accent text-dash-text"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-dash-accent hover:bg-dash-accent/90 disabled:opacity-50 text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-11 transition-all active:scale-95"
            >
              Update Password
            </button>
          </form>
        </div>

        {/* POPIA regulatory tools card */}
        <div className="bg-white border border-dash-border rounded-[28px] p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />

          <h3 className="text-sm font-bold uppercase tracking-wider text-dash-text mb-4 flex items-center gap-2">
            <ShieldAlert size={16} className="text-rose-500" /> POPIA Privacy Toolkit
          </h3>

          <p className="text-[11px] text-dash-textMuted leading-relaxed mb-5">
            Under the South African Protection of Personal Information Act (POPIA), clients hold legal rights to verify, request copies, or request erasure of personal data.
          </p>

          <div className="space-y-3 relative z-10">
            {/* Download Copy Button */}
            <button
              onClick={handleRequestDataCopy}
              disabled={isPending}
              className="w-full bg-dash-surface hover:bg-dash-accent/10 border border-dash-border text-dash-text rounded-xl uppercase tracking-wider text-[9.5px] font-black h-11 flex items-center justify-center gap-2 transition-colors active:scale-95 disabled:opacity-50"
            >
              <Download size={14} className="text-dash-accent" /> Request Data Copy
            </button>

            {/* Request Deletion Button */}
            {deletionRequested ? (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-center text-[10px] font-bold uppercase tracking-wider">
                Erasure Request Pending (30 Days)
              </div>
            ) : (
              <button
                onClick={() => setConfirmDeletionOpen(true)}
                disabled={isPending}
                className="w-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-xl uppercase tracking-wider text-[9.5px] font-black h-11 flex items-center justify-center gap-2 transition-colors active:scale-95 disabled:opacity-50"
              >
                <Trash2 size={14} className="text-rose-600" /> Request Account Deletion
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── CONFIRM ACCOUNT ERASURE WARNING OVERLAY MODAL ── */}
      {confirmDeletionOpen && (
        <div className="fixed inset-0 bg-[#000000c1] backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white border border-dash-border rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="p-5 border-b border-dash-border flex justify-between items-center bg-dash-surface">
              <div className="flex items-center gap-2 text-rose-600">
                <ShieldAlert size={18} />
                <h4 className="text-sm font-bold uppercase font-space">Erasure Right Warning</h4>
              </div>
              <button
                onClick={() => setConfirmDeletionOpen(false)}
                className="text-dash-textMuted hover:text-dash-text"
              >
                ✕
              </button>
            </div>

            {/* Warning Details Body */}
            <div className="p-6 text-xs text-dash-textMuted leading-relaxed text-left space-y-4 font-sans">
              <p>
                Please read this compliance details regarding account deletion under South African Protection of Personal Information Act rules:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-dash-textMuted">
                <li>An internal workflow is filed for business operators to anonymize your personal details (first/last names, phone, email) within 30 days.</li>
                <li><strong>SARS Compliance Retention:</strong> Financial transaction history (invoice numbers, receipts, payments) will be preserved as required by South African revenue ledger rules.</li>
                <li>This action is permanent and you will lose access to course enrollments and bookings.</li>
              </ul>
              <p className="font-bold text-dash-text uppercase text-[9.5px] tracking-wide mt-2">
                Are you sure you wish to submit this erasure request?
              </p>
            </div>

            {/* Actions Footer */}
            <div className="p-5 bg-dash-surface border-t border-dash-border flex justify-end gap-3">
              <button 
                onClick={() => setConfirmDeletionOpen(false)}
                className="h-10 px-4 rounded-xl bg-white border border-dash-border hover:bg-dash-border/40 text-dash-text text-[9.5px] font-black uppercase tracking-wider transition-colors"
              >
                No, Keep Account
              </button>
              <button 
                onClick={handleConfirmDeletion}
                className="h-10 px-6 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[9.5px] font-black uppercase tracking-wider transition-colors shadow-lg shadow-rose-500/10 active:scale-95"
              >
                Confirm Erasure Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
