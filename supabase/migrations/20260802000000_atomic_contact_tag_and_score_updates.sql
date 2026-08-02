-- Fix: apply_tag and update_lead_score (src/lib/automation/actions_registry.ts)
-- both did a non-atomic read-then-write on a shared contacts field
-- (tags / lead_score): SELECT the current value, compute the new value in
-- JS, then UPDATE the whole value back. Two calls for the same contact
-- landing within the same window (now routine since the
-- enroll_contact_in_workflow concurrency fix lets independent workflows
-- for one contact genuinely run in parallel) race: both read the same
-- starting value, and whichever UPDATE commits last silently overwrites
-- the other's change with no error anywhere. Confirmed live: two
-- workflows tagging the same contact ~270ms apart resulted in only the
-- later tag surviving.
--
-- Fix: do the read + mutate + write as a single atomic UPDATE statement
-- (one round trip, one row lock), so there is no window between reading
-- the old value and writing the new one for a concurrent call to land in.
CREATE OR REPLACE FUNCTION public.add_contact_tag_atomic(
    p_contact_id UUID,
    p_workspace_id UUID,
    p_tag TEXT
) RETURNS TEXT[] AS $$
DECLARE
    v_tags TEXT[];
BEGIN
    -- Single atomic append, guarded by the dedupe check in the same
    -- statement -- no other call can observe or write the tags array
    -- between the read implied by the WHERE clause and this write.
    UPDATE public.contacts
    SET tags = array_append(COALESCE(tags, ARRAY[]::TEXT[]), p_tag)
    WHERE id = p_contact_id
      AND workspace_id = p_workspace_id
      AND NOT (p_tag = ANY(COALESCE(tags, ARRAY[]::TEXT[])))
    RETURNING tags INTO v_tags;

    IF v_tags IS NOT NULL THEN
        RETURN v_tags; -- tag newly added
    END IF;

    -- No row matched the UPDATE: either the tag was already present
    -- (no-op, matches prior dedupe behavior) or the contact doesn't
    -- exist in this workspace. Disambiguate with a plain read.
    SELECT tags INTO v_tags
    FROM public.contacts
    WHERE id = p_contact_id AND workspace_id = p_workspace_id;

    RETURN v_tags; -- NULL => contact not found; else existing tags (dedupe no-op)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_contact_lead_score(
    p_contact_id UUID,
    p_points INT
) RETURNS TABLE(found BOOLEAN, new_score INT) AS $$
DECLARE
    v_score INT;
    v_found BOOLEAN := FALSE;
BEGIN
    UPDATE public.contacts
    SET lead_score = COALESCE(lead_score, 0) + p_points
    WHERE id = p_contact_id
    RETURNING lead_score INTO v_score;

    v_found := FOUND;
    RETURN QUERY SELECT v_found, v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
