CREATE OR REPLACE FUNCTION public.__debug_list_policies(tbl text)
RETURNS TABLE(policyname text, cmd text, roles text[], qual text, with_check text)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT policyname, cmd, roles, qual, with_check
  FROM pg_policies WHERE tablename = tbl AND schemaname = 'public';
$$;
