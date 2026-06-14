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
        <div className="bg-[var(--n800)] border border-[var(--bdr)] rounded-[28px] p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
          
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--t1)] mb-6 flex items-center gap-2">
            <User size={16} className="text-blue-400" /> Account Details
          </h3>

          <form onSubmit={handleSaveProfile} className="space-y-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#4a5a82] font-mono">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full bg-[#111d47]/50 border border-white/5 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500 text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#4a5a82] font-mono">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full bg-[#111d47]/50 border border-white/5 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#4a5a82] font-mono flex items-center gap-1">
                  <Phone size={12} /> Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+27 82 123 4567"
                  className="w-full bg-[#111d47]/50 border border-white/5 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500 text-white font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#4a5a82] font-mono flex items-center gap-1">
                  <Languages size={12} /> Language Preference (POPIA)
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-[#111d47]/50 border border-white/5 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500 text-[#eef2ff]"
                >
                  <option value="EN">English (EN)</option>
                  <option value="AF">Afrikaans (AF)</option>
                  <option value="ZU">isiZulu (ZU)</option>
                  <option value="XH">isiXhosa (XH)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#4a5a82] font-mono">
                Company Name
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Enter company name"
                className="w-full bg-[#111d47]/50 border border-white/5 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500 text-white"
              />
            </div>

            {/* Granular Notification preferences matrix */}
            <div className="space-y-3 pt-4 border-t border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#4a5a82] font-mono flex items-center gap-1.5">
                <Bell size={13} className="text-[#8b5cf6]" /> Notification Matrix
              </span>
              
              <div className="bg-[#04091a]/30 border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.01] text-[9px] font-black uppercase tracking-widest text-[#4a5a82]">
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3 text-center">Email</th>
                      <th className="px-5 py-3 text-center">WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <tr>
                      <td className="px-5 py-3.5 font-semibold text-[#94a3c8]">Billing Updates (Invoices / Receipts)</td>
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
                      <td className="px-5 py-3.5 font-semibold text-[#94a3c8]">Marketing Notices (Announcements / Offers)</td>
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
                      <td className="px-5 py-3.5 font-semibold text-[#94a3c8]">Support Desk (Replies / Status Alerts)</td>
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
                className="h-11 px-8 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-md"
              >
                {isPending ? "Saving..." : "Save Details & Prefs"}
              </button>
            </div>
          </form>
        </div>

        {/* Secure Email change flow panel */}
        <div className="bg-[var(--n800)] border border-[var(--bdr)] rounded-[28px] p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--t1)] mb-5 flex items-center gap-2">
            <Mail size={16} className="text-purple-400" /> Secure Email Adjustment
          </h3>

          <form onSubmit={handleEmailChangeRequest} className="space-y-4 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#4a5a82] font-mono">
                  Current Email (Login User)
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 text-[#4a5a82] w-4 h-4" />
                  <input
                    type="email"
                    value={contact.email}
                    disabled
                    className="w-full bg-[#111d47]/20 border border-white/5 rounded-xl pl-11 pr-4 py-2.5 text-xs outline-none text-[#4a5a82] cursor-not-allowed font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#4a5a82] font-mono">
                  New Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 text-blue-400 w-4 h-4" />
                  <input
                    type="email"
                    placeholder="Enter new email address"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    className="w-full bg-[#111d47]/50 border border-white/5 rounded-xl pl-11 pr-4 py-2.5 text-xs outline-none focus:border-blue-500 text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {emailRequested && (
              <div className="bg-[#111d47]/20 border border-white/5 p-4 rounded-xl flex gap-3 text-[10.5px] text-[#94a3c8] leading-relaxed">
                <Info size={14} className="shrink-0 text-blue-400 mt-0.5" />
                <span>
                  Check the inbox of your new email. Click the verification link inside to finalize the switch.
                </span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className="h-10 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-[9.5px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-md"
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
        <div className="bg-[var(--n800)] border border-[var(--bdr)] rounded-[28px] p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />

          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--t1)] mb-5 flex items-center gap-2">
            <Lock size={16} className="text-[#8b5cf6]" /> Portal Password
          </h3>

          <form onSubmit={handlePasswordUpdate} className="space-y-4 relative z-10">
            <div className="bg-[#111d47]/10 border border-white/5 p-4 rounded-2xl flex gap-3 text-[10.5px] text-[#94a3c8] leading-relaxed">
              <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
              <span>
                Set a password to enable traditional credentials sign in alongside magic links.
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#4a5a82] font-mono">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-[#111d47]/50 border border-white/5 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500 text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-3 text-[#4a5a82] hover:text-white"
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#4a5a82] font-mono">
                Confirm Password
              </label>
              <input
                type={showPass ? "text" : "password"}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-[#111d47]/50 border border-white/5 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500 text-white"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-11 transition-all active:scale-95"
            >
              Update Password
            </button>
          </form>
        </div>

        {/* POPIA regulatory tools card */}
        <div className="bg-[var(--n800)] border border-[var(--bdr)] rounded-[28px] p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />

          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--t1)] mb-4 flex items-center gap-2">
            <ShieldAlert size={16} className="text-rose-400" /> POPIA Privacy Toolkit
          </h3>

          <p className="text-[11px] text-[var(--t3)] leading-relaxed mb-5">
            Under the South African Protection of Personal Information Act (POPIA), clients hold legal rights to verify, request copies, or request erasure of personal data.
          </p>

          <div className="space-y-3 relative z-10">
            {/* Download Copy Button */}
            <button
              onClick={handleRequestDataCopy}
              disabled={isPending}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/5 text-[#eef2ff] rounded-xl uppercase tracking-wider text-[9.5px] font-black h-11 flex items-center justify-center gap-2 transition-colors active:scale-95 disabled:opacity-50"
            >
              <Download size={14} className="text-blue-400" /> Request Data Copy
            </button>

            {/* Request Deletion Button */}
            {deletionRequested ? (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-center text-[10px] font-bold uppercase tracking-wider">
                Erasure Request Pending (30 Days)
              </div>
            ) : (
              <button
                onClick={() => setConfirmDeletionOpen(true)}
                disabled={isPending}
                className="w-full bg-red-500/5 hover:bg-red-500/15 border border-red-500/10 text-red-400 rounded-xl uppercase tracking-wider text-[9.5px] font-black h-11 flex items-center justify-center gap-2 transition-colors active:scale-95 disabled:opacity-50"
              >
                <Trash2 size={14} className="text-red-400" /> Request Account Deletion
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── CONFIRM ACCOUNT ERASURE WARNING OVERLAY MODAL ── */}
      {confirmDeletionOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-[#080f28] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#0b1329]/50">
              <div className="flex items-center gap-2 text-red-400">
                <ShieldAlert size={18} />
                <h4 className="text-sm font-bold uppercase font-space">Erasure Right Warning</h4>
              </div>
              <button 
                onClick={() => setConfirmDeletionOpen(false)}
                className="text-[#4a5a82] hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Warning Details Body */}
            <div className="p-6 text-xs text-white/70 leading-relaxed text-left space-y-4 font-sans">
              <p>
                Please read this compliance details regarding account deletion under South African Protection of Personal Information Act rules:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-[#94a3c8]">
                <li>An internal workflow is filed for business operators to anonymize your personal details (first/last names, phone, email) within 30 days.</li>
                <li><strong>SARS Compliance Retention:</strong> Financial transaction history (invoice numbers, receipts, payments) will be preserved as required by South African revenue ledger rules.</li>
                <li>This action is permanent and you will lose access to course enrollments and bookings.</li>
              </ul>
              <p className="font-bold text-white uppercase text-[9.5px] tracking-wide mt-2">
                Are you sure you wish to submit this erasure request?
              </p>
            </div>

            {/* Actions Footer */}
            <div className="p-5 bg-[#0b1329]/50 border-t border-white/5 flex justify-end gap-3">
              <button 
                onClick={() => setConfirmDeletionOpen(false)}
                className="h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[9.5px] font-black uppercase tracking-wider transition-colors"
              >
                No, Keep Account
              </button>
              <button 
                onClick={handleConfirmDeletion}
                className="h-10 px-6 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[9.5px] font-black uppercase tracking-wider transition-colors shadow-lg shadow-red-500/10 active:scale-95"
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
