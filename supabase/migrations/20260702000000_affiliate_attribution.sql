-- Migration: Affiliate Attribution and Commission Extensions

-- Part A: Contacts attribution columns
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS referred_by_affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE SET NULL;

ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS referred_programme_id UUID REFERENCES public.affiliate_programmes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_referred_by_affiliate ON public.contacts(referred_by_affiliate_id);

-- Part C: Commission config on affiliate_programmes
ALTER TABLE public.affiliate_programmes
ADD COLUMN IF NOT EXISTS listed_in_marketplace BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.affiliate_programmes
ADD COLUMN IF NOT EXISTS commission_config JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.affiliate_commissions
ADD COLUMN IF NOT EXISTS ip_hash TEXT;

-- Part G: Onboarding email queue
CREATE TABLE IF NOT EXISTS public.affiliate_email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE CASCADE,
    email_type TEXT NOT NULL, -- 'day1', 'day3', 'day7'
    send_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_email_queue_status_send ON public.affiliate_email_queue(status, send_at);

-- RLS
ALTER TABLE public.affiliate_email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view their own email queue"
ON public.affiliate_email_queue FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.affiliates a
    WHERE a.id = affiliate_id
  )
);

CREATE POLICY "Service role full access to email queue"
ON public.affiliate_email_queue FOR ALL USING (true);
