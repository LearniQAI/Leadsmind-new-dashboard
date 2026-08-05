-- Fixes a workspace-deletion FK violation: log_tag_history, log_tag_assignment_history,
-- fn_audit_appointment_changes, and fn_audit_calendar_changes all unconditionally
-- INSERT an audit row (into tag_history / meet_audit_trails, both workspace_id NOT NULL
-- + ON DELETE CASCADE to workspaces) on their table's DELETE. When that delete is itself
-- part of a workspace-cascade (tags/tag_assignments/appointments/calendar rows all
-- cascade from workspaces too), the workspace row is already gone from this same
-- transaction by the time the trigger fires, so the audit INSERT's own FK check fails
-- (23503) and the entire workspace delete rolls back.
--
-- tag_history/meet_audit_trails are themselves ON DELETE CASCADE from workspaces — the
-- schema's own intent is "history dies with the workspace," so there's nothing to
-- preserve here. The fix is simply to skip the audit INSERT when the workspace no
-- longer exists (i.e. this delete is happening as part of tearing down the workspace
-- itself), while leaving normal single-row delete auditing (workspace still exists)
-- unchanged.

CREATE OR REPLACE FUNCTION public.log_tag_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_changed JSONB := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.tag_history (workspace_id, tag_id, tag_name_snapshot, action, actor_id, actor_type)
    VALUES (
      NEW.workspace_id, NEW.id, NEW.name, 'created',
      NEW.created_by,
      CASE WHEN NEW.created_by IS NOT NULL THEN 'user'
           WHEN NEW.tag_type = 'ai_smart' THEN 'ai'
           ELSE 'system' END
    );
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.name IS DISTINCT FROM OLD.name THEN
      v_changed := v_changed || jsonb_build_object('name', jsonb_build_object('old', OLD.name, 'new', NEW.name));
    END IF;
    IF NEW.color IS DISTINCT FROM OLD.color THEN
      v_changed := v_changed || jsonb_build_object('color', jsonb_build_object('old', OLD.color, 'new', NEW.color));
    END IF;
    IF NEW.icon IS DISTINCT FROM OLD.icon THEN
      v_changed := v_changed || jsonb_build_object('icon', jsonb_build_object('old', OLD.icon, 'new', NEW.icon));
    END IF;
    IF NEW.category_id IS DISTINCT FROM OLD.category_id THEN
      v_changed := v_changed || jsonb_build_object('category_id', jsonb_build_object('old', OLD.category_id, 'new', NEW.category_id));
    END IF;
    IF NEW.visibility IS DISTINCT FROM OLD.visibility THEN
      v_changed := v_changed || jsonb_build_object('visibility', jsonb_build_object('old', OLD.visibility, 'new', NEW.visibility));
    END IF;
    IF NEW.parent_tag_id IS DISTINCT FROM OLD.parent_tag_id THEN
      v_changed := v_changed || jsonb_build_object('parent_tag_id', jsonb_build_object('old', OLD.parent_tag_id, 'new', NEW.parent_tag_id));
    END IF;
    IF NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
      v_changed := v_changed || jsonb_build_object('expires_at', jsonb_build_object('old', OLD.expires_at, 'new', NEW.expires_at));
    END IF;
    IF NEW.confidence_score IS DISTINCT FROM OLD.confidence_score THEN
      v_changed := v_changed || jsonb_build_object('confidence_score', jsonb_build_object('old', OLD.confidence_score, 'new', NEW.confidence_score));
    END IF;

    IF v_changed = '{}'::jsonb THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.tag_history (workspace_id, tag_id, tag_name_snapshot, action, actor_id, actor_type, changed_fields)
    VALUES (
      NEW.workspace_id, NEW.id, NEW.name, 'updated',
      auth.uid(),
      CASE WHEN auth.uid() IS NOT NULL THEN 'user' ELSE 'system' END,
      v_changed
    );
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- Skip logging if the workspace itself is mid-cascade-delete — there is no
    -- history to preserve for a workspace that no longer exists, and inserting
    -- here would fail tag_history's own workspace_id FK (23503).
    IF NOT EXISTS (SELECT 1 FROM public.workspaces WHERE id = OLD.workspace_id) THEN
      RETURN OLD;
    END IF;

    INSERT INTO public.tag_history (workspace_id, tag_id, tag_name_snapshot, action, actor_id, actor_type)
    VALUES (
      OLD.workspace_id, OLD.id, OLD.name, 'deleted',
      auth.uid(),
      CASE WHEN auth.uid() IS NOT NULL THEN 'user' ELSE 'system' END
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_tag_assignment_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.tag_history (workspace_id, tag_id, entity_type, entity_id, action, actor_id, actor_type)
    VALUES (
      NEW.workspace_id, NEW.tag_id, NEW.entity_type, NEW.entity_id, 'added',
      NEW.assigned_by,
      CASE WHEN NEW.assigned_by IS NOT NULL THEN 'user' ELSE 'system' END
    );
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    IF NOT EXISTS (SELECT 1 FROM public.workspaces WHERE id = OLD.workspace_id) THEN
      RETURN OLD;
    END IF;

    INSERT INTO public.tag_history (workspace_id, tag_id, entity_type, entity_id, action, actor_id, actor_type)
    VALUES (
      OLD.workspace_id, OLD.tag_id, OLD.entity_type, OLD.entity_id, 'removed',
      auth.uid(),
      CASE WHEN auth.uid() IS NOT NULL THEN 'user' ELSE 'system' END
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_audit_appointment_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_workspace_id UUID;
    v_actor_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_workspace_id := OLD.workspace_id;
        IF NOT EXISTS (SELECT 1 FROM public.workspaces WHERE id = v_workspace_id) THEN
            RETURN OLD;
        END IF;
        v_actor_id := auth.uid();
        INSERT INTO public.meet_audit_trails (workspace_id, actor_id, action, entity_type, entity_id, previous_state, new_state)
        VALUES (v_workspace_id, v_actor_id, 'delete', 'booking', OLD.id, row_to_json(OLD)::jsonb, '{}'::jsonb);
        RETURN OLD;
    ELSIF TG_OP = 'INSERT' THEN
        v_workspace_id := NEW.workspace_id;
        v_actor_id := COALESCE(NEW.created_by, auth.uid());
        INSERT INTO public.meet_audit_trails (workspace_id, actor_id, action, entity_type, entity_id, previous_state, new_state)
        VALUES (v_workspace_id, v_actor_id, 'create', 'booking', NEW.id, '{}'::jsonb, row_to_json(NEW)::jsonb);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        v_workspace_id := NEW.workspace_id;
        v_actor_id := auth.uid();
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO public.meet_audit_trails (workspace_id, actor_id, action, entity_type, entity_id, previous_state, new_state)
            VALUES (v_workspace_id, v_actor_id, 'status_change', 'booking', NEW.id, jsonb_build_object('status', OLD.status), jsonb_build_object('status', NEW.status));
        ELSE
            INSERT INTO public.meet_audit_trails (workspace_id, actor_id, action, entity_type, entity_id, previous_state, new_state)
            VALUES (v_workspace_id, v_actor_id, 'update', 'booking', NEW.id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        END IF;
        RETURN NEW;
    END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_audit_calendar_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_workspace_id UUID;
    v_actor_id UUID;
BEGIN
    v_actor_id := auth.uid();
    IF TG_OP = 'DELETE' THEN
        v_workspace_id := OLD.workspace_id;
        IF NOT EXISTS (SELECT 1 FROM public.workspaces WHERE id = v_workspace_id) THEN
            RETURN OLD;
        END IF;
        INSERT INTO public.meet_audit_trails (workspace_id, actor_id, action, entity_type, entity_id, previous_state, new_state)
        VALUES (v_workspace_id, v_actor_id, 'delete', 'appointment_type', OLD.id, row_to_json(OLD)::jsonb, '{}'::jsonb);
        RETURN OLD;
    ELSIF TG_OP = 'INSERT' THEN
        v_workspace_id := NEW.workspace_id;
        INSERT INTO public.meet_audit_trails (workspace_id, actor_id, action, entity_type, entity_id, previous_state, new_state)
        VALUES (v_workspace_id, v_actor_id, 'create', 'appointment_type', NEW.id, '{}'::jsonb, row_to_json(NEW)::jsonb);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        v_workspace_id := NEW.workspace_id;
        INSERT INTO public.meet_audit_trails (workspace_id, actor_id, action, entity_type, entity_id, previous_state, new_state)
        VALUES (v_workspace_id, v_actor_id, 'config_change', 'appointment_type', NEW.id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        RETURN NEW;
    END IF;
END;
$function$;
