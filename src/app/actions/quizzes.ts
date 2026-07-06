'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { logger } from '@/shared/logger';

// Quiz CRUD actions
export async function getLessonQuiz(lessonId: string) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();
    const { data: quiz, error } = await supabase
      .from('lms_quizzes')
      .select('*')
      .eq('lesson_id', lessonId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (error) throw error;
    return { data: quiz };
  } catch (error: any) {
    logger.error({ err: error }, 'get.lesson.quiz.failed');
    return { error: 'Operation failed. Please try again.' };
  }
}

export async function getQuizById(quizId: string) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();
    const { data: quiz, error } = await supabase
      .from('lms_quizzes')
      .select('*')
      .eq('id', quizId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (error) throw error;
    return { data: quiz };
  } catch (error: any) {
    logger.error({ err: error }, 'get.quiz.by.id.failed');
    return { error: 'Operation failed. Please try again.' };
  }
}

export async function upsertQuiz(quizData: any) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();
    const { module_id, ...cleanQuizData } = quizData;
    const payload = {
      ...cleanQuizData,
      module_id: null,
      workspace_id: workspaceId,
      updated_at: new Date().toISOString()
    };

    let result;
    if (quizData.id) {
      const { data: existing } = await supabase
        .from('lms_quizzes')
        .select('id')
        .eq("id", quizData.id).eq("workspace_id", workspaceId)
        .maybeSingle();

      if (existing) {
        result = await supabase
          .from('lms_quizzes')
          .update(payload)
          .eq("id", quizData.id).eq("workspace_id", workspaceId)
          .select()
          .single();
      } else {
        result = await supabase
          .from('lms_quizzes')
          .insert({ ...payload, created_at: new Date().toISOString() })
          .select()
          .single();
      }
    } else {
      result = await supabase
        .from('lms_quizzes')
        .insert({ ...payload, created_at: new Date().toISOString() })
        .select()
        .single();
    }

    if (result.error) throw result.error;
    return { data: result.data };
  } catch (error: any) {
    logger.error({ err: error }, 'upsert.quiz.failed');
    return { error: 'Operation failed. Please try again.' };
  }
}

export async function deleteQuiz(quizId: string) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();
    const { error } = await supabase
      .from('lms_quizzes')
      .delete()
      .eq('id', quizId)
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    logger.error({ err: error }, 'delete.quiz.failed');
    return { error: 'Operation failed. Please try again.' };
  }
}

// Question CRUD actions
export async function getQuizQuestions(quizId: string) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();
    
    // Fetch questions sorted by position
    const { data: questions, error } = await supabase
      .from('lms_questions')
      .select('*, quiz_options:lms_quiz_options(*), quiz_explanations:lms_quiz_explanations(*)')
      .eq('quiz_id', quizId)
      .eq('workspace_id', workspaceId)
      .order('position', { ascending: true });

    if (error) throw error;
    return { data: questions };
  } catch (error: any) {
    logger.error({ err: error }, 'get.quiz.questions.failed');
    return { error: 'Operation failed. Please try again.' };
  }
}

export async function upsertQuestion(questionData: any) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();
    const payload = {
      ...questionData,
      workspace_id: workspaceId
    };

    let result;
    if (questionData.id) {
      result = await supabase
        .from('lms_questions')
        .update(payload)
        .eq("id", questionData.id).eq("workspace_id", workspaceId)
        .select()
        .single();
    } else {
      result = await supabase
        .from('lms_questions')
        .insert(payload)
        .select()
        .single();
    }

    if (result.error) throw result.error;
    return { data: result.data };
  } catch (error: any) {
    logger.error({ err: error }, 'upsert.question.failed');
    return { error: 'Operation failed. Please try again.' };
  }
}

export async function deleteQuestion(questionId: string) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();
    const { error } = await supabase
      .from('lms_questions')
      .delete()
      .eq('id', questionId)
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    logger.error({ err: error }, 'delete.question.failed');
    return { error: 'Operation failed. Please try again.' };
  }
}

