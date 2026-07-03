
-- Cleanup Gmail conversations that were incorrectly grouped by email
-- This deletes conversations that used the email address as external_thread_id
-- and keeps those that use the correct Google Thread ID format (which are usually alphanumeric ids)

-- 1. Identify and delete messages from 'email' based conversations for Gmail
DELETE FROM messages WHERE conversation_id IN (
    SELECT id FROM conversations 
    WHERE platform = 'email' 
    AND external_thread_id LIKE '%@%'
);

-- 2. Delete those conversations
DELETE FROM conversations 
WHERE platform = 'email' 
AND external_thread_id LIKE '%@%';
