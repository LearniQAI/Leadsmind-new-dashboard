'use client';

import React, { useTransition } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { createCoursePayFastCheckout } from '@/app/actions/courseCommerce';
import { toast } from 'sonner';

interface BuyCourseButtonProps {
  courseId: string;
  price: number;
}

export default function BuyCourseButton({ courseId, price }: BuyCourseButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleBuy = () => {
    startTransition(async () => {
      try {
        const res = await createCoursePayFastCheckout(courseId);
        if (res.error) {
          toast.error(res.error);
          return;
        }
        if (res.url) {
          toast.success('Redirecting to PayFast checkout...');
          window.location.href = res.url;
        } else {
          toast.error('Failed to generate checkout link.');
        }
      } catch (err: any) {
        toast.error(err.message || 'An unexpected error occurred.');
      }
    });
  };

  return (
    <button
      onClick={handleBuy}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 px-5 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-95 ml-auto shadow-lg shadow-blue-500/10"
    >
      {isPending ? (
        <>
          <Loader2 size={12} className="animate-spin" /> Processing...
        </>
      ) : (
        <>
          Buy Now (R {price.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}) <CreditCard size={12} />
        </>
      )}
    </button>
  );
}
