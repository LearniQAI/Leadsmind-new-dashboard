
-- 1. Remove duplicate messages, keeping the newest one
DELETE FROM messages a USING (
      SELECT MIN(ctid) as ctid, external_id
      FROM messages 
      WHERE external_id IS NOT NULL
      GROUP BY external_id
      HAVING COUNT(*) > 1
    ) b
    WHERE a.external_id = b.external_id 
    AND a.ctid <> b.ctid;

-- 2. Add the unique constraint
ALTER TABLE messages ADD CONSTRAINT messages_external_id_key UNIQUE (external_id);
