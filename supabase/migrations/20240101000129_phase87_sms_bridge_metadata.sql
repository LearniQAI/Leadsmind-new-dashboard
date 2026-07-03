-- Migration: Phase 87 - Email to SMS Bridge Metadata
-- Adds lightweight tracking to existing messages table without creating isolated duplicate ledgers

ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS bridge_metadata JSONB DEFAULT '{}'::jsonb;

-- Index for faster lookup when matching inbound SMS replies later
CREATE INDEX IF NOT EXISTS idx_messages_bridge_metadata ON public.messages USING gin (bridge_metadata);
