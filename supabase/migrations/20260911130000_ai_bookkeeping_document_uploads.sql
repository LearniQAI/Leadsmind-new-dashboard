-- AI Bookkeeping (Session A) — document upload storage + async processing job queue.
--
-- Storage/encryption reuses the exact real KYC/employee-document pattern
-- (src/lib/storage/encryptedDocuments.ts, AES-256-GCM, KYC_ENCRYPTION_KEY) rather than
-- inventing new crypto. Deliberately created WITHOUT bucket-wide 'authenticated'
-- storage.objects policies from the start — that exact mistake was made and then had to
-- be fixed twice already in this codebase (kyc-documents:
-- 20260827000000_lockdown_financial_kyc_identity_tables.sql, employee-documents:
-- 20260907140000_hr_employee_documents.sql + 20260907150000_employee_documents_storage_lockdown.sql).
-- This bucket is only ever touched by API routes using createAdminClient() (service_role),
-- so no client-facing storage.objects policy is needed at all.
--
-- The job queue mirrors the real email_queue / lms_delayed_actions shape (pending ->
-- processing -> done|failed, optimistic-lock claim via conditional UPDATE, attempts +
-- error_message columns) rather than a new queue mechanism — see
-- libs/infra/src/queues/email-queue.ts for the precedent this follows.

CREATE TABLE IF NOT EXISTS public.financial_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id),
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  document_kind TEXT NOT NULL DEFAULT 'other' CHECK (document_kind IN ('bank_statement', 'receipt', 'invoice', 'other')),
  -- uploaded: stored, not yet picked up by the worker
  -- processing: worker has claimed it
  -- processed: worker extracted what it could (extracted_text populated where applicable)
  -- password_protected: worker hit an encrypted-PDF error, waiting on POST .../unlock
  -- failed: worker gave up (e.g. unsupported format) — error_message explains why, never silent
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'processed', 'password_protected', 'failed')),
  error_message TEXT,
  -- Raw text-layer extraction result, if any — Session A stores this for Phase 2/3 to consume
  -- later; no categorization/transaction-row parsing happens in this session.
  extracted_text TEXT,
  encryption_iv TEXT NOT NULL,
  encryption_auth_tag TEXT NOT NULL,
  encryption_algorithm TEXT NOT NULL DEFAULT 'aes-256-gcm',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS financial_documents_workspace_id_idx ON public.financial_documents(workspace_id);
CREATE INDEX IF NOT EXISTS financial_documents_status_idx ON public.financial_documents(status);

DROP TRIGGER IF EXISTS update_financial_documents_updated_at ON public.financial_documents;
CREATE TRIGGER update_financial_documents_updated_at BEFORE UPDATE ON public.financial_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.financial_documents ENABLE ROW LEVEL SECURITY;

-- Workspace-membership backstop, same convention as employee_documents — real access
-- control (role checks) happens in the API routes via requireWorkspaceRole().
DROP POLICY IF EXISTS "workspace members manage financial_documents" ON public.financial_documents;
CREATE POLICY "workspace members manage financial_documents"
  ON public.financial_documents FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE TABLE IF NOT EXISTS public.document_processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.financial_documents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS document_processing_jobs_status_idx ON public.document_processing_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS document_processing_jobs_document_id_idx ON public.document_processing_jobs(document_id);

ALTER TABLE public.document_processing_jobs ENABLE ROW LEVEL SECURITY;
-- No user-facing policy: written only via the admin client from the upload route and the
-- cron worker, same as message_dispatch_queue / whatsapp_dispatch_queue.

-- Register the private 'financial-documents' storage bucket. Same size cap and allowed
-- MIME types convention as kyc-documents/employee-documents, extended with the
-- spreadsheet/XLSX type this feature's upload UI accepts (per the PRD).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'financial-documents',
    'financial-documents',
    FALSE,
    15728640, -- 15MB, matches kyc-documents / employee-documents
    '{"application/pdf", "image/png", "image/jpeg", "image/jpg", "text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/octet-stream"}'
)
ON CONFLICT (id) DO UPDATE SET
    public = FALSE,
    file_size_limit = 15728640,
    allowed_mime_types = '{"application/pdf", "image/png", "image/jpeg", "image/jpg", "text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/octet-stream"}';

-- Deliberately NO storage.objects policies for 'financial-documents' — see header comment.
-- Only src/app/api/finance/documents/* (service-role admin client) ever touches this bucket.
