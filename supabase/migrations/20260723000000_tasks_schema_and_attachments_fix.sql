-- Fixes two confirmed schema gaps in the Tasks/Kanban module, found via a
-- live audit (tasks.md):
--
-- 1. `tasks.created_by`/`tasks.sort_order` were defined in migration
--    20240101000080 (phase46_tasks_kanban)'s `CREATE TABLE IF NOT EXISTS
--    tasks (...)`, but an EARLIER migration (20240101000078,
--    phase45_automation_email_parity) had already created `public.tasks`
--    with a narrower column set. IF NOT EXISTS silently no-op'd phase46's
--    richer definition — the same "earlier same-named table shadows a
--    later, richer one" bug class already found for `quotes` in crm.md #14.
--    `created_by` is what createTask's insert has always tried to write
--    (breaking every task creation with a schema-cache error); `sort_order`
--    is what getTasks()'s ORDER BY and updateTaskStatus()'s drag-and-drop
--    reorder have always tried to read/write.
--
-- 2. `task_attachments` was never created by any migration at all (not even
--    the shadowed phase46 one, which didn't define it either) — confirmed
--    live via a direct query, and previously confirmed the same way in
--    security-remediation.md's Priority 4 pass. Attachments have been
--    completely non-functional (not just insecure) since the feature's
--    code was written. Created here with the same per-task RLS pattern
--    already proven live on this table's siblings (task_activities,
--    task_comments).

-- 1. Restore the shadowed tasks columns
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id);
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 2. Create task_attachments (columns match tasks.ts's uploadTaskAttachment
-- insert and getTaskDetails's `attachments:task_attachments(*, uploader:users(...))` embed exactly)
CREATE TABLE IF NOT EXISTS public.task_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    file_path TEXT NOT NULL,
    uploaded_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON public.task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_workspace_id ON public.task_attachments(workspace_id);

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- Same per-task-workspace-membership pattern already live on task_activities/task_comments.
DROP POLICY IF EXISTS "Workspace access for task_attachments" ON public.task_attachments;
CREATE POLICY "Workspace access for task_attachments" ON public.task_attachments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_attachments.task_id
            AND public.check_workspace_access(tasks.workspace_id)
        )
    );

-- 3. Storage RLS for the 'task-attachments' bucket (already exists, was
-- public — separately flipped to private via the Storage admin API in this
-- same pass, since a public bucket makes createSignedUrl's access control
-- meaningless: anyone with a guessed/leaked path could hit the public
-- object URL directly, bypassing every app-layer check). Without these
-- policies, a private bucket would reject even the legitimate
-- session-scoped (non-admin) client tasks.ts uses for upload/remove/sign.
-- Path shape is `${workspaceId}/${taskId}/${random}.${ext}` (set by
-- uploadTaskAttachment), so storage.foldername(name)[1] is the workspace id
-- — same pattern already proven live for the 'support-ticket-files' bucket.
DROP POLICY IF EXISTS "Workspace members can read task attachments" ON storage.objects;
CREATE POLICY "Workspace members can read task attachments"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'task-attachments' AND
        auth.uid() IN (
            SELECT user_id FROM public.workspace_members
            WHERE workspace_id::text = (storage.foldername(name))[1]
        )
    );

DROP POLICY IF EXISTS "Workspace members can insert task attachments" ON storage.objects;
CREATE POLICY "Workspace members can insert task attachments"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'task-attachments' AND
        auth.uid() IN (
            SELECT user_id FROM public.workspace_members
            WHERE workspace_id::text = (storage.foldername(name))[1]
        )
    );

DROP POLICY IF EXISTS "Workspace members can delete task attachments" ON storage.objects;
CREATE POLICY "Workspace members can delete task attachments"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'task-attachments' AND
        auth.uid() IN (
            SELECT user_id FROM public.workspace_members
            WHERE workspace_id::text = (storage.foldername(name))[1]
        )
    );
