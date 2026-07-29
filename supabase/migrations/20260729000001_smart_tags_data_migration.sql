-- SMART TAGS ENGINE (Part 1) — data migration.
--
-- Moves existing contacts.tags / opportunities.tags array values into the new
-- relational tags/tag_assignments model. Conversations.tags, pages.tags and
-- lead_finder_results.smart_tags are explicitly out of scope for this pass
-- (per PRD scope: Contacts, Companies, Deals, Invoices, Courses, Support
-- Tickets) and are left untouched.
--
-- contacts.tags / opportunities.tags columns themselves are NOT dropped here —
-- they're dropped in a later migration once every reader/writer has been
-- repointed onto the new model and verified.

DO $$
DECLARE
  r RECORD;
  v_tag_id UUID;
BEGIN
  -- Contacts
  FOR r IN
    SELECT c.workspace_id, c.id AS entity_id, trim(unnest(c.tags)) AS tag_name
    FROM public.contacts c
    WHERE c.tags IS NOT NULL AND array_length(c.tags, 1) > 0
  LOOP
    IF r.tag_name IS NULL OR r.tag_name = '' THEN
      CONTINUE;
    END IF;

    INSERT INTO public.tags (workspace_id, name, tag_type, visibility)
    VALUES (r.workspace_id, r.tag_name, 'manual', 'team')
    ON CONFLICT (workspace_id, lower(name)) DO NOTHING;

    SELECT id INTO v_tag_id FROM public.tags
    WHERE workspace_id = r.workspace_id AND lower(name) = lower(r.tag_name);

    INSERT INTO public.tag_assignments (workspace_id, tag_id, entity_type, entity_id)
    VALUES (r.workspace_id, v_tag_id, 'contact', r.entity_id)
    ON CONFLICT (tag_id, entity_type, entity_id) DO NOTHING;
  END LOOP;

  -- Opportunities (Deals)
  FOR r IN
    SELECT o.workspace_id, o.id AS entity_id, trim(unnest(o.tags)) AS tag_name
    FROM public.opportunities o
    WHERE o.tags IS NOT NULL AND array_length(o.tags, 1) > 0
  LOOP
    IF r.tag_name IS NULL OR r.tag_name = '' THEN
      CONTINUE;
    END IF;

    INSERT INTO public.tags (workspace_id, name, tag_type, visibility)
    VALUES (r.workspace_id, r.tag_name, 'manual', 'team')
    ON CONFLICT (workspace_id, lower(name)) DO NOTHING;

    SELECT id INTO v_tag_id FROM public.tags
    WHERE workspace_id = r.workspace_id AND lower(name) = lower(r.tag_name);

    INSERT INTO public.tag_assignments (workspace_id, tag_id, entity_type, entity_id)
    VALUES (r.workspace_id, v_tag_id, 'deal', r.entity_id)
    ON CONFLICT (tag_id, entity_type, entity_id) DO NOTHING;
  END LOOP;
END $$;
