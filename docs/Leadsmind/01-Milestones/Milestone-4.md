---
type: project
milestone: 4
focus: Social Media, AI Marketing & Technical Cleanup
status: current
---

# Milestone 4 — Social Media, AI Marketing & Technical Cleanup

Week 4 of the Full Production-Readiness Plan (28 tasks). **Current milestone,
near final.** Real social-platform integrations, the full AI marketing suite,
and the final technical-cleanup / regression pass.

## Status — two-bucket

### Verified / Fixed (code in-tree; sign-off pending)
- Meta webhook Messenger / Instagram DM handling — signature verification,
  `object` branch split, echo/delivery/read skips, `connection_not_found`
  dead-lettering, placeholder-name profile sync + backfill route. See
  [[Communications-Hub]].
- AI suite endpoints + migrations present for every listed feature (revenue
  forecast `20260819000000`, landing copy `20260821000000`, ad copy
  `20260822000000`, image gen `20260823000000`, course RAG `20260824000000`,
  lesson summaries `20260825000000`). See [[AI-Suite]].
- Social OAuth callbacks present for facebook / linkedin / tiktok / youtube;
  publish + comments + analytics libs in `src/lib/social/`; scheduled publish
  cron `src/app/api/cron/publish/route.ts`.
- Lockdown sweep migrations landed — [[2026-08-31-lockdown-sweep]].

### Deliberately Deferred / Open
- **LinkedIn / TikTok publish still fakes success** until the real publish path
  ships — [[Social-OAuth-Integrations]].
- Engagement-analytics panel is still a placeholder pending real ingestion.
- Cleanup tasks 78–85 (currency display, page titles, ALL-CAPS, page-tree /
  Transfer-page fate, duplicate file/table removal) — not done. Individual
  rows on [[Deferred-Items-Tracker]] (D9 Lead Finder map, plus D1/D2/D3 table
  drops).
- Final end-to-end regression + production build verification — not run.
- Full security-audit live verification — [[Deferred-Items-Tracker]] D6.

## Scope

### Communications Hub fixes
- Meta webhook failures for **Messenger** and **Instagram DM** inbound events
  (`src/app/api/webhooks/meta/route.ts`): `object` = `page` vs `instagram`
  branch handling, `entry[].messaging[]` loop, echo/delivery/read skips,
  placeholder-name profile sync, and dead-letter recording of
  `connection_not_found` routing gaps (`webhook_dead_letters`, surfaced via
  `src/app/api/admin/meta/backfill-profile-sync/route.ts` and
  `src/app/api/admin/dead-letters`).
- LinkedIn / TikTok social publishing currently fakes success — replace with
  real publish. See [[Social-OAuth-Integrations]].

### Social Media OAuth + publish (build)
- Real connect + publish for **LinkedIn, TikTok, YouTube, Facebook, Instagram**
  (and X/Twitter per plan). OAuth callbacks:
  `src/app/api/auth/callback/{facebook,linkedin,tiktok,youtube}/route.ts`;
  publish path `src/lib/social/publish.ts`, `src/app/actions/social.ts`.
- Unified post-scheduling calendar across all platforms
  (`src/app/social/calendar`) + scheduled publishing worker
  (`src/app/api/cron/publish/route.ts`).
- Unified comment inbox (`src/app/social/inbox`, `src/lib/social/comments.ts`,
  `src/app/actions/socialComments.ts`).
- Real engagement-analytics ingestion (`src/app/social/analytics`,
  `src/lib/social/analytics.ts`, `src/app/actions/socialAnalytics.ts`),
  replacing the placeholder panel.
- See [[Social-OAuth-Integrations]].

### AI module suite (build)
- **Revenue forecasting** — `src/app/api/finance/revenue-forecast/route.ts`,
  `src/lib/finance/revenueForecast.ts`, `20260819000000_revenue_forecasts.sql`
  (JSONB `forecast_result`, `expires_at` staleness marker).
- **Campaign-performance recommendations** — `src/app/actions/aiRecommendations.ts`.
- **Video / Reels / TikTok script + hashtag generators** —
  `src/app/api/social/video-script/route.ts`, `src/app/social/VideoScriptGenerator.tsx`.
- **AI landing page copy generator** — `src/app/api/builder/landing-copy/route.ts`,
  `20260821000000_landing_page_copy_generations.sql`.
- **AI ad-copy generators** (Facebook / Google / LinkedIn) —
  `src/app/api/ads/copy-generator/route.ts`, `20260822000000_ad_copy_generations.sql`.
- **AI image / graphic generation** — `src/app/api/ai/image-generator/route.ts`,
  `src/app/social/ImageGenerator.tsx`, `20260823000000_ai_image_generations.sql`.
- **Course RAG / Q&A over course content** (pgvector) —
  `src/app/api/lms/course-qa/route.ts`, `src/lib/lms/ragPipeline.ts`,
  `src/lib/lms/chunking.ts`, `src/lib/ai/embeddings.ts`,
  `20260824000000_course_qa_rag.sql` (`course_content_chunks`, `vector(1536)`,
  text-embedding-3-small, HNSW cosine index, `match_*` RPC).
- **Lesson summaries / lesson notes** — `src/app/api/lms/lesson-summary/route.ts`,
  `src/lib/lms/summaryPipeline.ts`, `20260825000000_lesson_summaries.sql`.
- Shared: `src/lib/ai/AIService.ts`, `PromptManager.ts`, `src/app/actions/ai.ts`,
  AI credit metering via `src/lib/ai/creditGuard.ts`. See [[AI-Suite]].

### Technical cleanup (tasks 75–87)
- Content Studio → main navigation; Lead Finder real map (replace fake map).
- Currency-display bug fixes — Affiliates page, Dashboard, Invoice builder.
- Missing page titles across the platform; ALL-CAPS display bugs on real
  customer data.
- Decide fate of old disconnected HR/CRM page trees and the Transfer page
  (`src/app/transfer`); clean up confirmed-unused duplicate files / DB tables
  (e.g. `workspace_webhooks`, `contact_tags_registry`).
- Complete security audit of remaining API routes. See
  [[03-Security-Audits/README|Security Audits]].
- Final end-to-end regression pass + production build verification (`build.log`).

## Related modules
[[Communications-Hub]] · [[Social-OAuth-Integrations]] · [[AI-Suite]] ·
[[Marketing-Automation]] · [[Finance-Billing]] · [[LMS]]

## Prev
[[Milestone-3]]
