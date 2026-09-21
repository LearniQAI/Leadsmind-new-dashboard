-- Segment "Has tag" rule now reads tag_assignments (the source of truth) instead of the
-- legacy contacts.tags array, so SegmentationCompiler.compileToSql() emits an EXISTS
-- over public.tag_assignments JOIN public.tags. fn_execute_segment_sql only permits a
-- fixed set of tables (defense-in-depth against arbitrary SQL), so those two tables must
-- be added to the whitelist or the RPC rejects the query and the JS fallback silently runs.
--
-- Backward compatible: this ONLY widens the allowed-table list. Everything else is the
-- CURRENT guarded definition from 20260921000001, unchanged: service_role-only grants,
-- the in-function role check, the exact-shape / no-';' / no-DML-keyword checks, and the
-- result filter pinned to the workspace in $1 (so even a crafted query cannot return
-- another workspace's contacts). tag_assignments / tags are read by this SECURITY DEFINER
-- function regardless of RLS, but every row is constrained by the pinned $1 workspace
-- (the compiler joins on workspace_id, and the outer filter guarantees it regardless).

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
  IF normalized ~ 'PUBLIC\.(?!CONTACTS\y|INVOICES\y|ENROLLMENTS\y|EMAIL_TRACKING_LOGS\y|TAG_ASSIGNMENTS\y|TAGS\y)[A-Z_]+' THEN
    RAISE EXCEPTION 'fn_execute_segment_sql: query references a table outside the allowed set (contacts, invoices, enrollments, email_tracking_logs, tag_assignments, tags)';
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

-- CREATE OR REPLACE preserves the ACL, but assert it: this function must stay backend-only.
DO $$
DECLARE
  bad TEXT;
BEGIN
  SELECT string_agg(p.oid::regprocedure::text, ', ') INTO bad
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'fn_execute_segment_sql'
    AND (has_function_privilege('anon', p.oid, 'EXECUTE')
         OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
         OR NOT has_function_privilege('service_role', p.oid, 'EXECUTE')
         OR p.prosrc NOT LIKE '%TAG_ASSIGNMENTS%'
         OR p.prosrc NOT LIKE '%not authorized%'
         OR p.prosrc NOT LIKE '%q.workspace_id = $1%');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'self-check failed: fn_execute_segment_sql not in intended state: %', bad;
  END IF;
END $$;
