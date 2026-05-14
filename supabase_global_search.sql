-- 1. Enable pg_trgm for better search performance (optional but recommended)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Create the Global Search Function
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

    -- Opportunities (Deals)
    (SELECT 
        o.id, 
        o.title::text as title, 
        ('$' || o.value::text)::text as subtitle, 
        'OPPORTUNITY'::text as category, 
        ('/opportunities/' || o.id)::text as link,
        'fa-crosshairs'::text as icon,
        jsonb_build_object('type', 'opportunity', 'status', o.status) as metadata
    FROM opportunities o
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

-- 3. Create Indexes for faster searching
CREATE INDEX IF NOT EXISTS idx_contacts_names_trgm ON contacts USING gin ((first_name || ' ' || last_name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_opportunities_title_trgm ON opportunities USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_invoices_number_trgm ON invoices USING gin (invoice_number gin_trgm_ops);
