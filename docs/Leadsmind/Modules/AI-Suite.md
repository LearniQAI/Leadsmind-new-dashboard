---
type: module
---

# AI Suite

## Purpose

All LLM-backed features: content and copy generation, marketing recommendations,
revenue forecasting, LMS AI (quiz/question generation, essay grading, lesson
summaries, RAG Q&A over course content), image generation, and the LENA
conversational assistant. Usage is metered against per-workspace AI credits.

## Key Files

- Core libs: `src/lib/ai/` — `AIService.ts`, `PromptManager.ts`,
  `AIInsightEngine.ts`, `AIAnalyticsInterpreter.ts`, `AIWorkflowAdvisor.ts`,
  `AIFormGenerator.ts`, `embeddings.ts`, `creditGuard.ts` (+ tests).
- Server actions: `ai.ts`, `aiRecommendations.ts`, `builderAI.ts`,
  `grammarChecker.ts`, `plagiarismChecker.ts`, `seoChecker.ts`.
- LMS AI: `src/lib/lms/ragPipeline.ts`, `chunking.ts`, `summaryPipeline.ts`,
  `gradeQuiz.ts`.
- Finance AI: `src/lib/finance/revenueForecast.ts`.
- LENA: `src/lib/lena/`, `src/app/api/lena/*` (`agents`, `chat`, `config`,
  `conversations`, `embed`, `knowledge`, `messages`), `src/app/api/support/lena/`,
  `src/app/api/portal/lena/`, `src/app/settings/lena-chat/`.
- Studios: `src/app/ai-studio` (`content`, `research`), `src/app/social`
  (`ImageGenerator.tsx`, `VideoScriptGenerator.tsx`).

## API Routes / DB Tables

- Routes: `src/app/api/ai/{generate,generate-module-description,
  generate-questions,image-generator,lena}`,
  `src/app/api/v1/ai/content/generate`,
  `src/app/api/lms/{course-qa,lesson-summary,remedial,struggle}`,
  `src/app/api/ads/copy-generator`, `src/app/api/builder/landing-copy`,
  `src/app/api/social/video-script`, `src/app/api/finance/revenue-forecast`,
  `src/app/api/content-studio/grammar`, `src/app/api/blog/voice-import`,
  `src/app/api/cron/quota-refill`.
- Tables / migrations: `revenue_forecasts` (`20260819000000` — JSONB result,
  `expires_at` staleness), `landing_page_copy_generations` (`20260821000000`),
  `ad_copy_generations` (`20260822000000`), `ai_image_generations`
  (`20260823000000`), `course_content_chunks` (`20260824000000` — pgvector
  `vector(1536)`, text-embedding-3-small, HNSW cosine index, `match_*` RPC),
  `lesson_summaries` (`20260825000000`), `ai_generations` /
  `ai_research_reports`, `ai_usage_credits` (writes locked down
  `20260722000002_lock_down_ai_usage_credits_writes.sql`).

## Known Issues

- **Mock fallbacks everywhere:** `src/app/api/ai/generate/route.ts:25`,
  `generate-module-description/route.ts:25`, `generate-questions/route.ts:103`,
  `ai/lena/write/route.ts:37`, `webhooks/twilio/inbound/route.ts:132` all return
  canned text when the OpenAI key is missing, equals `sk_mock_key`, contains
  `PLACEHOLDER`, or starts with `sk-proj-O15jtbs`. Fine for sandbox; make sure
  production keys don't trip these checks.
- **AI credit top-up free-access exploit (fixed in [[Milestone-1]], task 12):**
  `ai_usage_credits` write policy locked down; `creditGuard.ts` enforces
  metering.
- `course_content_chunks.source_reference` citation titles can go stale (see
  [[LMS]]).
- Reputation send-request has a mock dispatch fallback with a `mock_number_id`
  Meta adapter (`src/app/api/reputation/send-request/route.ts:152`).

## Related Tasks

[[Milestone-1]] (AI credit exploit fix) · [[Milestone-2]] (AI ad-copy / landing
copy generators) · [[Milestone-3]] (AI essay grading, AI-generated quizzes —
see [[Milestone-3]]) · [[Milestone-4]] (revenue forecasting,
campaign recommendations, video/hashtag generation, image generation, course
RAG/Q&A, lesson summaries)
