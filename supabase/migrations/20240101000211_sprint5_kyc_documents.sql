-- Migration: Sprint 5 KYC Document Storage, Encryption & Retention
-- File: supabase/migrations/20260620000000_sprint5_kyc_documents.sql

-- 1. Create the public.kyc_documents table
CREATE TABLE IF NOT EXISTS public.kyc_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    file_url TEXT NOT NULL,
    expiry_date TIMESTAMPTZ,
    retention_delete_after TIMESTAMPTZ NOT NULL,
    encryption_iv TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_document_type CHECK (document_type IN ('green_id', 'smart_id', 'passport', 'utility_bill'))
);

-- Enable Row Level Security (RLS) on public.kyc_documents
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

-- 2. Configure RLS Policies for public.kyc_documents
DROP POLICY IF EXISTS "Users can view workspace KYC documents" ON public.kyc_documents;
CREATE POLICY "Users can view workspace KYC documents"
  ON public.kyc_documents FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM public.workspace_members WHERE workspace_id = kyc_documents.workspace_id
  ));

DROP POLICY IF EXISTS "Users can insert workspace KYC documents" ON public.kyc_documents;
CREATE POLICY "Users can insert workspace KYC documents"
  ON public.kyc_documents FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT user_id FROM public.workspace_members WHERE workspace_id = kyc_documents.workspace_id
  ));

DROP POLICY IF EXISTS "Users can update workspace KYC documents" ON public.kyc_documents;
CREATE POLICY "Users can update workspace KYC documents"
  ON public.kyc_documents FOR UPDATE
  USING (auth.uid() IN (
    SELECT user_id FROM public.workspace_members WHERE workspace_id = kyc_documents.workspace_id
  ));

DROP POLICY IF EXISTS "Users can delete workspace KYC documents" ON public.kyc_documents;
CREATE POLICY "Users can delete workspace KYC documents"
  ON public.kyc_documents FOR DELETE
  USING (auth.uid() IN (
    SELECT user_id FROM public.workspace_members WHERE workspace_id = kyc_documents.workspace_id
  ));

-- 3. Register the 'kyc-documents' private storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'kyc-documents', 
    'kyc-documents', 
    FALSE, 
    15728640, -- 15MB
    '{"application/pdf", "image/png", "image/jpeg", "image/jpg", "application/octet-stream"}'
)
ON CONFLICT (id) DO UPDATE SET 
    public = FALSE,
    file_size_limit = 15728640,
    allowed_mime_types = '{"application/pdf", "image/png", "image/jpeg", "image/jpg", "application/octet-stream"}';

-- Setup Storage policies for kyc-documents bucket
DROP POLICY IF EXISTS "Allow authenticated users to read KYC documents" ON storage.objects;
CREATE POLICY "Allow authenticated users to read KYC documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'kyc-documents');

DROP POLICY IF EXISTS "Allow authenticated users to insert KYC documents" ON storage.objects;
CREATE POLICY "Allow authenticated users to insert KYC documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'kyc-documents');

-- 4. Create trigger to set document retention on insert (precisely 5 years out)
CREATE OR REPLACE FUNCTION public.set_kyc_document_retention()
RETURNS TRIGGER AS $$
BEGIN
  -- retention delete block calculated precisely 5 years out
  NEW.retention_delete_after := COALESCE(NEW.created_at, now()) + INTERVAL '5 years';
  
  -- auto set default expiry_date for utility bills (Proof of Address) to 3 months from now
  IF NEW.document_type = 'utility_bill' AND NEW.expiry_date IS NULL THEN
    NEW.expiry_date := COALESCE(NEW.created_at, now()) + INTERVAL '3 months';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_set_kyc_document_retention ON public.kyc_documents;
CREATE TRIGGER tr_set_kyc_document_retention
    BEFORE INSERT ON public.kyc_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.set_kyc_document_retention();

-- 5. Create trigger to prevent hard database deletion for 5 years
CREATE OR REPLACE FUNCTION public.check_kyc_document_retention()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.retention_delete_after > now() THEN
    RAISE EXCEPTION 'FICA Compliance Violation: Cannot delete KYC document before the retention period expires (delete blocked until %).', OLD.retention_delete_after;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_prevent_kyc_document_deletion ON public.kyc_documents;
CREATE TRIGGER tr_prevent_kyc_document_deletion
    BEFORE DELETE ON public.kyc_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.check_kyc_document_retention();

-- 6. Create monitoring alert routine for document expiries
CREATE OR REPLACE FUNCTION public.monitor_kyc_document_expiries()
RETURNS TABLE (
  doc_id UUID,
  contact_name TEXT,
  workspace_id UUID
) AS $$
DECLARE
    v_doc RECORD;
    v_owner_id UUID;
    v_contact_name TEXT;
    v_admin_id UUID;
BEGIN
    FOR v_doc IN
        SELECT d.id as doc_id, d.workspace_id, d.contact_id, c.first_name, c.last_name 
        FROM public.kyc_documents d
        JOIN public.contacts c ON d.contact_id = c.id
        WHERE d.document_type = 'utility_bill' 
          AND d.expiry_date < now()
    LOOP
        -- Get workspace owner ID
        SELECT owner_id INTO v_owner_id
        FROM public.workspaces
        WHERE id = v_doc.workspace_id;

        v_contact_name := v_doc.first_name || ' ' || COALESCE(v_doc.last_name, '');

        -- Create notification for owner if not exists in past 7 days
        IF NOT EXISTS (
            SELECT id FROM public.notifications 
            WHERE user_id = v_owner_id 
              AND type = 'system' 
              AND title = 'FICA Document Expired'
              AND message LIKE '%' || v_contact_name || '%'
              AND created_at > now() - INTERVAL '7 days'
        ) THEN
            IF v_owner_id IS NOT NULL THEN
                INSERT INTO public.notifications (workspace_id, user_id, type, title, message, link)
                VALUES (
                    v_doc.workspace_id,
                    v_owner_id,
                    'system',
                    'FICA Document Expired',
                    'Proof of Address utility bill for ' || v_contact_name || ' has expired (exceeded 3 months old). Please request a fresh document.',
                    '/contacts/' || v_doc.contact_id
                );
            END IF;

            -- Create for admins
            FOR v_admin_id IN 
                SELECT user_id FROM public.workspace_members 
                WHERE workspace_id = v_doc.workspace_id AND role = 'admin' AND user_id != COALESCE(v_owner_id, gen_random_uuid())
            LOOP
                INSERT INTO public.notifications (workspace_id, user_id, type, title, message, link)
                VALUES (
                    v_doc.workspace_id,
                    v_admin_id,
                    'system',
                    'FICA Document Expired',
                    'Proof of Address utility bill for ' || v_contact_name || ' has expired (exceeded 3 months old). Please request a fresh document.',
                    '/contacts/' || v_doc.contact_id
                );
            END LOOP;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
