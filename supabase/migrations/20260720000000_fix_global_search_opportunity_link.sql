-- Issue #17: global_search emitted '/opportunities/{id}' for opportunity
-- results, but no src/app/opportunities/[id] route exists anywhere in the
-- app -- every opportunity result was a dead link.
--
-- /pipelines does not currently support deep-linking to/highlighting a
-- single opportunity (confirmed by reading PipelinesClient.tsx before
-- assuming), so building that UI just to make this link resolve would be
-- a new feature, not a link fix. Instead: link to the opportunity's contact
-- detail page (a real, working page) when the opportunity has a contact,
-- and fall back to the correct pipeline board (also real and working, just
-- not scrolled/highlighted to the card) when it doesn't.
--
-- Everything else in this function is copied verbatim from
-- 20260713000001_global_search_rpc.sql — only the opportunity link
-- expression and its join changed.
CREATE OR REPLACE FUNCTION global_search(query_text text, workspace_id uuid)
RETURNS TABLE (
    id uuid,
    title text,
    subtitle text,
    category text,
    link text,
    icon text,
    metadata jsonb
) AS $$
BEGIN
    RETURN QUERY
    -- Contacts (Leads)
    (SELECT
        c.id,
        (c.first_name || ' ' || c.last_name)::text as title,
        c.email::text as subtitle,
        'CONTACT'::text as category,
        ('/contacts/' || c.id)::text as link,
        'fa-user'::text as icon,
        jsonb_build_object('type', 'contact') as metadata
    FROM contacts c
    WHERE c.workspace_id = global_search.workspace_id
    AND (c.first_name ILIKE '%' || query_text || '%' OR c.last_name ILIKE '%' || query_text || '%' OR c.email ILIKE '%' || query_text || '%')
    LIMIT 5)

    UNION ALL

    -- Opportunities (Deals) — link to the contact if there is one, else the
    -- deal's own pipeline board.
    (SELECT
        o.id,
        o.title::text as title,
        ('$' || o.value::text)::text as subtitle,
        'OPPORTUNITY'::text as category,
        (CASE
            WHEN o.contact_id IS NOT NULL THEN '/contacts/' || o.contact_id
            ELSE '/pipelines?pipelineId=' || ps.pipeline_id
        END)::text as link,
        'fa-crosshairs'::text as icon,
        jsonb_build_object('type', 'opportunity', 'status', o.status) as metadata
    FROM opportunities o
    JOIN pipeline_stages ps ON ps.id = o.stage_id
    WHERE o.workspace_id = global_search.workspace_id
    AND o.title ILIKE '%' || query_text || '%'
    LIMIT 5)

    UNION ALL

    -- Invoices
    (SELECT
        i.id,
        i.invoice_number::text as title,
        ('$' || i.total_amount::text)::text as subtitle,
        'INVOICE'::text as category,
        ('/invoices/' || i.id)::text as link,
        'fa-file-invoice-dollar'::text as icon,
        jsonb_build_object('type', 'invoice', 'status', i.status) as metadata
    FROM invoices i
    WHERE i.workspace_id = global_search.workspace_id
    AND i.invoice_number ILIKE '%' || query_text || '%'
    LIMIT 5)

    UNION ALL

    -- Tasks
    (SELECT
        t.id,
        t.title::text as title,
        t.priority::text as subtitle,
        'TASK'::text as category,
        ('/tasks/' || t.id)::text as link,
        'fa-list-check'::text as icon,
        jsonb_build_object('type', 'task', 'status', t.status) as metadata
    FROM tasks t
    WHERE t.workspace_id = global_search.workspace_id
    AND t.title ILIKE '%' || query_text || '%'
    LIMIT 5)

    UNION ALL

    -- Projects
    (SELECT
        p.id,
        p.name::text as title,
        p.status::text as subtitle,
        'PROJECT'::text as category,
        ('/projects/' || p.id)::text as link,
        'fa-diagram-project'::text as icon,
        jsonb_build_object('type', 'project') as metadata
    FROM projects p
    WHERE p.workspace_id = global_search.workspace_id
    AND p.name ILIKE '%' || query_text || '%'
    LIMIT 5);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
