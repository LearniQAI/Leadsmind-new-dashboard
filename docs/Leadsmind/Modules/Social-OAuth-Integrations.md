---
type: module
---

# Social Media / OAuth Integrations

## Purpose

Connect a workspace's social accounts (LinkedIn, TikTok, YouTube, Facebook,
Instagram, X/Twitter), publish and schedule posts across them, manage comments
in a unified inbox, and ingest engagement analytics. Also the home of the
generic outbound OAuth plumbing (state nonces, token hashing) shared with the
payment-gateway and calendar connect flows.

## Key Files

- Pages: `src/app/social` (`SocialPlannerClient.tsx`, `calendar`, `connections`,
  `inbox`, `analytics`, `ImageGenerator.tsx`, `VideoScriptGenerator.tsx`),
  `src/app/ai-studio`, `src/app/content-studio`.
- OAuth callbacks: `src/app/api/auth/callback/{facebook,linkedin,tiktok,youtube}/route.ts`,
  `src/app/api/auth/{google,meta,microsoft}/`, `src/app/api/oauth/{authorize,token}`,
  `src/app/api/meta/connections`.
- Publish / analytics libs: `src/lib/social/publish.ts`, `comments.ts`,
  `analytics.ts`; `src/lib/oauth/stateNonce.ts`; `src/lib/meta/MetaAdapter.ts`.
- Server actions: `social.ts`, `socialAnalytics.ts`, `socialComments.ts`,
  `socialImport.ts`, `youtubeImport.ts`, `blog.ts` / `blogStudio.ts`
  (`social-import`, `voice-import`).
- Scheduled publishing worker: `src/app/api/cron/publish/route.ts`.

## API Routes / DB Tables

- Routes: `src/app/api/social/{publish,video-script}`,
  `src/app/api/auth/callback/*`, `src/app/api/oauth/*`,
  `src/app/api/meta/connections`, `src/app/api/blog/{social-import,voice-import}`,
  `src/app/api/cron/{publish,tracking-sync}`.
- Tables: `platform_connections` / `connections` (OAuth tokens, hashed —
  `20260830000000_hash_oauth_tokens.sql`; RLS tightened
  `20260725000005_tighten_connections_rls.sql`), `oauth_state_nonces`
  (`20260723000001`), `oauth_clients` (admin/owner-only RLS
  `20260725000002`), scheduled-post / social-analytics tables,
  `webhook_dead_letters` (used for Meta routing gaps).

## Known Issues

- **LinkedIn / TikTok publishing fakes success today** — [[Milestone-4]] task 75;
  real connect + publish is tasks 88–91.
- **TikTok callback** derives a placeholder display name from the account id when
  the profile-name fetch fails rather than failing the connection
  (`src/app/api/auth/callback/tiktok/route.ts:45,57`).
- Engagement analytics panel is a placeholder — task 94 replaces it with real
  ingestion.
- No unified scheduling calendar / comment inbox yet — tasks 92–93.
- The generic OAuth-provider `oauth_clients` UPDATE policy has zero callers
  (harmless dead policy, not removed — security review section E).
- OAuth token minting endpoint (`src/app/api/oauth/*`, `oauth_clients`) and the
  `createOAuthClient`/`deleteOAuthClient`/`getOAuthClients` actions were
  unauthenticated / member-accessible — locked to admin/owner in [[Milestone-1]]
  (task 4).

## Related Tasks

[[Milestone-1]] (unauthenticated API-key / OAuth-client minting fix, OAuth state
nonces, token hashing) · [[Milestone-4]] (real LinkedIn/TikTok/YouTube/X/
Facebook/Instagram connect + publish, unified scheduling calendar, comment
inbox, engagement-analytics ingestion, scheduled publishing worker)
