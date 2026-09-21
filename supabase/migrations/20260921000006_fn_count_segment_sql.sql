-- Count-only companion to fn_execute_segment_sql. listSegments() (5 pages, several of them just
-- dropdowns) evaluated every segment in full and shipped every matching contact row across the
-- wire only to call .length on it — and PostgREST silently caps a returned set at 1000 rows, so
-- the displayed count was also wrong for any segment over 1000 contacts. This returns
-- (total, email_reach, sms_reach) computed in the database instead.
--
-- Same guards as fn_execute_segment_sql, unchanged: service_role-only, in-function role check,
-- exact-shape / no-';' / no-DML-keyword / table-whitelist checks, and the workspace in $1 pinned.
-- Only the final SELECT differs (aggregate instead of rows). The suppression list is read once into a
-- CTE and probed with a hashed NOT IN, so cost stays linear even for large suppression lists.

CREATE OR REPLACE FUNCTION public.fn_count_segment_sql(
  p_sql TEXT,
  p_params TEXT[]
)
RETURNS TABLE(total BIGINT, email_reach BIGINT, sms_reach BIGINT)
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
    RAISE EXCEPTION 'fn_count_segment_sql: not authorized' USING ERRCODE = '42501';
  END IF;

  -- The workspace this query is scoped to must be a valid uuid in $1.
  IF p_params IS NULL OR array_length(p_params, 1) IS NULL OR p_params[1] IS NULL THEN
    RAISE EXCEPTION 'fn_count_segment_sql: workspace id parameter ($1) is required';
  END IF;
  BEGIN
    v_ws := p_params[1]::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'fn_count_segment_sql: $1 must be a workspace uuid';
  END;

  normalized := upper(regexp_replace(trim(p_sql), '\s+', ' ', 'g'));

  -- 1. Whitelist the exact top-level shape SegmentationCompiler.compileToSql()
  --    always produces. Anything else is rejected outright, regardless of
  --    what follows.
  IF normalized !~ '^SELECT DISTINCT C\.\* FROM PUBLIC\.CONTACTS C WHERE C\.WORKSPACE_ID = \$1' THEN
    RAISE EXCEPTION 'fn_count_segment_sql: query does not match the expected shape (SELECT DISTINCT c.* FROM public.contacts c WHERE c.workspace_id = $1 ...)';
  END IF;

  -- 2. No statement stacking.
  IF p_sql LIKE '%;%' THEN
    RAISE EXCEPTION 'fn_count_segment_sql: statement stacking (;) is not permitted';
  END IF;

  -- 3. No DML/DDL/session/procedural keywords anywhere in the string,
  --    including inside subqueries -- belt-and-suspenders on top of #1.
  IF normalized ~ '\y(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|GRANT|REVOKE|CREATE|EXECUTE|CALL|COPY|VACUUM|REINDEX|SET|RESET|DO|MERGE|INTO)\y' THEN
    RAISE EXCEPTION 'fn_count_segment_sql: disallowed keyword detected';
  END IF;

  -- 4. Subqueries may only reference the tables compileToSql() actually
  --    joins against. Any other public.<table> reference is rejected.
  IF normalized ~ 'PUBLIC\.(?!CONTACTS\y|INVOICES\y|ENROLLMENTS\y|EMAIL_TRACKING_LOGS\y|TAG_ASSIGNMENTS\y|TAGS\y)[A-Z_]+' THEN
    RAISE EXCEPTION 'fn_count_segment_sql: query references a table outside the allowed set (contacts, invoices, enrollments, email_tracking_logs, tag_assignments, tags)';
  END IF;

  -- Parameters are substituted as quote_literal()'d SQL literals (see the
  -- original migration for why USING cannot be used with a dynamic-length
  -- array). Highest index first so "$1" never corrupts "$10".
  final_sql := p_sql;
  FOR i IN REVERSE array_length(p_params, 1)..1 LOOP
    final_sql := replace(final_sql, '$' || i, quote_literal(p_params[i]));
  END LOOP;

  -- Layer 3: only ever count rows of the workspace in $1, whatever the SQL says.
  -- Returns the total plus how many of those a campaign could actually reach. The reach
  -- predicates mirror the send-time gates (see src/lib/segments/reach.ts):
  --   email: has an address, not is_invalid_email, not on global_suppression_list
  --          (compared trimmed + case-insensitively, like loadSuppressedEmails)
  --   sms/whatsapp: has a phone, not sms_opt_out, not opted_out
  -- (newline before the closing paren so a trailing "--" comment cannot swallow it)
  RETURN QUERY EXECUTE
    'WITH sup AS (SELECT lower(btrim(g.email)) AS e FROM public.global_suppression_list g
                  WHERE g.workspace_id = $1 AND g.email IS NOT NULL)
     SELECT count(*)::bigint,
            (count(*) FILTER (WHERE q.email IS NOT NULL AND q.email <> ''''
               AND NOT COALESCE(q.is_invalid_email, false)
               AND lower(btrim(q.email)) NOT IN (SELECT e FROM sup)))::bigint,
            (count(*) FILTER (WHERE q.phone IS NOT NULL AND q.phone <> ''''
               AND NOT COALESCE(q.sms_opt_out, false)
               AND NOT COALESCE(q.opted_out, false)))::bigint
     FROM (SELECT q.* FROM (' || final_sql || E'\n) q WHERE q.workspace_id = $1) q'
    USING v_ws;
END;
$$;

-- New functions default to EXECUTE for PUBLIC: lock it to the backend exactly like the row version.
REVOKE ALL ON FUNCTION public.fn_count_segment_sql(TEXT, TEXT[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_count_segment_sql(TEXT, TEXT[]) TO service_role;

DO $$
DECLARE
  bad TEXT;
BEGIN
  SELECT string_agg(p.oid::regprocedure::text, ', ') INTO bad
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'fn_count_segment_sql'
    AND (has_function_privilege('anon', p.oid, 'EXECUTE')
         OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
         OR NOT has_function_privilege('service_role', p.oid, 'EXECUTE')
         OR p.prosrc NOT LIKE '%not authorized%'
         OR p.prosrc NOT LIKE '%q.workspace_id = $1%'
         OR p.prosrc NOT LIKE '%TAG_ASSIGNMENTS%');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'self-check failed: fn_count_segment_sql not in intended state: %', bad;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_count_segment_sql') THEN
    RAISE EXCEPTION 'self-check failed: fn_count_segment_sql missing';
  END IF;
END $$;
