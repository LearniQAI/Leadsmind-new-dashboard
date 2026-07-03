-- Phase 31: Conditional Learning Paths & Adaptive Outcomes

-- 1. Rules Table Enhancement
CREATE TABLE IF NOT EXISTS lms_adaptive_rules_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    quiz_id UUID NOT NULL REFERENCES lms_quizzes(id) ON DELETE CASCADE,
    min_score INTEGER NOT NULL,
    max_score INTEGER NOT NULL,
    actions JSONB DEFAULT '[]', -- array of {type, target_id, data}
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Rule Evaluation Engine (Postgres)
CREATE OR REPLACE FUNCTION fn_trigger_adaptive_path(p_submission_id UUID)
RETURNS VOID AS $$
DECLARE
    v_sub RECORD;
    v_rule RECORD;
    v_action JSONB;
BEGIN
    -- Get submission and score
    SELECT * INTO v_sub FROM lms_quiz_submissions WHERE id = p_submission_id;
    
    -- Find matching rule
    FOR v_rule IN 
        SELECT * FROM lms_adaptive_rules_v2 
        WHERE quiz_id = v_sub.quiz_id 
        AND v_sub.score >= min_score 
        AND v_sub.score <= max_score
    LOOP
        -- Process each action in the rule
        FOR v_action IN SELECT * FROM jsonb_array_elements(v_rule.actions) LOOP
            
            -- Action: Enroll in Course
            IF v_action->>'type' = 'enroll' THEN
                INSERT INTO lms_enrollments (workspace_id, course_id, contact_id)
                VALUES (v_sub.workspace_id, (v_action->>'target_id')::uuid, v_sub.contact_id)
                ON CONFLICT DO NOTHING;
                
            -- Action: Complete Next Module
            ELSIF v_action->>'type' = 'complete_next' THEN
                -- Logic to find and mark completion
                
            -- Action: Add Tag
            ELSIF v_action->>'type' = 'add_tag' THEN
                UPDATE contacts 
                SET tags = array_append(tags, v_action->>'data')
                WHERE id = v_sub.contact_id AND NOT (tags @> ARRAY[v_action->>'data']);
                
            -- Action: Fire Workflow
            ELSIF v_action->>'type' = 'fire_workflow' THEN
                -- Integration with Workflow Engine
            END IF;
            
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
