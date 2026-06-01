import { z } from 'zod';

// Zod validation schemas for all 8 distinct evaluation formats
export const questionTypeSchema = z.enum([
  'multiple_choice',
  'true_false',
  'short_answer',
  'essay',
  'matching',
  'ordering',
  'rating',
  'file_upload',
  'hotspot',
  'video_response',
  'code_challenge',
  'fill_in_blank'
]);

export const mcqValidation = z.object({
  multi_correct: z.boolean().default(false),
  options: z.array(z.object({
    text: z.string().min(1),
    is_correct: z.boolean()
  })).min(2, 'Multiple choice requires at least 2 options')
});

export const trueFalseValidation = z.object({
  correct_answer: z.boolean(),
  justification_required: z.boolean().default(false)
});

export const shortAnswerValidation = z.object({
  accepted_synonyms: z.array(z.string().min(1)).min(1, 'At least one accepted synonym is required'),
  case_sensitive: z.boolean().default(false)
});

export const matchingValidation = z.object({
  pairs: z.array(z.object({
    left: z.string().min(1),
    right: z.string().min(1)
  })).min(2, 'Matching requires at least 2 pairs')
});

export const orderingValidation = z.object({
  items: z.array(z.string().min(1)).min(2, 'Ordering requires at least 2 items')
});

export const fillInBlankValidation = z.object({
  text_with_blanks: z.string().includes('[blank]', { message: 'Must contain at least one [blank] placeholder' }),
  correct_blanks: z.array(z.string().min(1))
});

export const codeChallengeValidation = z.object({
  starter_template: z.string(),
  runtime_variables: z.record(z.string(), z.any()).optional(),
  assertions: z.array(z.object({
    input: z.string(),
    expected: z.string()
  })).min(1, 'Code challenge requires at least 1 test assertion')
});

export const fileUploadValidation = z.object({
  rubric_criteria: z.array(z.object({
    criteria: z.string().min(1),
    max_points: z.number().int().min(1)
  })).min(1, 'File upload requires at least 1 rubric item')
});
