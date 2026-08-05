-- 20260805000002_paystack_billing.sql replaced the workspaces_plan_check
-- constraint to only allow 'spark','rise','surge','infinity','dynasty'.
-- handle_new_user() (the on_auth_user_created trigger) still inserted the
-- literal 'free', which is no longer a legal value, so every new-user
-- signup failed and rolled back the whole auth transaction.
--
-- Fix: insert 'spark', the canonical free-tier name established by the
-- Paystack reconciliation migration, not the retired 'free' vocabulary.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_full_name TEXT;
    v_first_name TEXT;
    v_last_name TEXT;
    v_workspace_name TEXT;
    v_workspace_id UUID;
    v_slug TEXT;
    v_base_slug TEXT;
    v_counter INT := 0;
BEGIN
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );
    v_first_name := split_part(v_full_name, ' ', 1);
    v_last_name := COALESCE(
        NULLIF(substring(v_full_name from position(' ' in v_full_name) + 1), ''),
        ''
    );

    INSERT INTO public.users (id, email, first_name, last_name, created_at)
    VALUES (NEW.id, NEW.email, v_first_name, v_last_name, now())
    ON CONFLICT (id) DO NOTHING;

    v_workspace_name := v_full_name || '''s Workspace';
    v_base_slug := lower(regexp_replace(v_full_name, '[^a-zA-Z0-9]', '-', 'g'));
    v_slug := v_base_slug;

    LOOP
        BEGIN
            INSERT INTO public.workspaces (name, slug, owner_id, plan, plan_tier)
            VALUES (v_workspace_name, v_slug, NEW.id, 'spark', 'spark')
            RETURNING id INTO v_workspace_id;
            EXIT;
        EXCEPTION WHEN unique_violation THEN
            v_counter := v_counter + 1;
            v_slug := v_base_slug || '-' || v_counter;
        END;
    END LOOP;

    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (v_workspace_id, NEW.id, 'admin')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;

    RETURN NEW;
END;
$$;
