-- Email Channel — Compose gap fix, Step 0 decision: a real, display-only
-- Subject column on messages.
--
-- A real email genuinely needs a subject line (every other channel doesn't),
-- but this is separable from conversation GROUPING, which stays contact-based
-- (the existing, deliberate decision — matches every other channel, avoids a
-- new subject-threading schema key). This column is purely for display/
-- email-header purposes: it does not participate in any UNIQUE constraint,
-- any conversation lookup, or any dedupe logic.
--
-- Populated by:
--  - Inbound email (handleInboundWorkspaceEmail) — the sender's real subject.
--  - Outbound Compose — the agent's typed subject, defaulting to
--    "New message from {workspace name}" if left blank.
--  - Every other existing send path leaves it NULL (unchanged behavior).

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS subject TEXT;

COMMENT ON COLUMN public.messages.subject IS
  'Display-only email subject line. NULL for every non-email message and for '
  'email replies that do not carry their own subject. Never used for '
  'conversation grouping/threading — that stays contact-based.';
