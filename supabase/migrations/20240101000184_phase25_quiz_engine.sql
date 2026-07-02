-- Phase 25: Quiz & Assessment Engine

-- 1. Quizzes
CREATE TABLE IF NOT EXISTS lms_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    moduleId UUID REFERENCES course_modules(id) ON DELETE SET NULL, -- Optional: quiz can be part of a module
    title TEXT NOT NULL,
    description TEXT,
    passing_score INTEGER DEFAULT 80, -- Percentage
    time_limit_minutes INTEGER DEFAULT 0, -- 0 = no limit
    max_retakes INTEGER DEFAULT -1, -- -1 = unlimited
    is_required BOOLEAN DEFAULT true,
    certificate_template_id UUID, -- Link to a certificate design
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Questions
CREATE TABLE IF NOT EXISTS lms_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    quiz_id UUID NOT NULL REFERENCES lms_quizzes(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('multiple_choice', 'true_false', 'short_answer', 'essay', 'matching', 'ordering', 'rating', 'file_upload', 'hotspot', 'video_response')),
    question_text TEXT NOT NULL,
    points INTEGER DEFAULT 1,
    options JSONB DEFAULT '[]', -- For choices/matching
    correct_answer JSONB, -- Correct value or key
    explanation TEXT, -- Feedback for after answering
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Quiz Submissions (Student Attempts)
CREATE TABLE IF NOT EXISTS lms_quiz_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    quiz_id UUID NOT NULL REFERENCES lms_quizzes(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    answers JSONB DEFAULT '{}', -- Student answers
    score INTEGER, -- Final percentage
    status TEXT DEFAULT 'started' CHECK (status IN ('started', 'submitted', 'graded', 'failed', 'passed')),
    started_at TIMESTAMPTZ DEFAULT now(),
    submitted_at TIMESTAMPTZ,
    graded_at TIMESTAMPTZ,
    graded_by UUID, -- Teacher ID for manual grading
    feedback TEXT, -- Overall feedback
    retake_number INTEGER DEFAULT 1
);

-- 4. Certificates
CREATE TABLE IF NOT EXISTS lms_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    quiz_id UUID REFERENCES lms_quizzes(id) ON DELETE SET NULL,
    verification_code TEXT UNIQUE NOT NULL,
    issue_date TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{}' -- Course title, grade, student name, signature info
);

-- 5. Adaptive Rules (Conditional Paths)
CREATE TABLE IF NOT EXISTS lms_adaptive_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    quiz_id UUID NOT NULL REFERENCES lms_quizzes(id) ON DELETE CASCADE,
    condition_type TEXT NOT NULL, -- 'score_above', 'score_below', 'failed_all'
    condition_value INTEGER,
    action_type TEXT NOT NULL, -- 'unlock_lesson', 'redirect_to_course', 'notify_admin'
    action_target_id UUID, -- Lesson ID or Course ID
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. RLS Policies
ALTER TABLE lms_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_quiz_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_adaptive_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace access for quizzes" ON lms_quizzes FOR ALL USING (check_workspace_access(workspace_id));
CREATE POLICY "Workspace access for questions" ON lms_questions FOR ALL USING (check_workspace_access(workspace_id));
CREATE POLICY "Workspace access for submissions" ON lms_quiz_submissions FOR ALL USING (check_workspace_access(workspace_id));
CREATE POLICY "Workspace access for certificates" ON lms_certificates FOR ALL USING (check_workspace_access(workspace_id));
CREATE POLICY "Workspace access for rules" ON lms_adaptive_rules FOR ALL USING (check_workspace_access(workspace_id));

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_quiz_course ON lms_quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_questions_quiz ON lms_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_submissions_contact ON lms_quiz_submissions(contact_id);
CREATE INDEX IF NOT EXISTS idx_certificates_code ON lms_certificates(verification_code);

-- 8. Auto-Grading Function (Multiple Choice & True/False)
CREATE OR REPLACE FUNCTION fn_auto_grade_quiz(p_submission_id UUID)
RETURNS VOID AS $$
DECLARE
    v_quiz_id UUID;
    v_total_points INTEGER := 0;
    v_scored_points INTEGER := 0;
    v_questions JSONB;
    v_answers JSONB;
    v_q RECORD;
    v_ans TEXT;
    v_final_score INTEGER;
    v_passing_score INTEGER;
BEGIN
    -- 1. Get submission details
    SELECT quiz_id, answers INTO v_quiz_id, v_answers FROM lms_quiz_submissions WHERE id = p_submission_id;
    SELECT passing_score INTO v_passing_score FROM lms_quizzes WHERE id = v_quiz_id;

    -- 2. Loop through questions
    FOR v_q IN SELECT id, correct_answer, points, type FROM lms_questions WHERE quiz_id = v_quiz_id LOOP
        v_total_points := v_total_points + v_q.points;
        
        -- Check if student answered correctly
        IF v_q.type IN ('multiple_choice', 'true_false', 'short_answer') THEN
            IF v_answers->>v_q.id::text = v_q.correct_answer->>0 THEN
                v_scored_points := v_scored_points + v_q.points;
            END IF;
        END IF;
    END LOOP;

    -- 3. Update submission
    v_final_score := (v_scored_points::float / v_total_points::float * 100)::integer;
    
    UPDATE lms_quiz_submissions 
    SET 
        score = v_final_score,
        status = CASE WHEN v_final_score >= v_passing_score THEN 'passed' ELSE 'failed' END,
        graded_at = now()
    WHERE id = p_submission_id;
END;
$$ LANGUAGE plpgsql;