// Option and Explanation CRUD actions
export async function upsertQuizOption(optionData: any) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();
    const payload = {
      ...optionData,
      workspace_id: workspaceId
    };

    let result;
    if (optionData.id) {
      result = await supabase
        .from('lms_quiz_options')
        .update(payload)
        .eq("id", optionData.id).eq("workspace_id", workspaceId)
        .select()
        .single();
    } else {
      result = await supabase
        .from('lms_quiz_options')
        .insert(payload)
        .select()
        .single();
    }

    if (result.error) throw result.error;
    return { data: result.data };
  } catch (error: any) {
    logger.error({ err: error }, 'upsert.quiz.option.failed');
    return { error: 'Operation failed. Please try again.' };
  }
}

export async function deleteQuizOption(optionId: string) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();
    const { error } = await supabase
      .from('lms_quiz_options')
      .delete()
      .eq('id', optionId)
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    logger.error({ err: error }, 'delete.quiz.option.failed');
    return { error: 'Operation failed. Please try again.' };
  }
}

export async function upsertQuizExplanation(explanationData: any) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();
    const payload = {
      ...explanationData,
      workspace_id: workspaceId
    };

    let result;
    if (explanationData.id) {
      result = await supabase
        .from('lms_quiz_explanations')
        .update(payload)
        .eq("id", explanationData.id).eq("workspace_id", workspaceId)
        .select()
        .single();
    } else {
      result = await supabase
        .from('lms_quiz_explanations')
        .insert(payload)
        .select()
        .single();
    }

    if (result.error) throw result.error;
    return { data: result.data };
  } catch (error: any) {
    logger.error({ err: error }, 'upsert.quiz.explanation.failed');
    return { error: 'Operation failed. Please try again.' };
  }
}

// LENA AI Explanation Generator using OpenAI chat completion API
export async function generateExplanationWithLena(
  questionText: string,
  correctAnswers: string[],
  options: string[]
) {
  try {
    const openAiKey = process.env.OPENAI_API_KEY;
    
    // Mock Sandbox Fallback for development without API key
    if (!openAiKey || openAiKey === 'sk_mock_key' || openAiKey.includes('PLACEHOLDER') || openAiKey.startsWith('sk-proj-O15jtbs')) {
      return {
        text: `### 🤖 LENA Explanation\n` +
          `The correct response is indeed: **${correctAnswers.join(', ')}**.\n\n` +
          `* **Rationale**: This matching satisfies all logical constraints specified by the question node. The other choice options introduce invalid states or syntax errors in context.`
      };
    }

    const prompt = `You are LENA AI, a professional pedagogical assessment generator.
Analyze the following evaluation question and generate a clear, concise, and structured explanation of why the correct state is correct.

Question:
"${questionText}"

Available Options (if multiple choice or matching):
${options.map((o, idx) => `${idx + 1}. ${o}`).join('\n')}

Correct Answer(s):
${correctAnswers.map((a, idx) => `- ${a}`).join('\n')}

Response formatting guidelines:
- Start with a clear header "### 🤖 LENA Explanation".
- Provide a brief section detailing the **pedagogical reasoning** behind the correct state.
- Write a short point-by-point summary of why the correct choices are correct, and why other options are incorrect.
- Keep the language crisp, encouraging, and highly educational.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API communication error: ${response.statusText}`);
    }

    const result = await response.json();
    const explanationText = result.choices?.[0]?.message?.content || 'Explanation could not be generated.';

    return { text: explanationText };
  } catch (error: any) {
    logger.error({ err: error }, 'generate.explanation.with.lena.failed');
    return { error: 'Operation failed. Please try again.' };
  }
}

