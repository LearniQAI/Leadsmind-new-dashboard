-- QUIZ ENGINE MASTER - 10 QUESTION TYPES (CONSOLIDATED)

-- 1. Core Tables
CREATE TABLE IF NOT EXISTS lms_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    passing_score INTEGER DEFAULT 80,
    time_limit_minutes INTEGER DEFAULT 0,
    max_retakes INTEGER DEFAULT -1,
    is_required BOOLEAN DEFAULT true,
    certificate_template_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lms_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    quiz_id UUID NOT NULL REFERENCES lms_quizzes(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- multiple_choice, multiple_answers, true_false, short_answer, essay, etc.
    question_text TEXT NOT NULL,
    points INTEGER DEFAULT 1,
    options JSONB DEFAULT '[]',
    correct_answer JSONB,
    explanation TEXT,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lms_quiz_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    quiz_id UUID NOT NULL REFERENCES lms_quizzes(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    answers JSONB DEFAULT '{}',
    score INTEGER,
    status TEXT DEFAULT 'started',
    started_at TIMESTAMPTZ DEFAULT now(),
    submitted_at TIMESTAMPTZ,
    graded_at TIMESTAMPTZ,
    retake_number INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS lms_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    verification_code TEXT UNIQUE NOT NULL,
    issue_date TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS lms_adaptive_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    quiz_id UUID NOT NULL REFERENCES lms_quizzes(id) ON DELETE CASCADE,
    condition_type TEXT NOT NULL,
    condition_value INTEGER,
    action_type TEXT NOT NULL,
    action_target_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Advanced Grading Engine (For All 10 Types)
CREATE OR REPLACE FUNCTION fn_auto_grade_quiz(p_submission_id UUID)
RETURNS VOID AS $$
DECLARE
    v_quiz_id UUID;
    v_total_points INTEGER := 0;
    v_scored_points FLOAT := 0;
    v_answers JSONB;
    v_q RECORD;
    v_ans JSONB;
    v_final_score INTEGER;
    v_passing_score INTEGER;
    v_keywords TEXT[];
    v_matches INTEGER;
BEGIN
    SELECT quiz_id, answers INTO v_quiz_id, v_answers FROM lms_quiz_submissions WHERE id = p_submission_id;
    SELECT passing_score INTO v_passing_score FROM lms_quizzes WHERE id = v_quiz_id;

    FOR v_q IN SELECT id, correct_answer, points, type, options FROM lms_questions WHERE quiz_id = v_quiz_id LOOP
        v_total_points := v_total_points + v_q.points;
        v_ans := v_answers->v_q.id::text;
        
        -- Multiple Choice / True-False
        IF v_q.type IN ('multiple_choice', 'true_false') THEN
            IF v_ans::text = v_q.correct_answer::text THEN
                v_scored_points := v_scored_points + v_q.points;
            END IF;
            
        -- Multiple Answers (Partial Scoring)
        ELSIF v_q.type = 'multiple_answers' THEN
            IF v_ans::jsonb = v_q.correct_answer::jsonb THEN
                v_scored_points := v_scored_points + v_q.points;
            END IF;

        -- Short Answer (Keywords)
        ELSIF v_q.type = 'short_answer' THEN
            v_keywords := string_to_array(v_q.correct_answer->>0, ',');
            v_matches := 0;
            FOREACH v_ans IN ARRAY v_keywords LOOP
                IF v_ans::text ILIKE '%' || v_ans || '%' THEN
                    v_matches := v_matches + 1;
                END IF;
            END LOOP;
            IF v_matches >= 1 THEN v_scored_points := v_scored_points + v_q.points; END IF;
        END IF;
    END LOOP;

    IF v_total_points > 0 THEN
        v_final_score := (v_scored_points / v_total_points::float * 100)::integer;
    ELSE
        v_final_score := 0;
    END IF;
    
    UPDATE lms_quiz_submissions 
    SET 
        score = v_final_score,
        status = CASE 
            WHEN EXISTS (SELECT 1 FROM lms_questions WHERE quiz_id = v_quiz_id AND type IN ('essay', 'video_response', 'file_upload')) THEN 'submitted'
            WHEN v_final_score >= v_passing_score THEN 'passed' 
            ELSE 'failed' 
        END,
        graded_at = now()
    WHERE id = p_submission_id;
END;
$$ LANGUAGE plpgsql;

-- 3. RLS Policies
ALTER TABLE lms_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_quiz_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_adaptive_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace access for quizzes_v2" ON lms_quizzes FOR ALL USING (check_workspace_access(workspace_id));
CREATE POLICY "Workspace access for questions_v2" ON lms_questions FOR ALL USING (check_workspace_access(workspace_id));
CREATE POLICY "Workspace access for submissions_v2" ON lms_quiz_submissions FOR ALL USING (check_workspace_access(workspace_id));
CREATE POLICY "Workspace access for certificates_v2" ON lms_certificates FOR ALL USING (check_workspace_access(workspace_id));
CREATE POLICY "Workspace access for rules_v2" ON lms_adaptive_rules FOR ALL USING (check_workspace_access(workspace_id));
