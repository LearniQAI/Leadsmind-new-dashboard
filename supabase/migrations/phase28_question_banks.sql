-- Phase 28: Question Banks & Randomized Draws

-- 1. Question Metadata
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lms_questions' AND column_name='difficulty') THEN
        ALTER TABLE lms_questions ADD COLUMN difficulty TEXT DEFAULT 'easy' CHECK (difficulty IN ('easy', 'intermediate', 'advanced'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lms_questions' AND column_name='is_bank_question') THEN
        ALTER TABLE lms_questions ADD COLUMN is_bank_question BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. Quiz Bank Config
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lms_quizzes' AND column_name='bank_enabled') THEN
        ALTER TABLE lms_quizzes ADD COLUMN bank_enabled BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lms_quizzes' AND column_name='bank_config') THEN
        ALTER TABLE lms_quizzes ADD COLUMN bank_config JSONB DEFAULT '{"easy": 5, "intermediate": 3, "advanced": 2}';
    END IF;
END $$;

-- 3. Submission set storage
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lms_quiz_submissions' AND column_name='question_pool') THEN
        ALTER TABLE lms_quiz_submissions ADD COLUMN question_pool UUID[]; -- Array of question IDs for this session
    END IF;
END $$;

-- 4. Function to generate a randomized pool
CREATE OR REPLACE FUNCTION fn_generate_quiz_pool(p_quiz_id UUID)
RETURNS UUID[] AS $$
DECLARE
    v_config JSONB;
    v_pool UUID[] := '{}';
    v_q_ids UUID[];
BEGIN
    SELECT bank_config INTO v_config FROM lms_quizzes WHERE id = p_quiz_id;

    -- Draw Easy
    SELECT array_agg(id) INTO v_q_ids FROM (
        SELECT id FROM lms_questions 
        WHERE quiz_id = p_quiz_id AND difficulty = 'easy' AND is_bank_question = true
        ORDER BY random() LIMIT (v_config->>'easy')::int
    ) as t;
    IF v_q_ids IS NOT NULL THEN v_pool := v_pool || v_q_ids; END IF;

    -- Draw Intermediate
    SELECT array_agg(id) INTO v_q_ids FROM (
        SELECT id FROM lms_questions 
        WHERE quiz_id = p_quiz_id AND difficulty = 'intermediate' AND is_bank_question = true
        ORDER BY random() LIMIT (v_config->>'intermediate')::int
    ) as t;
    IF v_q_ids IS NOT NULL THEN v_pool := v_pool || v_q_ids; END IF;

    -- Draw Advanced
    SELECT array_agg(id) INTO v_q_ids FROM (
        SELECT id FROM lms_questions 
        WHERE quiz_id = p_quiz_id AND difficulty = 'advanced' AND is_bank_question = true
        ORDER BY random() LIMIT (v_config->>'advanced')::int
    ) as t;
    IF v_q_ids IS NOT NULL THEN v_pool := v_pool || v_q_ids; END IF;

    RETURN v_pool;
END;
$$ LANGUAGE plpgsql;
