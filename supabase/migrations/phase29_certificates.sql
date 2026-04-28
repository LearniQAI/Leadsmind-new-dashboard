-- Phase 29: Certificate Design & Verification Architecture

-- 1. Certificate Templates Table
CREATE TABLE IF NOT EXISTS lms_certificate_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    name TEXT NOT NULL,
    bg_color TEXT DEFAULT '#ffffff',
    text_color TEXT DEFAULT '#0a0a0a',
    accent_color TEXT DEFAULT '#6c47ff',
    border_style TEXT DEFAULT 'solid',
    logo_url TEXT,
    signature_url TEXT,
    base64_background TEXT, -- Optional custom background
    layout_config JSONB DEFAULT '{
        "student_pos": {"x": 50, "y": 45},
        "course_pos": {"x": 50, "y": 55},
        "date_pos": {"x": 20, "y": 80},
        "qr_pos": {"x": 80, "y": 80}
    }',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Link Quizzes to Templates
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lms_quizzes' AND column_name='certificate_template_id') THEN
        ALTER TABLE lms_quizzes ADD COLUMN certificate_template_id UUID REFERENCES lms_certificate_templates(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Enhance Certificates for Public Discovery
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lms_certificates' AND column_name='template_snapshot') THEN
        ALTER TABLE lms_certificates ADD COLUMN template_snapshot JSONB; -- Store design state at issuance
    END IF;
END $$;
