-- Dedupe marker for the course_expiring automation trigger: records that a
-- given enrollment's upcoming expiry has already been published, so the
-- daily course-expiry cron doesn't re-fire the same enrollment every run.
-- Deliberately separate from expires_at itself (which is real access-expiry
-- data read elsewhere, e.g. the student portal countdown badge) — nulling
-- that out to "dedupe" the way tag-expiry does for tags.expires_at would
-- silently break the actual access-expiry mechanism for this enrollment.
ALTER TABLE public.enrollments
    ADD COLUMN IF NOT EXISTS expiring_notified_at TIMESTAMPTZ;
