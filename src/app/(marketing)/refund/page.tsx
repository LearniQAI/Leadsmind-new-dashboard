import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import RefundContent from './_components/RefundContent';

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy',
  description: 'How refunds and cancellations work for LeadsMind subscription plans, course purchases, and paid bookings.',
  alternates: { canonical: '/refund' },
};

export default async function RefundPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <RefundContent user={user} />;
}
