-- Workspace setup transaction
-- Replaces the two sequential, non-transactional inserts
-- in src/lib/auth.ts getCurrentWorkspace() auto-create fallback
-- If any step fails, ALL steps are rolled back automatically

CREATE OR REPLACE FUNCTION setup_workspace(
  p_user_id UUID,
  p_workspace_name TEXT,
  p_slug TEXT
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_workspace_id UUID;
  v_final_slug TEXT;
  v_counter INT := 0;
BEGIN
  -- Ensure user row exists
  INSERT INTO users (id, email)
  SELECT p_user_id, email
  FROM auth.users
  WHERE id = p_user_id
  ON CONFLICT (id) DO NOTHING;

  -- Handle slug uniqueness with auto-increment
  v_final_slug := p_slug;
  LOOP
    BEGIN
      INSERT INTO workspaces (
        name,
        slug,
        owner_id,
        plan,
        plan_tier
      )
      VALUES (
        p_workspace_name,
        v_final_slug,
        p_user_id,
        'pro',
        'pro'
      )
      RETURNING id INTO v_workspace_id;
      EXIT; -- success, exit loop
    EXCEPTION WHEN unique_violation THEN
      v_counter := v_counter + 1;
      v_final_slug := p_slug || '-' || v_counter;
    END;
  END LOOP;

  -- Add user as admin member
  -- ON CONFLICT handles race conditions gracefully
  INSERT INTO workspace_members (
    workspace_id,
    user_id,
    role
  )
  VALUES (
    v_workspace_id,
    p_user_id,
    'admin'
  )
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  -- If ANY step above failed, PostgreSQL rolls back
  -- the entire function automatically
  RETURN v_workspace_id;
END;
$$;
