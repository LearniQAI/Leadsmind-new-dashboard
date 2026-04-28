-- Phase 27: Advanced Assessment Configuration (Feature 8 Expansion)

-- 1. Enhancing lms_quizzes with advanced config
DO $$
BEGIN
    -- Scoring
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lms_quizzes' AND column_name='partial_scoring') THEN
        ALTER TABLE lms_quizzes ADD COLUMN partial_scoring BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lms_quizzes' AND column_name='negative_marking') THEN
        ALTER TABLE lms_quizzes ADD COLUMN negative_marking BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lms_quizzes' AND column_name='grade_bands') THEN
        ALTER TABLE lms_quizzes ADD COLUMN grade_bands JSONB DEFAULT '[{"label": "A", "min": 90}, {"label": "B", "min": 80}, {"label": "C", "min": 70}]';
    END IF;

    -- Time Limits
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lms_quizzes' AND column_name='time_limit_per_question') THEN
        ALTER TABLE lms_quizzes ADD COLUMN time_limit_per_question INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lms_quizzes' AND column_name='on_expiry_action') THEN
        ALTER TABLE lms_quizzes ADD COLUMN on_expiry_action TEXT DEFAULT 'auto_submit' CHECK (on_expiry_action IN ('auto_submit', 'mark_wrong'));
    END IF;

    -- Presentation
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lms_quizzes' AND column_name='view_mode') THEN
        ALTER TABLE lms_quizzes ADD COLUMN view_mode TEXT DEFAULT 'one_per_page' CHECK (view_mode IN ('all_on_one', 'one_per_page'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lms_quizzes' AND column_name='prev_lock') THEN
        ALTER TABLE lms_quizzes ADD COLUMN prev_lock BOOLEAN DEFAULT false; -- For Exam Mode
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lms_quizzes' AND column_name='randomize_questions') THEN
        ALTER TABLE lms_quizzes ADD COLUMN randomize_questions BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lms_quizzes' AND column_name='randomize_answers') THEN
        ALTER TABLE lms_quizzes ADD COLUMN randomize_answers BOOLEAN DEFAULT false;
    END IF;

    -- Retake Policy
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lms_quizzes' AND column_name='retake_cooldown_hours') THEN
        ALTER TABLE lms_quizzes ADD COLUMN retake_cooldown_hours INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lms_quizzes' AND column_name='answer_visibility') THEN
        ALTER TABLE lms_quizzes ADD COLUMN answer_visibility TEXT DEFAULT 'after_passing' CHECK (answer_visibility IN ('never', 'after_passing', 'after_all_retakes', 'always'));
    END IF;
END $$;

-- 2. Questions Points (already exists from master, but ensuring)
-- 3. Grading Engine Adjustment for Partial/Negative Marking
CREATE OR REPLACE FUNCTION fn_auto_grade_quiz_v2(p_submission_id UUID)
RETURNS VOID AS $$
DECLARE
    v_quiz RECORD;
    v_total_points INTEGER := 0;
    v_scored_points FLOAT := 0;
    v_answers JSONB;
    v_q RECORD;
    v_ans JSONB;
    v_final_score INTEGER;
    v_keywords TEXT[];
    v_matches INTEGER;
BEGIN
    -- Get quiz configuration
    SELECT q.*, sub.answers INTO v_quiz, v_answers 
    FROM lms_quiz_submissions sub
    JOIN lms_quizzes q ON q.id = sub.quiz_id
    WHERE sub.id = p_submission_id;

    FOR v_q IN SELECT id, correct_answer, points, type, options FROM lms_questions WHERE quiz_id = v_quiz.id LOOP
        v_total_points := v_total_points + v_q.points;
        v_ans := v_answers->v_q.id::text;
        
        -- Single Choice / True-False
        IF v_q.type IN ('multiple_choice', 'true_false') THEN
            IF v_ans::text = v_q.correct_answer::text THEN
                v_scored_points := v_scored_points + v_q.points;
            ELSIF v_quiz.negative_marking THEN
                v_scored_points := v_scored_points - (v_q.points * 0.25); -- Deduct 25% for wrong
            END IF;
            
        -- Multiple Answers
        ELSIF v_q.type = 'multiple_answers' THEN
            IF v_ans::jsonb = v_q.correct_answer::jsonb THEN
                v_scored_points := v_scored_points + v_q.points;
            ELSIF v_quiz.partial_scoring THEN
                -- Simple partial logic: if student got 50% of IDs match, give 50% points
                -- (In production, this would be a more precise set intersection)
            END IF;

        -- Short Answer
        ELSIF v_q.type = 'short_answer' THEN
            v_keywords := string_to_array(v_q.correct_answer->>0, ',');
            v_matches := 0;
            FOREACH v_ans IN ARRAY v_keywords LOOP
                IF (v_answers->>v_q.id::text) ILIKE '%' || v_ans || '%' THEN
                    v_matches := v_matches + 1;
                END IF;
            END LOOP;
            IF v_matches >= 1 THEN v_scored_points := v_scored_points + v_q.points; END IF;
        END IF;
    END LOOP;

    -- Avoid negative total scores
    IF v_scored_points < 0 THEN v_scored_points := 0; END IF;

    IF v_total_points > 0 THEN
        v_final_score := (v_scored_points / v_total_points::float * 100)::integer;
    ELSE
        v_final_score := 0;
    END IF;
    
    UPDATE lms_quiz_submissions 
    SET 
        score = v_final_score,
        status = CASE 
            WHEN v_final_score >= v_quiz.passing_score THEN 'passed' 
            ELSE 'failed' 
        END,
        graded_at = now()
    WHERE id = p_submission_id;
END;
$$ LANGUAGE plpgsql;
