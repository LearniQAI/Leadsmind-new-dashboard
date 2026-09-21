-- EMERGENCY: fn_execute_segment_sql was callable by the public anon key.
--
-- The function is SECURITY DEFINER, returns SETOF public.contacts (every column)
-- and is exposed over PostgREST RPC. It was never REVOKEd, so PUBLIC / anon /
-- authenticated all held EXECUTE (live ACL: {=X/postgres,anon=X/postgres,
-- authenticated=X/postgres,...}). Confirmed live 2026-09-21: an anonymous call
-- (public anon key, no session) returned the full contact rows of a workspace the
-- caller has no access to. The earlier comment claiming the function was "not
-- deployed" / "nothing calls it" was wrong: SegmentationCompiler.executeSegment()
-- calls it (via the service-role admin client) for email/SMS/WhatsApp campaigns,
-- auto-senders and the Segments page counts.
--
-- Three independent layers, so no single one is load-bearing:
--  1. GRANTS   — only service_role (the backend) may execute it.
--  2. ROLE     — the function itself refuses any caller that is not the service
--                role or a DB operator, so a future accidental re-GRANT is not
--                enough to reopen it.
--  3. RESULT   — the query result is filtered to the workspace in p_params[1].
--                The anchored-prefix shape check below only pins the START of the
--                query ("... WHERE c.workspace_id = $1"), so a crafted suffix such
--                as "... OR true" would previously have returned every workspace.
--                Wrapping the final query makes cross-workspace rows impossible
--                regardless of what the SQL string contains.
--
-- Note for callers: authenticated end-users deliberately do NOT get access. The
-- app never calls this from a user session; it always goes through the admin
-- client after requireWorkspaceAccess() has established the workspace.

CREATE OR REPLACE FUNCTION public.fn_execute_segment_sql(
  p_sql TEXT,
  p_params TEXT[]
)
RETURNS SETOF public.contacts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized TEXT;
  final_sql TEXT;
  i INT;
  jwt_role TEXT;
  v_ws UUID;
BEGIN
  -- Layer 2: caller must be the backend (service_role JWT) or a DB operator.
  jwt_role := COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
  IF jwt_role <> 'service_role' AND session_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'fn_execute_segment_sql: not authorized' USING ERRCODE = '42501';
  END IF;

  -- The workspace this query is scoped to must be a valid uuid in $1.
  IF p_params IS NULL OR array_length(p_params, 1) IS NULL OR p_params[1] IS NULL THEN
    RAISE EXCEPTION 'fn_execute_segment_sql: workspace id parameter ($1) is required';
  END IF;
  BEGIN
    v_ws := p_params[1]::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'fn_execute_segment_sql: $1 must be a workspace uuid';
  END;

  normalized := upper(regexp_replace(trim(p_sql), '\s+', ' ', 'g'));

  -- 1. Whitelist the exact top-level shape SegmentationCompiler.compileToSql()
  --    always produces. Anything else is rejected outright, regardless of
  --    what follows.
  IF normalized !~ '^SELECT DISTINCT C\.\* FROM PUBLIC\.CONTACTS C WHERE C\.WORKSPACE_ID = \$1' THEN
    RAISE EXCEPTION 'fn_execute_segment_sql: query does not match the expected shape (SELECT DISTINCT c.* FROM public.contacts c WHERE c.workspace_id = $1 ...)';
  END IF;

  -- 2. No statement stacking.
  IF p_sql LIKE '%;%' THEN
    RAISE EXCEPTION 'fn_execute_segment_sql: statement stacking (;) is not permitted';
  END IF;

  -- 3. No DML/DDL/session/procedural keywords anywhere in the string,
  --    including inside subqueries -- belt-and-suspenders on top of #1.
  IF normalized ~ '\y(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|GRANT|REVOKE|CREATE|EXECUTE|CALL|COPY|VACUUM|REINDEX|SET|RESET|DO|MERGE|INTO)\y' THEN
    RAISE EXCEPTION 'fn_execute_segment_sql: disallowed keyword detected';
  END IF;

  -- 4. Subqueries may only reference the tables compileToSql() actually
  --    joins against. Any other public.<table> reference is rejected.
  IF normalized ~ 'PUBLIC\.(?!CONTACTS\y|INVOICES\y|ENROLLMENTS\y|EMAIL_TRACKING_LOGS\y)[A-Z_]+' THEN
    RAISE EXCEPTION 'fn_execute_segment_sql: query references a table outside the allowed set (contacts, invoices, enrollments, email_tracking_logs)';
  END IF;

  -- Parameters are substituted as quote_literal()'d SQL literals (see the
  -- original migration for why USING cannot be used with a dynamic-length
  -- array). Highest index first so "$1" never corrupts "$10".
  final_sql := p_sql;
  FOR i IN REVERSE array_length(p_params, 1)..1 LOOP
    final_sql := replace(final_sql, '$' || i, quote_literal(p_params[i]));
  END LOOP;

  -- Layer 3: only ever return rows of the workspace in $1, whatever the SQL says.
  -- (newline before the closing paren so a trailing "--" comment cannot swallow it)
  RETURN QUERY EXECUTE
    'SELECT q.* FROM (' || final_sql || E'\n) q WHERE q.workspace_id = $1'
    USING v_ws;
END;
$$;

-- Layer 1: grants. CREATE OR REPLACE preserves the old ACL, so this must come after.
REVOKE ALL ON FUNCTION public.fn_execute_segment_sql(text, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_execute_segment_sql(text, text[]) TO service_role;

COMMENT ON FUNCTION public.fn_execute_segment_sql(TEXT, TEXT[]) IS
  'Executes a SegmentationCompiler-generated contact-segment query. BACKEND ONLY: SECURITY DEFINER, service_role-only grants, in-function role check, and a result filter pinning output to the workspace in $1. Do NOT grant to anon/authenticated. Called by SegmentationCompiler.executeSegment() via the admin client for campaigns, auto-senders and Segments counts.';
