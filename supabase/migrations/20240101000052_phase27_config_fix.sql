-- Phase 27: Advanced Assessment Configuration (FIXED)

CREATE OR REPLACE FUNCTION fn_auto_grade_quiz_v2(p_submission_id UUID)
RETURNS VOID AS $$
DECLARE
    v_quiz_id UUID;
    v_passing_score INTEGER;
    v_negative_marking BOOLEAN;
    v_partial_scoring BOOLEAN;
    v_total_points INTEGER := 0;
    v_scored_points FLOAT := 0;
    v_answers JSONB;
    v_q RECORD;
    v_ans JSONB;
    v_final_score INTEGER;
    v_keywords TEXT[];
    v_matches INTEGER;
    v_k TEXT;
BEGIN
    -- 1. Fetch data separately to avoid record variable limitation
    SELECT quiz_id, answers INTO v_quiz_id, v_answers FROM lms_quiz_submissions WHERE id = p_submission_id;
    SELECT passing_score, negative_marking, partial_scoring 
    INTO v_passing_score, v_negative_marking, v_partial_scoring 
    FROM lms_quizzes WHERE id = v_quiz_id;

    -- 2. Loop through questions
    FOR v_q IN SELECT id, correct_answer, points, type, options FROM lms_questions WHERE quiz_id = v_quiz_id LOOP
        v_total_points := v_total_points + v_q.points;
        v_ans := v_answers->v_q.id::text;
        
        IF v_ans IS NULL THEN CONTINUE; END IF;

        -- Single Choice / True-False
        IF v_q.type IN ('multiple_choice', 'true_false') THEN
            IF v_ans::text = v_q.correct_answer::text THEN
                v_scored_points := v_scored_points + v_q.points;
            ELSIF v_negative_marking THEN
                v_scored_points := v_scored_points - (v_q.points * 0.25);
            END IF;
            
        -- Multiple Answers
        ELSIF v_q.type = 'multiple_answers' THEN
            IF v_ans::jsonb = v_q.correct_answer::jsonb THEN
                v_scored_points := v_scored_points + v_q.points;
            ELSIF v_partial_scoring THEN
                -- Basic partial match logic
                v_scored_points := v_scored_points + (v_q.points * 0.5); -- Simplified for now
            END IF;

        -- Short Answer
        ELSIF v_q.type = 'short_answer' THEN
            v_keywords := string_to_array(v_q.correct_answer->>0, ',');
            v_matches := 0;
            FOREACH v_k IN ARRAY v_keywords LOOP
                IF (v_answers->>v_q.id::text) ILIKE '%' || v_k || '%' THEN
                    v_matches := v_matches + 1;
                END IF;
            END LOOP;
            IF v_matches >= 1 THEN v_scored_points := v_scored_points + v_q.points; END IF;
        END IF;
    END LOOP;

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
            WHEN v_final_score >= v_passing_score THEN 'passed' 
            ELSE 'failed' 
        END,
        graded_at = now()
    WHERE id = p_submission_id;
END;
$$ LANGUAGE plpgsql;
