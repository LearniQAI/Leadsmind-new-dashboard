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
      <div className={`w-full bg-white border border-dash-border rounded-lg flex items-center px-3 py-2.5 gap-2 ${disabled || isBuilder ? 'opacity-70 pointer-events-none' : ''}`}>
        <CreditCard size={14} className="!text-dash-textMuted flex-shrink-0" />
        <div className="flex-1 min-w-0">
           <CardElement
            options={{
              style: {
                base: {
                  fontSize: '13px',
                  color: '#0F172A',
                  fontFamily: '"DM Sans", sans-serif',
                  '::placeholder': {
                    color: '#475569',
                  },
                  iconColor: '#475569',
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

      {error && <div className="text-red text-[11px]">{error}</div>}

      {!isBuilder && !disabled && (
        <button
          type="submit"
          disabled={!stripe || processing || disabled}
          className="w-full py-3 bg-dash-accent hover:bg-dash-accent/90 disabled:bg-dash-accent/50 disabled:cursor-not-allowed text-white rounded-lg text-[11px] font-bold transition-colors motion-reduce:transition-none flex items-center justify-center gap-2"
        >
          {processing ? (
            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin motion-reduce:animate-none" />
          ) : (
            <Lock size={12} />
          )}
          {processing ? 'Processing...' : 'Pay now'}
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
      <div className={`p-5 rounded-xl border transition-colors motion-reduce:transition-none ${isBuilder ? 'border-dash-border bg-white' : 'border-dash-accent/30 bg-dash-accent/5'}`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold !text-dash-text flex items-center gap-2">
              <CreditCard size={14} className="text-dash-accent" />
              Secure payment
            </h4>
            <p className="text-[11px] !text-dash-textMuted mt-1">
              Your transaction is secured with 256-bit encryption.
            </p>
          </div>
          <div className="text-right">
            <span className="text-[20px] font-bold !text-dash-text block">
              ${amount.toFixed(2)}
            </span>
            <span className="text-[10px] font-bold !text-dash-textMuted">
              {currency}
            </span>
          </div>
        </div>

        {success ? (
          <div className="p-4 bg-green/10 border border-green/20 rounded-lg text-center">
            <span className="text-green text-sm font-bold block mb-1">Payment successful!</span>
            <span className="text-green/80 text-xs">Your transaction has been securely processed.</span>
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
            <span className="text-[10px] !text-dash-textMuted">Payment elements will render securely on the live form.</span>
          </div>
        )}
      </div>
    </div>
  );
}
