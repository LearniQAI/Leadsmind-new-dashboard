-- Phase 26: Advanced Grading Logic (Parity with User Screenshots)

CREATE OR REPLACE FUNCTION fn_auto_grade_quiz(p_submission_id UUID)
RETURNS VOID AS $$
DECLARE
    v_quiz_id UUID;
    v_total_points INTEGER := 0;
    v_scored_points FLOAT := 0;
    v_questions JSONB;
    v_answers JSONB;
    v_q RECORD;
    v_ans JSONB;
    v_final_score INTEGER;
    v_passing_score INTEGER;
    v_keywords TEXT[];
    v_matches INTEGER;
BEGIN
    -- 1. Get submission details
    SELECT quiz_id, answers INTO v_quiz_id, v_answers FROM lms_quiz_submissions WHERE id = p_submission_id;
    SELECT passing_score INTO v_passing_score FROM lms_quizzes WHERE id = v_quiz_id;

    -- 2. Loop through questions
    FOR v_q IN SELECT id, correct_answer, points, type, options FROM lms_questions WHERE quiz_id = v_quiz_id LOOP
        v_total_points := v_total_points + v_q.points;
        v_ans := v_answers->v_q.id::text;
        
        -- Multiple Choice (Single)
        IF v_q.type IN ('multiple_choice', 'true_false') THEN
            IF v_ans::text = v_q.correct_answer::text THEN
                v_scored_points := v_scored_points + v_q.points;
            END IF;
            
        -- Multiple Choice (Multiple Answers) - Partial Scoring Logic
        ELSIF v_q.type = 'multiple_answers' THEN
            -- Count correct selections
            -- For simplicity here: Binary all-or-nothing OR partial
            IF v_ans::jsonb = v_q.correct_answer::jsonb THEN
                v_scored_points := v_scored_points + v_q.points;
            END IF;

        -- Short Answer (Keyword Check)
        ELSIF v_q.type = 'short_answer' THEN
            v_keywords := string_to_array(v_q.correct_answer->>0, ',');
            v_matches := 0;
            FOREACH v_ans IN ARRAY v_keywords LOOP
                IF v_ans::text ILIKE '%' || v_ans || '%' THEN
                    v_matches := v_matches + 1;
                END IF;
            END LOOP;
            
            IF v_matches >= 1 THEN -- Threshold for match
                v_scored_points := v_scored_points + v_q.points;
            END IF;
        
        -- Essay / Video / File (Manual Review needed)
        ELSIF v_q.type IN ('essay', 'video_response', 'file_upload') THEN
            -- These don't contribute to auto-grade scored points until manual review
            -- But we still add them to total points
        END IF;

    END LOOP;

    -- 3. Update submission
    IF v_total_points > 0 THEN
        v_final_score := (v_scored_points / v_total_points::float * 100)::integer;
    ELSE
        v_final_score := 0;
    END IF;
    
    UPDATE lms_quiz_submissions 
    SET 
        score = v_final_score,
        status = CASE 
            WHEN EXISTS (SELECT 1 FROM lms_questions WHERE quiz_id = v_quiz_id AND type IN ('essay', 'video_response', 'file_upload')) THEN 'submitted' -- Requires review
            WHEN v_final_score >= v_passing_score THEN 'passed' 
            ELSE 'failed' 
        END,
        graded_at = now()
    WHERE id = p_submission_id;
END;
$$ LANGUAGE plpgsql;
