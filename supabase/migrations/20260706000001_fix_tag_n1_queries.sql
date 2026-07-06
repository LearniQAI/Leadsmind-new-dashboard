-- Fix N+1 tag queries — 3 PostgreSQL RPC functions
-- Replaces JavaScript loops in ContactService.bulkAddTag
-- Each function does 1 query instead of N queries

-- Bulk add tag to multiple contacts at once
CREATE OR REPLACE FUNCTION bulk_add_tag(
  p_ids UUID[],
  p_tag TEXT,
  p_workspace_id UUID
)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE contacts
  SET tags = array_append(tags, p_tag)
  WHERE workspace_id = p_workspace_id
    AND id = ANY(p_ids)
    AND NOT (tags @> ARRAY[p_tag]);
$$;

-- Bulk remove tag from multiple contacts at once
CREATE OR REPLACE FUNCTION bulk_remove_tag(
  p_ids UUID[],
  p_tag TEXT,
  p_workspace_id UUID
)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE contacts
  SET tags = array_remove(tags, p_tag)
  WHERE workspace_id = p_workspace_id
    AND id = ANY(p_ids);
$$;

-- Rename a tag across all contacts in a workspace
-- 1 query instead of fetching all contacts to JS
CREATE OR REPLACE FUNCTION global_rename_tag(
  p_old TEXT,
  p_new TEXT,
  p_workspace_id UUID
)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE contacts
  SET tags = array_replace(tags, p_old, p_new)
  WHERE workspace_id = p_workspace_id
    AND tags @> ARRAY[p_old];
$$;

-- Count tags across all contacts in a workspace
-- 1 query instead of fetching entire table to JS
CREATE OR REPLACE FUNCTION count_workspace_tags(
  p_workspace_id UUID
)
RETURNS TABLE(tag TEXT, count BIGINT)
LANGUAGE sql
AS $$
  SELECT tag, COUNT(*) as count
  FROM (
    SELECT unnest(tags) AS tag
    FROM contacts
    WHERE workspace_id = p_workspace_id
  ) t
  GROUP BY tag
  ORDER BY count DESC;
$$;
