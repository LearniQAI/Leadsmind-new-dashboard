-- tag_assignments is polymorphic (entity_type IN contact/company/deal/invoice/course/
-- support_ticket, entity_id has no FK — see 20260729000000_smart_tags_schema.sql), so a
-- real FOREIGN KEY ... ON DELETE CASCADE is impossible. Deleting a contact therefore left
-- its assignments behind: 67 of 169 rows pointed at deleted contacts, inflating the Tag
-- Manager usage counts and (before the segment fix) segment tag counts.
--
-- Pattern used: an AFTER DELETE trigger on the parent table that removes its polymorphic
-- children. Only 'contact' has ever been assigned (all 169 rows), and companies/deals have
-- no table at all, so this is attached to contacts only. If another entity type starts
-- being tagged, attach the same function to its table with its entity_type as the argument.

-- 1. Remove the existing orphans. Every row was verified to be entity_type='contact' with no
--    matching contact. The audit trigger is switched off for this one statement: it would
--    otherwise write 67 "removed" tag_history events for contacts deleted long ago, which
--    never actually happened as tag removals.
ALTER TABLE public.tag_assignments DISABLE TRIGGER on_tag_assignment_change;

DELETE FROM public.tag_assignments ta
WHERE ta.entity_type = 'contact'
  AND NOT EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = ta.entity_id);

ALTER TABLE public.tag_assignments ENABLE TRIGGER on_tag_assignment_change;

-- 2. Cascade going forward. SECURITY DEFINER so the cleanup does not depend on the deleting
--    user's RLS on tag_assignments. The normal audit trigger still fires for these deletes
--    (it already skips logging when the whole workspace is being torn down).
CREATE OR REPLACE FUNCTION public.delete_tag_assignments_for_entity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.tag_assignments
  WHERE entity_type = TG_ARGV[0] AND entity_id = OLD.id;
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_tag_assignments_for_entity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS tr_contacts_delete_tag_assignments ON public.contacts;
CREATE TRIGGER tr_contacts_delete_tag_assignments
  AFTER DELETE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.delete_tag_assignments_for_entity('contact');

-- 3. Self-check: no orphans left, trigger present, function not callable by app roles.
DO $$
DECLARE
  n INT;
BEGIN
  SELECT count(*) INTO n FROM public.tag_assignments ta
  WHERE ta.entity_type = 'contact' AND NOT EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = ta.entity_id);
  IF n > 0 THEN RAISE EXCEPTION 'self-check failed: % orphaned contact tag_assignments remain', n; END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_contacts_delete_tag_assignments' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'self-check failed: cascade trigger missing';
  END IF;

  IF has_function_privilege('anon', 'public.delete_tag_assignments_for_entity()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.delete_tag_assignments_for_entity()', 'EXECUTE') THEN
    RAISE EXCEPTION 'self-check failed: cascade function callable by app roles';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_tag_assignment_change' AND tgenabled = 'O') THEN
    RAISE EXCEPTION 'self-check failed: audit trigger not re-enabled';
  END IF;
END $$;
