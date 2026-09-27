-- Campaign enqueue as ONE atomic statement, callable only by the service role.
--
-- campaign_dispatch_queue has RLS enabled and deliberately no client policy, but updateCampaign
-- wrote it with the signed-in user's client, so every real user's audience send failed at enqueue
-- ("new row violates row-level security policy"). The fix keeps the table closed to clients: the
-- server action verifies the caller (workspace membership + Marketing module) on the user's own
-- session, then enqueues through this function with the admin client.
--
-- Doing it in one function (one transaction) also removes the partial state the old two-call
-- version could leave (new rows inserted, reschedule of existing rows failed): either every row is
-- queued/rescheduled or nothing changed and the action restores the campaign's previous status.
CREATE OR REPLACE FUNCTION public.enqueue_campaign_recipients(
  p_campaign_id uuid,
  p_workspace_id uuid,
  p_contact_ids uuid[],
  p_scheduled_for timestamptz,
  p_send_immediately boolean
)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  inserted integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM email_campaigns WHERE id = p_campaign_id AND workspace_id = p_workspace_id) THEN
    RAISE EXCEPTION 'campaign % does not belong to workspace %', p_campaign_id, p_workspace_id;
  END IF;

  -- Existing not-yet-sent rows follow the new due time (e.g. a future schedule changed to Send now).
  UPDATE campaign_dispatch_queue
  SET scheduled_for = p_scheduled_for, send_immediately = p_send_immediately, updated_at = NOW()
  WHERE campaign_id = p_campaign_id AND status IN ('pending', 'deferred');

  -- New recipients; an existing (campaign, contact) row is never duplicated or re-sent. Only
  -- contacts of this workspace can be queued.
  INSERT INTO campaign_dispatch_queue (campaign_id, workspace_id, contact_id, status, scheduled_for, send_immediately)
  SELECT p_campaign_id, p_workspace_id, c.id, 'pending', p_scheduled_for, p_send_immediately
  FROM contacts c
  WHERE c.id = ANY(p_contact_ids) AND c.workspace_id = p_workspace_id
  ON CONFLICT (campaign_id, contact_id) DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_campaign_recipients(uuid, uuid, uuid[], timestamptz, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_campaign_recipients(uuid, uuid, uuid[], timestamptz, boolean) TO service_role;
