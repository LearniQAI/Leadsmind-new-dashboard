-- Add critical composite and GIN indexes
-- NOTE: CONCURRENTLY removed for Supabase dashboard compatibility
-- (SQL editor runs inside a transaction block which blocks CONCURRENTLY)
-- These are safe to run on live database — IF NOT EXISTS prevents duplicates

-- Composite index: contacts lookup by workspace + email
-- Speeds up: contact search, deduplication checks
CREATE INDEX IF NOT EXISTS contacts_workspace_email_idx
  ON contacts(workspace_id, email);

-- GIN index: contacts tag array search
-- Speeds up: bulk tag operations, tag filtering
CREATE INDEX IF NOT EXISTS contacts_tags_gin_idx
  ON contacts USING GIN(tags);

-- Composite index: contact activities by contact + date
-- Speeds up: contact detail page activity feed
CREATE INDEX IF NOT EXISTS contact_activities_idx
  ON contact_activities(contact_id, created_at DESC);

-- Composite index: enrollments by contact + course
-- Speeds up: checking if contact is enrolled in a course
CREATE INDEX IF NOT EXISTS enrollments_contact_course_idx
  ON enrollments(contact_id, course_id);

-- Composite index: enrollments by status
-- Speeds up: LMS dashboard enrollment stats
CREATE INDEX IF NOT EXISTS enrollments_status_idx
  ON enrollments(status);

-- Partial index: active/scheduled campaigns
-- Speeds up: campaign dispatch cron job
CREATE INDEX IF NOT EXISTS campaigns_status_idx
  ON email_campaigns(status, scheduled_for)
  WHERE status IN ('scheduled', 'sending');

-- Composite index: messages by conversation + date
-- Speeds up: loading conversation message history
CREATE INDEX IF NOT EXISTS messages_convo_idx
  ON messages(conversation_id, created_at DESC);

-- Partial index: active automations by workspace
-- Speeds up: automation trigger evaluation
CREATE INDEX IF NOT EXISTS automations_workspace_active_idx
  ON automation_workflows(workspace_id)
  WHERE is_active = true;

-- NOTE: IF NOT EXISTS prevents errors on re-run.
-- To monitor index build progress:
-- SELECT * FROM pg_stat_progress_create_index;