-- Migration: phase70_blog_layouts.sql
-- Add layout and South African Local SEO columns to blog_posts and blog_settings

-- 1. Alter public.blog_posts table
ALTER TABLE public.blog_posts 
ADD COLUMN IF NOT EXISTS layout_style TEXT CHECK (layout_style IN ('magazine', 'minimal', 'editorial', 'knowledge', 'video', 'newsletter')),
ADD COLUMN IF NOT EXISTS header_style TEXT CHECK (header_style IN ('sticky-slim', 'transparent-hero', 'category-bar', 'centred-classic', 'split-banner')),
ADD COLUMN IF NOT EXISTS sidebar_style TEXT CHECK (sidebar_style IN ('standard', 'compact', 'sticky-toc', 'lead-gen', 'floating-share', 'none')),
ADD COLUMN IF NOT EXISTS lead_capture_style TEXT CHECK (lead_capture_style IN ('newsletter', 'exit-intent', 'inline', 'none')),
ADD COLUMN IF NOT EXISTS sa_province TEXT,
ADD COLUMN IF NOT EXISTS sa_city TEXT,
ADD COLUMN IF NOT EXISTS sa_area TEXT;

-- 2. Alter public.blog_settings table
ALTER TABLE public.blog_settings 
ADD COLUMN IF NOT EXISTS layout_style TEXT DEFAULT 'minimal' CHECK (layout_style IN ('magazine', 'minimal', 'editorial', 'knowledge', 'video', 'newsletter')),
ADD COLUMN IF NOT EXISTS header_style TEXT DEFAULT 'sticky-slim' CHECK (header_style IN ('sticky-slim', 'transparent-hero', 'category-bar', 'centred-classic', 'split-banner')),
ADD COLUMN IF NOT EXISTS sidebar_style TEXT DEFAULT 'standard' CHECK (sidebar_style IN ('standard', 'compact', 'sticky-toc', 'lead-gen', 'floating-share', 'none')),
ADD COLUMN IF NOT EXISTS lead_capture_style TEXT DEFAULT 'newsletter' CHECK (lead_capture_style IN ('newsletter', 'exit-intent', 'inline', 'none')),
ADD COLUMN IF NOT EXISTS sa_province TEXT,
ADD COLUMN IF NOT EXISTS sa_city TEXT,
ADD COLUMN IF NOT EXISTS sa_area TEXT;
