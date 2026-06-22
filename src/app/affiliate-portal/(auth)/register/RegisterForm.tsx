"use client";

import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { applyToProgramme } from '@/app/actions/affiliates';

interface ProgrammeItem {
  id: string;
  name: string;
  commission_value: number;
  commission_type: string;
  registration_settings?: {
    logo_url?: string;
    headline?: string;
    benefits?: string[];
    custom_questions?: { id: string; label: string; required?: boolean }[];
    terms?: string;
  };
}
interface Props {
  programmes: ProgrammeItem[];
}

export default function RegisterForm({ programmes }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialId = searchParams.get('programmeId') || (programmes[0]?.id ?? '');
  const parentAffiliateId = searchParams.get('parent') || null;

  const [programmeId, setProgrammeId] = useState(initialId);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const prog = programmes.find((p) => p.id === programmeId);
  const rs = prog?.registration_settings || {};
  const commissionLabel = prog
    ? (prog.commission_type === 'fixed' ? `Earn R${prog.commission_value} per sale`
       : `Earn ${prog.commission_value}% commission`)
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!programmeId) { setError('Please select a programme.'); return; }
    if (rs.terms && !agreed) { setError('Please accept the terms to continue.'); return; }
    const missing = (rs.custom_questions || []).find((q) => q.required && !answers[q.id]?.trim());
    if (missing) { setError(`Please answer: ${missing.label}`); return; }
    setLoading(true);
    
    const res: any = await applyToProgramme(programmeId, {
      email,
      password,
      full_name: fullName,
      phone,
      answers,
      parentAffiliateId
    } as any);
    
    setLoading(false);
    if (res?.success === false) { setError(res.error || 'Registration failed.'); return; }
    setDone(true);
  };

  if (done) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center p-8 rounded-2xl bg-white shadow">
        <h2 className="text-xl font-bold text-emerald-600">Application received</h2>
        <p className="mt-2 text-slate-600">We'll review your application and email you once it's approved.</p>
        <div className="mt-6">
          <a
            href="/affiliate-portal/login"
            className="inline-block rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-all"
          >
            Go to Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-10 mb-16">
      {/* Branded header */}
      <div className="rounded-t-2xl bg-slate-900 text-white p-7 text-center">
        {rs.logo_url
          ? <img src={rs.logo_url} alt="" className="h-10 mx-auto mb-3 object-contain" />
          : null}
        <h1 className="text-2xl font-bold">{rs.headline || 'Join our affiliate programme'}</h1>
        {commissionLabel && (
          <span className="inline-block mt-3 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-sm font-semibold">
            {commissionLabel}
          </span>
        )}
      </div>

      {/* Benefits */}
      {(rs.benefits?.length ?? 0) > 0 && (
        <div className="bg-slate-50 px-7 py-4 border-x border-slate-200">
          <ul className="space-y-1.5">
            {rs.benefits!.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="text-emerald-500 mt-0.5">✓</span><span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-b-2xl shadow px-7 py-6 space-y-4 border-x border-b border-slate-200">
        {programmes.length > 1 && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Programme</label>
            <select value={programmeId} onChange={(e) => setProgrammeId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900">
              {programmes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
        <Field label="Full name" value={fullName} onChange={setFullName} required />
        <Field label="Email" value={email} onChange={setEmail} type="email" required />
        <Field label="Phone" value={phone} onChange={setPhone} />
        <Field label="Password" value={password} onChange={setPassword} type="password" required />

        {(rs.custom_questions || []).map((q) => (
          <Field key={q.id} label={q.label + (q.required ? ' *' : '')}
            value={answers[q.id] || ''} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />
        ))}

        {rs.terms && (
          <label className="flex items-start gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
            <span>{rs.terms}</span>
          </label>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full py-2.5 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50">
          {loading ? 'Submitting…' : 'Apply to join'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required = false }:
  { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input type={type} value={value} required={required} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20" />
    </div>
  );
}
