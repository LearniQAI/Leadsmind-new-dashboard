-- PHASE 46: TASKS & KANBAN
-- 1. ENUMS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
        CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'in_review', 'done');
    END IF;
END $$;

-- 2. TABLES
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    priority task_priority DEFAULT 'medium',
    status task_status DEFAULT 'todo',
    due_date TIMESTAMPTZ,
    sort_order INTEGER DEFAULT 0,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Task Assignees Table (Junction)
CREATE TABLE IF NOT EXISTS task_assignees (
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (task_id, user_id)
);

-- Task Tags Table
CREATE TABLE IF NOT EXISTS task_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Task-Tag Junction
CREATE TABLE IF NOT EXISTS task_tag_assignments (
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES task_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_task_assignees_composite ON task_assignees(task_id, user_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_workspace_id ON task_tags(workspace_id);

-- 4. RLS POLICIES
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace access for tasks" ON tasks
    FOR ALL USING (public.check_workspace_access(workspace_id));

CREATE POLICY "Workspace access for task_assignees" ON task_assignees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM tasks 
            WHERE tasks.id = task_assignees.task_id 
            AND public.check_workspace_access(tasks.workspace_id)
        )
    );

CREATE POLICY "Workspace access for task_tags" ON task_tags
    FOR ALL USING (public.check_workspace_access(workspace_id));

CREATE POLICY "Workspace access for task_tag_assignments" ON task_tag_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM tasks 
            WHERE tasks.id = task_tag_assignments.task_id 
            AND public.check_workspace_access(tasks.workspace_id)
        )
    );

-- Task Activities (for history)
CREATE TABLE IF NOT EXISTS task_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id),
    type TEXT NOT NULL, -- 'status_change', 'assignment', 'comment', etc.
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Task Comments
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_activities_task_id ON task_activities(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);

ALTER TABLE task_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace access for task_activities" ON task_activities
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM tasks 
            WHERE tasks.id = task_activities.task_id 
            AND public.check_workspace_access(tasks.workspace_id)
        )
    );

CREATE POLICY "Workspace access for task_comments" ON task_comments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM tasks 
            WHERE tasks.id = task_comments.task_id 
            AND public.check_workspace_access(tasks.workspace_id)
        )
    );

CREATE TRIGGER update_task_comments_updated_at BEFORE UPDATE ON task_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Realtime for tasks
-- Note: These might fail if the publication already contains the tables, so we use a safe block if possible
-- But for a migration script, usually we just run them.
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE task_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE task_assignees;

-- 6. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS inbox_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'info', -- 'info', 'task_assigned', 'comment_mentioned'
    link TEXT, -- URL to the task or record
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inbox_notifications_user_id ON inbox_notifications(user_id);
ALTER TABLE inbox_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON inbox_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON inbox_notifications
    FOR INSERT WITH CHECK (true);

-- 7. OVERDUE TASK FUNCTION (For Cron Job)
CREATE OR REPLACE FUNCTION notify_overdue_tasks()
RETURNS VOID AS $$
BEGIN
    INSERT INTO inbox_notifications (user_id, title, description, type, link)
    SELECT 
        ta.user_id,
        'Overdue Task: ' || t.title,
        'This task was due on ' || to_char(t.due_date, 'Mon DD, YYYY'),
        'warning',
        '/tasks'
    FROM tasks t
    JOIN task_assignees ta ON ta.task_id = t.id
    WHERE t.due_date < now() 
    AND t.status != 'done'
    AND NOT EXISTS (
        SELECT 1 FROM inbox_notifications n 
        WHERE n.user_id = ta.user_id 
        AND n.link = '/tasks' 
        AND n.created_at > now() - interval '1 day'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. NOTIFICATION TRIGGERS
CREATE OR REPLACE FUNCTION public.handle_task_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_TABLE_NAME = 'task_assignees') THEN
        INSERT INTO inbox_notifications (user_id, title, description, type, link)
        SELECT 
            NEW.user_id,
            'New Task Assigned',
            'You have been assigned to: ' || t.title,
            'task_assigned',
            '/tasks'
        FROM tasks t WHERE t.id = NEW.task_id;
    ELSIF (TG_TABLE_NAME = 'task_comments') THEN
        -- Notify all assignees except the commenter
        INSERT INTO inbox_notifications (user_id, title, description, type, link)
        SELECT 
            ta.user_id,
            'New Comment on Task',
            'Someone commented on: ' || t.title,
            'comment_mentioned',
            '/tasks'
        FROM task_assignees ta
        JOIN tasks t ON t.id = ta.task_id
        WHERE ta.task_id = NEW.task_id AND ta.user_id != NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_task_assigned ON task_assignees;
DROP TRIGGER IF EXISTS on_task_comment ON task_comments;

CREATE TRIGGER on_task_assigned
    AFTER INSERT ON task_assignees
    FOR EACH ROW EXECUTE FUNCTION public.handle_task_notification();

CREATE TRIGGER on_task_comment
    AFTER INSERT ON task_comments
    FOR EACH ROW EXECUTE FUNCTION public.handle_task_notification();
