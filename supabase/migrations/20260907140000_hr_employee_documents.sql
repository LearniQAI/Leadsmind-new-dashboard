-- Task 46: employee document/attachment upload.
-- Reuses the real KYC encrypted-storage pattern (AES-256-GCM, contacts/{id}/... path
-- convention) adapted for employees, rather than inventing new storage logic. A separate
-- bucket + table from kyc_documents/kyc-documents on purpose: KYC/FICA documents carry
-- compliance-specific semantics (retention triggers, consent-gating, document_type CHECK
-- constraint tied to regulatory document classes) that don't apply to general employee
-- records (contracts, certifications, ID copies) and shouldn't be conflated with them.
-- The shared piece is the encryption mechanism (src/lib/storage/encryptedDocuments.ts),
-- not the bucket or table.

CREATE TABLE IF NOT EXISTS public.employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  -- Free-text, not an enum -- a fixed category taxonomy (contract/ID/certification/...)
  -- would need real product input on what the categories should be; a simple optional
  -- label is enough for this pass and doesn't lock in a wrong list later.
  category TEXT,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  encryption_iv TEXT NOT NULL,
  encryption_auth_tag TEXT NOT NULL,
  encryption_algorithm TEXT NOT NULL DEFAULT 'aes-256-gcm',
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS employee_documents_workspace_id_idx ON public.employee_documents(workspace_id);
CREATE INDEX IF NOT EXISTS employee_documents_employee_id_idx ON public.employee_documents(employee_id);

ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

-- Same workspace-membership-backstop convention as schedules/warnings/terminations
-- (20260907120000_hr_schedules_warnings_terminations.sql) -- real enforcement (role checks,
-- self-access scoping) happens in the API routes via requireWorkspaceRole(), same as the
-- rest of the HR module; this RLS is the defense-in-depth floor under it.
DROP POLICY IF EXISTS "workspace members manage employee_documents" ON public.employee_documents;
CREATE POLICY "workspace members manage employee_documents"
  ON public.employee_documents FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- Guard rail, same as warnings/schedule-reassignment in the Task 44 hardening pass: no new
-- documents for a terminated employee (still-existing documents remain visible/downloadable).
CREATE OR REPLACE FUNCTION public.block_document_for_terminated_employee()
RETURNS TRIGGER AS $$
DECLARE
    v_status TEXT;
BEGIN
    SELECT status INTO v_status FROM public.employees WHERE id = NEW.employee_id;
    IF v_status = 'terminated' THEN
        RAISE EXCEPTION 'Cannot upload a document for a terminated employee';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_block_document_for_terminated_employee ON public.employee_documents;
CREATE TRIGGER trg_block_document_for_terminated_employee
    BEFORE INSERT ON public.employee_documents
    FOR EACH ROW EXECUTE FUNCTION public.block_document_for_terminated_employee();

-- Register the private 'employee-documents' storage bucket. Same size cap and allowed MIME
-- types as the existing kyc-documents bucket (20240101000211_sprint5_kyc_documents.sql) --
-- no stated reason employee documents need different limits, so match rather than invent.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'employee-documents',
    'employee-documents',
    FALSE,
    15728640, -- 15MB, matches kyc-documents
    '{"application/pdf", "image/png", "image/jpeg", "image/jpg", "application/octet-stream"}'
)
ON CONFLICT (id) DO UPDATE SET
    public = FALSE,
    file_size_limit = 15728640,
    allowed_mime_types = '{"application/pdf", "image/png", "image/jpeg", "image/jpg", "application/octet-stream"}';

-- Same storage.objects policy shape as kyc-documents: bucket-wide for the 'authenticated'
-- role as a fallback safety net, while the real access control happens in the API routes
-- (which use the service-role admin client and check workspace membership + role before
-- ever touching storage).
DROP POLICY IF EXISTS "Allow authenticated users to read employee documents" ON storage.objects;
CREATE POLICY "Allow authenticated users to read employee documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'employee-documents');

DROP POLICY IF EXISTS "Allow authenticated users to insert employee documents" ON storage.objects;
CREATE POLICY "Allow authenticated users to insert employee documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'employee-documents');

DROP POLICY IF EXISTS "Allow authenticated users to delete employee documents" ON storage.objects;
CREATE POLICY "Allow authenticated users to delete employee documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'employee-documents');
