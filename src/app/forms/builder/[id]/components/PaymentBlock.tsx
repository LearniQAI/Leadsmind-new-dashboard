'use client';

import React, { useState } from 'react';
import { CreditCard, Lock } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

// Using Stripe's public test key for development
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_TYooMQauvdEDq54NiTphI7jx');

interface Props {
  fieldId: string;
  disabled?: boolean;
  isBuilder?: boolean;
  value?: any;
}

function CheckoutForm({ onSuccess, isBuilder, disabled }: { onSuccess: (pm: any) => void; isBuilder?: boolean; disabled?: boolean }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || isBuilder || disabled) {
      return;
    }

    setProcessing(true);
    
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    // Simulate tokenization and validation via Stripe
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    });

    if (error) {
      setError(error.message || 'Payment failed');
      setProcessing(false);
    } else {
      setError(null);
      // Simulate backend processing delay
      setTimeout(() => {
        setProcessing(false);
        onSuccess(paymentMethod);
      }, 1000);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className={`w-full bg-white/5 border border-white/10 rounded-lg flex items-center px-3 py-2.5 gap-2 ${disabled || isBuilder ? 'opacity-70 pointer-events-none' : ''}`}>
        <CreditCard size={14} className="text-[#4a5a82] flex-shrink-0" />
        <div className="flex-1 min-w-0">
           <CardElement
            options={{
              style: {
                base: {
                  fontSize: '13px',
                  color: '#ffffff',
                  fontFamily: '"DM Sans", sans-serif',
                  '::placeholder': {
                    color: '#4a5a82',
                  },
                  iconColor: '#4a5a82',
                },
                invalid: {
                  color: '#ef4444',
                  iconColor: '#ef4444',
                },
              },
            }}
            className="w-full"
          />
        </div>
      </div>
      
      {error && <div className="text-rose-500 text-[11px] font-dm-sans">{error}</div>}

      {!isBuilder && !disabled && (
        <button
          type="submit"
          disabled={!stripe || processing || disabled}
          className="w-full py-3 bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-[#2563eb]/50 disabled:cursor-not-allowed text-white rounded-lg text-[11px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
        >
          {processing ? (
            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Lock size={12} />
          )}
          {processing ? 'Processing...' : 'Pay Now'}
        </button>
      )}
    </form>
  );
}

export function PaymentBlock({ fieldId, disabled, isBuilder, value }: Props) {
  const amount = 99.00;
  const currency = 'USD';
  const [success, setSuccess] = useState(false);

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

        {success ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center">
            <span className="text-emerald-400 text-sm font-bold block mb-1">Payment Successful!</span>
            <span className="text-emerald-400/70 text-xs font-dm-sans">Your transaction has been securely processed.</span>
          </div>
        ) : (
          <Elements stripe={stripePromise}>
            <CheckoutForm 
              isBuilder={isBuilder} 
              disabled={disabled} 
              onSuccess={(pm: any) => {
                setSuccess(true);
              }}
            />
          </Elements>
        )}

        {isBuilder && (
          <div className="text-center pt-3">
            <span className="text-[10px] text-white/30 font-dm-sans">Payment elements will render securely on the live form.</span>
          </div>
        )}
      </div>
    </div>
  );
}
