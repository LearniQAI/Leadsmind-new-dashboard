-- Migration: Add audio columns to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS audio_url text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS audio_duration integer;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS transcript text;
