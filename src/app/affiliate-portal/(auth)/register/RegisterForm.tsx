'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { applyToProgramme } from '@/app/actions/affiliates';

interface ProgrammeItem {
  id: string;
  name: string;
  commission_value: number;
  commission_type: string;
}

interface RegisterFormProps {
  programmes: ProgrammeItem[];
}

export default function RegisterForm({ programmes }: RegisterFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Default selection from query parameter if present
  const initialProgId = searchParams.get('programmeId') || (programmes.length > 0 ? programmes[0].id : '');
  const parentAffiliateId = searchParams.get('parent') || null;

  const [programmeId, setProgrammeId] = useState(initialProgId);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [answers, setAnswers] = useState({ promoPlan: '' });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programmeId) {
      setError('Please select an affiliate programme.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await applyToProgramme(
        programmeId,
        email,
        password,
        fullName,
        phone,
        answers,
        parentAffiliateId
      );

      if (res.success) {
        setSuccess(true);
      } else {
        setError(res.error || 'Failed to submit application.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during submission.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-slate-900 py-8 px-4 shadow-2xl border border-slate-800 sm:rounded-2xl sm:px-10 text-center max-w-md mx-auto mt-8">
        <div className="w-16 h-16 bg-emerald-950 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
          ✓
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Application Submitted!</h3>
        <p className="text-slate-400 text-sm mb-6">
          Thank you for applying. We have sent a welcome email sequence to <strong>{email}</strong>. Please check your inbox for next steps.
        </p>
        <a
          href="/affiliate-portal/login"
          className="inline-block rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-all"
        >
          Go to Sign In
        </a>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 py-8 px-4 shadow-2xl border border-slate-800 sm:rounded-2xl sm:px-10">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-950/50 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="programme" className="block text-sm font-medium text-slate-300">
            Select Programme
          </label>
          <div className="mt-1">
            <select
              id="programme"
              required
              value={programmeId}
              onChange={(e) => setProgrammeId(e.target.value)}
              className="block w-full rounded-xl border-slate-800 bg-slate-950 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
            >
              <option value="">-- Choose a Programme --</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.commission_value}% {p.commission_type})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-slate-300">
            Full Name
          </label>
          <div className="mt-1">
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="block w-full rounded-xl border-slate-800 bg-slate-950 text-white placeholder-slate-500 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
              placeholder="John Doe"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-300">
            Email Address
          </label>
          <div className="mt-1">
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-xl border-slate-800 bg-slate-950 text-white placeholder-slate-500 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
              placeholder="name@example.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-300">
            Password (for dashboard login)
          </label>
          <div className="mt-1">
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-xl border-slate-800 bg-slate-950 text-white placeholder-slate-500 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
              placeholder="Minimum 6 characters"
              minLength={6}
            />
          </div>
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-slate-300">
            Phone Number (Optional)
          </label>
          <div className="mt-1">
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="block w-full rounded-xl border-slate-800 bg-slate-950 text-white placeholder-slate-500 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
              placeholder="+27 82 123 4567"
            />
          </div>
        </div>

        <div>
          <label htmlFor="promoPlan" className="block text-sm font-medium text-slate-300">
            How do you plan to promote us?
          </label>
          <div className="mt-1">
            <textarea
              id="promoPlan"
              rows={3}
              value={answers.promoPlan}
              onChange={(e) => setAnswers({ ...answers, promoPlan: e.target.value })}
              className="block w-full rounded-xl border-slate-800 bg-slate-950 text-white placeholder-slate-500 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
              placeholder="Briefly describe your marketing channels, website, or network..."
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Submitting Application...' : 'Apply to Programme'}
          </button>
        </div>
      </form>
    </div>
  );
}
