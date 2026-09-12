'use client';

import React, { useState, useEffect } from 'react';
import { getFundsDeclarationByToken, submitFundsDeclaration } from '@/app/actions/propertyDeals';
import {
  ShieldCheck,
  DollarSign,
  CheckCircle,
  AlertCircle,
  FileCheck,
  Building
} from 'lucide-react';
import { toast } from 'sonner';

interface DeclarationData {
  declaration: {
    id: string;
    opportunity_id: string;
    buyer_id: string;
    amount: number;
    status: 'pending' | 'submitted';
    funds_source?: string;
    custom_description?: string;
  };
  buyer: {
    first_name: string;
    last_name: string;
    email?: string;
  };
  deal: {
    title: string;
    value: number;
  };
}

interface FundsDeclarationPageProps {
  params: { token: string };
}

export default function FundsDeclarationPage({ params }: FundsDeclarationPageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DeclarationData | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Form states
  const [fundsSource, setFundsSource] = useState<'savings' | 'inheritance' | 'bank_loan' | 'sale_of_property' | 'other'>('savings');
  const [customDescription, setCustomDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [acceptedFica, setAcceptedFica] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await getFundsDeclarationByToken(params.token);
        if (res.success && res.declaration) {
          setData(res as any);
          setAmount(res.declaration.amount || res.deal?.value || 0);
          setFundsSource((res.declaration.funds_source as any) || 'savings');
          setCustomDescription(res.declaration.custom_description || '');
          if (res.declaration.status === 'submitted') {
            setSubmitted(true);
          }
        } else {
          setError(res.error || 'Invalid secure token.');
        }
      } catch (err: any) {
        setError(err.message || 'Error loading declaration details.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid declaration amount');
      return;
    }
    if (!acceptedFica) {
      toast.error('You must accept the FICA declaration check');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitFundsDeclaration(params.token, {
        fundsSource,
        customDescription: customDescription || undefined,
        amount
      });
      if (res.success) {
        setSubmitted(true);
        toast.success('Funds declaration submitted successfully');
      } else {
        toast.error(res.error || 'Failed to submit declaration');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error submitting declaration');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dash-bg text-dash-text flex items-center justify-center p-6 font-dm-sans">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-dash-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-dash-textMuted">Verifying secure token...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-dash-bg text-dash-text flex items-center justify-center p-6 font-dm-sans">
        <div className="max-w-md w-full bg-white border border-rose-200 rounded-2xl p-8 text-center space-y-4 shadow-lg">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold font-space-grotesk tracking-tight">Form Blocked</h1>
          <p className="text-sm text-dash-textMuted leading-relaxed">
            {error || 'This digital declaration link is invalid or has been revoked.'}
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-dash-bg text-dash-text flex items-center justify-center p-6 font-dm-sans">
        <div className="max-w-md w-full bg-white border border-emerald-200 rounded-2xl p-8 text-center space-y-5 shadow-lg">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold font-space-grotesk tracking-tight">Declaration Received</h1>
            <p className="text-xs text-emerald-700 font-bold font-space-grotesk uppercase tracking-wider bg-emerald-50 py-1 rounded">
              FICA Compliant Statement Logged
            </p>
            <p className="text-sm text-dash-textMuted leading-relaxed">
              Thank you, <strong>{data.buyer.first_name} {data.buyer.last_name}</strong>. Your Source of Funds Declaration for the property transaction <strong>"{data.deal.title}"</strong> has been logged.
            </p>
          </div>
          <div className="pt-2 border-t border-dash-border text-[10px] text-dash-textMuted">
            Submission ID: <span className="font-mono text-[9.5px]">{data.declaration.id}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dash-bg text-dash-text p-6 md:p-12 font-dm-sans flex flex-col justify-between">

      <div className="max-w-2xl w-full mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white border border-dash-border rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-500" />

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-widest font-space-grotesk">
              <FileCheck className="w-4 h-4" /> FICA SA Regulatory Form
            </div>
            <h1 className="text-2xl font-bold font-space-grotesk tracking-tight text-dash-text">
              Source of Funds Digital Declaration
            </h1>
            <p className="text-xs text-dash-textMuted">
              Declarant: <strong className="text-dash-text">{data.buyer.first_name} {data.buyer.last_name}</strong>
            </p>
          </div>

          <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-bold flex items-center gap-1.5 shrink-0 self-start md:self-center">
            <ShieldCheck className="w-4 h-4" /> FIC ACT 38 OF 2001
          </div>
        </div>

        {/* Transaction Summary */}
        <div className="bg-dash-surface border border-dash-border rounded-xl p-4 flex gap-4 items-center">
          <div className="p-3 bg-white border border-dash-border rounded-lg text-dash-accent">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-dash-textMuted uppercase tracking-wider">Associated Property Transaction</h3>
            <p className="text-sm font-bold text-dash-text">{data.deal.title}</p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="bg-white border border-dash-border rounded-2xl p-6 md:p-8 shadow-sm space-y-6">

          {/* Amount field */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-dash-textMuted uppercase tracking-[1.5px] font-space-grotesk block">
              Declared Amount (USD equivalent)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-dash-textMuted">
                <DollarSign className="w-4 h-4" />
              </div>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full h-11 pl-9 pr-4 bg-dash-surface border border-dash-border rounded-lg text-sm text-dash-text focus:outline-none focus:border-emerald-500 font-mono font-bold"
              />
            </div>
            <p className="text-[10px] text-dash-textMuted">
              Please state the amount of funds intended to buy/settle this property transaction.
            </p>
          </div>

          {/* Source dropdown */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-dash-textMuted uppercase tracking-[1.5px] font-space-grotesk block">
              Primary Source of Funds
            </label>
            <select
              value={fundsSource}
              onChange={(e: any) => setFundsSource(e.target.value)}
              className="w-full h-11 px-3 bg-dash-surface border border-dash-border rounded-lg text-xs text-dash-text focus:outline-none focus:border-emerald-500 font-dm-sans"
            >
              <option value="savings">Personal Savings / Accumulated Earnings</option>
              <option value="inheritance">Family Inheritance or Gift</option>
              <option value="bank_loan">Approved Bank Loan or Bond Finance</option>
              <option value="sale_of_property">Proceeds from Sale of Another Property</option>
              <option value="other">Other Legitimate Source (Specify below)</option>
            </select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-dash-textMuted uppercase tracking-[1.5px] font-space-grotesk block">
              Source Explanation & Details
            </label>
            <textarea
              rows={4}
              placeholder="e.g. Funds accumulated via savings over 5 years at Standard Bank, account no. ending 1234."
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              className="w-full p-3 bg-dash-surface border border-dash-border rounded-lg text-xs text-dash-text focus:outline-none focus:border-emerald-500 font-dm-sans resize-none"
            />
          </div>

          {/* Electronic sign check */}
          <div className="pt-4 border-t border-dash-border space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedFica}
                onChange={(e) => setAcceptedFica(e.target.checked)}
                className="mt-0.5 rounded border-dash-border text-emerald-600 focus:ring-0 bg-white w-4 h-4 cursor-pointer"
              />
              <span className="text-xs text-dash-textMuted font-dm-sans leading-relaxed select-none">
                I hereby declare and warrant that the funds used/intended to buy the property in this transaction are derived from legitimate and lawful sources, in full compliance with the <strong>Financial Intelligence Centre Act (FICA)</strong>, 2001.
              </span>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/55 text-white font-bold text-xs font-dm-sans uppercase tracking-[1px] rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'Submitting Declaration...' : 'Submit Official FICA Declaration'}
          </button>

        </form>

      </div>

      {/* Footer */}
      <div className="max-w-2xl w-full mx-auto text-center text-[9px] text-dash-textMuted font-dm-sans py-8">
        This is a regulatory compliance form processed under the Protection of Personal Information Act (POPIA). Your digital signature and IP address are captured for compliance records.
      </div>

    </div>
  );
}
