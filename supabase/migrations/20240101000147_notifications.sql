-- ================================================================
-- LeadsMind: Persistent Notifications System
-- ================================================================

-- 1. Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL,
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type            TEXT NOT NULL CHECK (type IN ('message', 'contact', 'deal', 'system', 'team')),
    title           TEXT NOT NULL,
    message         TEXT NOT NULL,
    link            TEXT,
    read            BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- 2. RLS (Row Level Security)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- 3. Trigger Function: Create notification on new message
CREATE OR REPLACE FUNCTION public.handle_new_message_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_owner_id UUID;
BEGIN
    -- Only for inbound messages
    IF NEW.direction = 'inbound' THEN
        -- Find the workspace owner or relevant admin to notify
        -- For simplicity, we notify all members with role 'admin' in that workspace
        FOR v_owner_id IN 
            SELECT user_id FROM public.workspace_members 
            WHERE workspace_id = NEW.workspace_id AND role = 'admin'
        LOOP
            INSERT INTO public.notifications (workspace_id, user_id, type, title, message, link)
            VALUES (
                NEW.workspace_id, 
                v_owner_id, 
                'message', 
                'New Message', 
                substring(NEW.content from 1 for 100), 
                '/conversations'
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_message_notification ON public.messages;
CREATE TRIGGER on_new_message_notification
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_message_notification();

-- 4. Trigger Function: Create notification on new contact
CREATE OR REPLACE FUNCTION public.handle_new_contact_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_owner_id UUID;
BEGIN
    FOR v_owner_id IN 
        SELECT user_id FROM public.workspace_members 
        WHERE workspace_id = NEW.workspace_id AND role = 'admin'
    LOOP
        INSERT INTO public.notifications (workspace_id, user_id, type, title, message, link)
        VALUES (
            NEW.workspace_id, 
            v_owner_id, 
            'contact', 
            'New Contact', 
            (NEW.first_name || ' ' || COALESCE(NEW.last_name, '') || ' was added.'), 
            '/contacts'
        );
    END LOOP;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_contact_notification ON public.contacts;
CREATE TRIGGER on_new_contact_notification
    AFTER INSERT ON public.contacts
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_contact_notification();
