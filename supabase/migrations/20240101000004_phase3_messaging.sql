-- PHASE 3: OMNICHANNEL MESSAGING FOUNDATION

-- 1. TABLES

-- Platform Connections (Stores encrypted credentials for integrated services)
CREATE TABLE IF NOT EXISTS platform_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('email', 'sms', 'whatsapp', 'instagram', 'twitter', 'facebook')),
    credentials JSONB NOT NULL DEFAULT '{}', -- SID, Auth Token, API Keys, etc.
    status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error', 'pending')),
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, platform)
);

-- Conversations (Threads between a contact and a channel)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('email', 'sms', 'whatsapp', 'instagram', 'twitter', 'facebook')),
    external_thread_id TEXT, -- The thread ID from the provider (e.g. Twilio Sid, Meta Thread Id)
    title TEXT,
    last_message_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, platform, external_thread_id)
);

-- Messages (Individual message content)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    content TEXT NOT NULL,
    sender_handle TEXT, -- email address, phone number, social handle
    status TEXT DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),
    external_id TEXT, -- The message ID from the provider
    metadata JSONB DEFAULT '{}',
    sent_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_platform_connections_workspace_id ON platform_connections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_conversations_workspace_id ON conversations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_conversations_contact_id ON conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_workspace_id ON messages(workspace_id);

-- 3. RLS (Row Level Security)
ALTER TABLE platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Reuse workspace membership check from Phase 2
-- CREATE OR REPLACE FUNCTION public.check_workspace_access(target_workspace_id UUID) ... already defined in phase2.sql

CREATE POLICY "Workspace access for platform_connections" ON platform_connections
    FOR ALL USING (check_workspace_access(workspace_id));

CREATE POLICY "Workspace access for conversations" ON conversations
    FOR ALL USING (check_workspace_access(workspace_id));

CREATE POLICY "Workspace access for messages" ON messages
    FOR ALL USING (check_workspace_access(workspace_id));

-- 4. UPDATED_AT TRIGGERS
CREATE TRIGGER update_platform_connections_updated_at BEFORE UPDATE ON platform_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