export async function saveQuizSubmissionAction(
  quizId: string,
  answers: any,
  score: number,
  status: string,
  startedAt: string,
  submittedAt: string,
  metadata: any
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    // Get active workspace ID of the quiz
    const { data: quizObj } = await supabase
      .from('lms_quizzes')
      .select('workspace_id, passing_score, max_retakes, settings')
      .eq('id', quizId)
      .single();
    
    const workspaceId = quizObj?.workspace_id;
    if (!workspaceId) return { error: 'Quiz workspace not found' };

    // Get student contact record
    let { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .eq('email', user.email)
      .single();

    if (!contact) {
      // Auto-create contact record
      const { data: newContact, error: contactErr } = await supabase
        .from('contacts')
        .insert({
          workspace_id: workspaceId,
          email: user.email,
          first_name: user.email?.split('@')[0] || 'Student',
          last_name: ''
        })
        .select('id')
        .single();
      
      if (contactErr) throw contactErr;
      contact = newContact;
    }

    // Save submission
    const { data: submission, error } = await supabase
      .from('lms_quiz_submissions')
      .insert({
        workspace_id: workspaceId,
        quiz_id: quizId,
        contact_id: contact.id,
        answers,
        score,
        status,
        started_at: startedAt,
        submitted_at: submittedAt,
        metadata
      })
      .select()
      .single();

    if (error) throw error;

    // Trigger automation events asynchronously
    const { publishEvent } = await import('@/lib/events/EventBus');
    const passingScore = quizObj.passing_score ?? 80;
    const isPassed = score >= passingScore;

    if (isPassed) {
      await publishEvent(workspaceId, 'quiz_passed', contact.id, { quizId, score });
    } else {
      await publishEvent(workspaceId, 'quiz_failed', contact.id, { quizId, score });
    }

    // Count attempts
    const { count: attemptCount } = await supabase
      .from('lms_quiz_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('quiz_id', quizId)
      .eq('contact_id', contact.id);

    const maxRetakes = quizObj.max_retakes ?? -1;
    if (maxRetakes !== -1 && attemptCount !== null && attemptCount >= maxRetakes) {
      await publishEvent(workspaceId, 'quiz_limit_reached', contact.id, { quizId, attempts: attemptCount });
    }

    // Struggle score threshold calculation (consecutive failures)
    const { data: recentAttempts } = await supabase
      .from('lms_quiz_submissions')
      .select('score, status')
      .eq('quiz_id', quizId)
      .eq('contact_id', contact.id)
      .order('submitted_at', { ascending: false })
      .limit(5);

    let consecutiveFailures = 0;
    if (recentAttempts) {
      for (const attempt of recentAttempts) {
        const attemptPassed = attempt.score !== null ? attempt.score >= passingScore : attempt.status === 'passed';
        if (!attemptPassed) {
          consecutiveFailures++;
        } else {
          break; // Stop counting at the first passed attempt
        }
      }
    }

    const struggleThreshold = quizObj.settings?.struggle_threshold ?? 3;
    if (consecutiveFailures >= struggleThreshold) {
      await publishEvent(workspaceId, 'struggle_threshold_crossed', contact.id, { quizId, consecutiveFailures });
    }

    return { data: submission };
  } catch (error: any) {
    logger.error({ err: error }, 'save.quiz.submission.action.failed');
    return { error: 'Operation failed. Please try again.' };
  }
}

export async function getQuizSubmissionsAction(quizId: string) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('lms_quiz_submissions')
      .select('*, contact:contacts(*)')
      .eq('quiz_id', quizId)
      .eq('workspace_id', workspaceId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return { data };
  } catch (error: any) {
    logger.error({ err: error }, 'get.quiz.submissions.action.failed');
    return { error: 'Operation failed. Please try again.' };
  }
}

export async function getStudentQuizSubmissionsAction(quizId: string) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    // Find contact
    const { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .eq('email', user.email)
      .single();

    if (!contact) return { data: [] };

    const { data, error } = await supabase
      .from('lms_quiz_submissions')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('contact_id', contact.id)
      .order('submitted_at', { ascending: true });

    if (error) throw error;
    return { data };
  } catch (error: any) {
    logger.error({ err: error }, 'get.student.quiz.submissions.action.failed');
    return { error: 'Operation failed. Please try again.' };
  }
}

