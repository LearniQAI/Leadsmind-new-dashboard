-- Adds fn_execute_segment_sql, called from
-- src/lib/intelligence/SegmentationCompiler.ts's executeSegment(). This RPC
-- was never authored (confirmed via live pg_proc introspection during the
-- automation-consolidation sibling sweep); executeSegment() already has a
-- complete, correct JS-side fallback, so this is a DB-side performance
-- optimization, not a live-bug fix -- nothing currently calls
-- executeSegment() from the UI.
--
-- SECURITY: this function is SECURITY DEFINER and receives a dynamically
-- assembled SQL string (p_sql) built by SegmentationCompiler.compileToSql().
-- That TypeScript compiler currently only ever emits queries of one fixed
-- shape (SELECT DISTINCT c.* FROM public.contacts c WHERE c.workspace_id =
-- $1 [AND (...)]) built from a hardcoded field whitelist -- but this
-- function must not rely on that whitelist alone, since it is reachable via
-- RPC independent of the TypeScript caller and a future change to
-- compileToSql() could silently reopen arbitrary SQL execution here. The
-- checks below are defense-in-depth: they whitelist the exact query shape
-- the compiler produces (anchored prefix match), reject statement stacking,
-- and reject DML/DDL keywords as a second layer even inside subqueries.
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
BEGIN
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

  -- PL/pgSQL's EXECUTE ... USING clause takes a fixed, statically-known
  -- list of expressions -- it cannot accept a variadic/dynamic-length
  -- array (there is no "USING VARIADIC" form). Since p_params has a
  -- caller-determined length, parameters are instead safely substituted as
  -- SQL literals via quote_literal() (which properly escapes quotes/
  -- backslashes, so this is not string concatenation of untrusted input --
  -- quote_literal is the same primitive Postgres itself uses internally
  -- for safe dynamic SQL). Substitution runs highest-index-first so that,
  -- e.g., replacing "$1" doesn't also corrupt "$10".
  final_sql := p_sql;
  IF p_params IS NOT NULL AND array_length(p_params, 1) IS NOT NULL THEN
    FOR i IN REVERSE array_length(p_params, 1)..1 LOOP
      final_sql := replace(final_sql, '$' || i, quote_literal(p_params[i]));
    END LOOP;
  END IF;

  RETURN QUERY EXECUTE final_sql;
END;
$$;

COMMENT ON FUNCTION public.fn_execute_segment_sql(TEXT, TEXT[]) IS
  'Executes a SegmentationCompiler-generated contact-segment query. SECURITY DEFINER with internal shape/keyword validation -- do not remove those checks even if the TypeScript-side field whitelist looks sufficient on its own.';
