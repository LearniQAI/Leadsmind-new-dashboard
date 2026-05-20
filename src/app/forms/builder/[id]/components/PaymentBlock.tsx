'use client';

import React from 'react';
import { CreditCard, Lock } from 'lucide-react';

interface Props {
  fieldId: string;
  disabled?: boolean;
  isBuilder?: boolean;
  value?: any; // To store transaction status
}

export function PaymentBlock({ fieldId, disabled, isBuilder, value }: Props) {
  // In a real implementation, this would connect to Stripe Elements or PayFast widgets.
  // For Sprint 6, we scaffold the UI and the transactional state handling.

  const amount = 99.00; // This should come from field config
  const currency = 'USD'; // This should come from field config

  return (
    <div className="w-full">
      <div className={`p-5 rounded-xl border ${isBuilder ? 'border-white/10 bg-[#080f28]/95' : 'border-[#2563eb]/30 bg-[#2563eb]/5'} transition-all`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className="text-sm font-space-grotesk font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <CreditCard size={14} className="text-[#2563eb]" />
              Secure Payment
            </h4>
            <p className="text-[11px] text-[#4a5a82] font-dm-sans mt-1">
              Your transaction is secured with 256-bit encryption.
            </p>
          </div>
          <div className="text-right">
            <span className="text-[20px] font-space-grotesk font-black text-white block">
              ${amount.toFixed(2)}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">
              {currency}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="w-full h-10 bg-white/5 border border-white/10 rounded-lg flex items-center px-3 gap-2 opacity-70">
            <CreditCard size={14} className="text-[#4a5a82]" />
            <span className="text-[13px] text-[#4a5a82] font-dm-sans flex-1">Card number</span>
            <span className="text-[11px] text-[#4a5a82] font-dm-sans uppercase">MM/YY CVC</span>
          </div>
          
          {!isBuilder && !disabled && (
            <button
              type="button"
              className="w-full py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg text-[11px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
              onClick={() => alert('Payment Processing Mock: Transaction Successful')}
            >
              <Lock size={12} /> Pay Now
            </button>
          )}

          {isBuilder && (
            <div className="text-center pt-2">
              <span className="text-[10px] text-white/30 font-dm-sans">Payment elements will render securely on the live form.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
