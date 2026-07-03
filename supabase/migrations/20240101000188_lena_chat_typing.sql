-- Migration: Add agent_typing_until to lena_conversations
ALTER TABLE public.lena_conversations
ADD COLUMN IF NOT EXISTS agent_typing_until timestamptz;
