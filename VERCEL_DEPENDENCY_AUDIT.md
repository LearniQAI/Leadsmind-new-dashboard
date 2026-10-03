# Vercel Dependency Audit — migration to Cloudflare (Workers via OpenNext)

Audit date: 2026-10-02. Branch `saas-onboarding-flow`. Read-only audit; no code/config/env files were changed.
Stack as found: Next.js 14.2.35 (`package.json`), Node 24 (`package.json` engines, `.nvmrc:1`), Supabase, Inngest 4.18.1.
All paths are repo-relative. Env var **names only** — no values were read or printed.

Method note: every claim below cites a file:line that was read in this audit. Where the claim is about *runtime behavior on Cloudflare* (which cannot be proven by reading this repo), it is placed in bucket E2 rather than asserted. "Cloudflare equivalent" column is the proposed target, not something verified in this repo.

---

## A. Summary table

| # | Area | File:line | What it depends on | Cloudflare equivalent | Effort | Risk if missed |
|---|------|-----------|--------------------|-----------------------|--------|----------------|
| 1 | Cron | `vercel.json:3-124` | 30 Vercel Cron entries (`crons`) hitting `/api/cron/*` | Workers Cron Triggers + a custom `scheduled()` handler that `fetch`es the app with `Authorization: Bearer $CRON_SECRET` (OpenNext emits none) | High | **High** — all queue dispatch/sweeps stop silently |
| 2 | Cron schedule density | `vercel.json:105-107`, `49-51`, `53-55` | 3 jobs at `* * * * *` (task-reminders, message-dispatch, gmail-sync) | Cron Triggers (min 1 min) — fine, but each counts as a Worker invocation | Low | Med |
| 3 | Custom domains API | `src/lib/domains/vercel.ts:4-6,9,32,64,70,113` | Vercel REST `api.vercel.com` `/v10|v9/projects/{id}/domains`, `/v6/domains/{h}/config` using `VERCEL_API_TOKEN/PROJECT_ID/TEAM_ID` | Cloudflare for SaaS **Custom Hostnames API** (create / get status / delete; SSL cert + ownership validation) | High | **High** — tenant custom domains + SSL stop working |
| 4 | Domain verify pipeline | `src/lib/domains/verify.ts:3,10,68,73,142,219` | Stages `vercel_add`/`vercel_status` hard-coded; `misconfigured`/`verified` fields are Vercel's response shape | Rewrite stage logic against CF custom-hostname `status` / `ssl.status` | High | High |
| 5 | Domain release on delete | `src/app/actions/domains.ts:6,387-389`, `src/app/actions/builderDeploy.ts:11,203-204,232-233` | `releaseHostFromVercel` before row delete; row kept if Vercel refuses | Same call → CF custom-hostname delete | Med | Med (orphaned hostnames) |
| 6 | Domain re-verify cron | `src/app/api/cron/workers/domain-verification/route.ts:5,8-9,24,46` | `maxDuration=60`, 50 s time budget, calls Vercel via `verify.ts` | Cron Trigger → same route; replace Vercel calls | Med | Med |
| 7 | DNS target shown to customers | `src/lib/domains/config.ts:3`, `src/lib/domains/verify.ts:83`, `src/components/builder/WebsiteSettings.tsx:9,292`, `src/app/actions/help.ts:404,407,413` | CNAME target `domains.leadsmind.io` "attached to the Vercel project" (`config.ts:1-2`) | CF for SaaS **fallback origin** / CNAME target; update UI copy + help articles | Med | **High** — every tenant's DNS currently points at Vercel via this name |
| 8 | Wildcard tenant subdomains | `src/lib/domains/resolve.ts:3,62-65` | `{slug}.leadsmind.com` resolved by Host header; reserved set `www,app,api,track,domains,apex` (`resolve.ts:4`) | Wildcard DNS + Worker route `*.leadsmind.com/*`; Advanced Certificate Manager for wildcard cert | Med | High |
| 9 | Host-based middleware | `src/middleware.ts:50-52,129,238-243`; `src/lib/domains/platformHosts.ts:7-15` | Host-header routing on every request (matcher excludes only static/image) | OpenNext supports edge middleware; verify host header preservation through CF proxy | Med | High |
| 10 | Platform host lists | `src/lib/domains/platformHosts.ts:7-15`, `src/lib/lena/embedOrigin.ts:4` | Hard-coded platform hosts incl. `leadsmind.vercel.app` (`embedOrigin.ts:4`) | Update list for new hostnames | Low | Med |
| 11 | `waitUntil` (@vercel/functions) | `src/lib/events/EventBus.ts:3,78`; `src/modules/tags/sync/syncContactTags.ts:3,55,115,149`; `src/modules/tags/autoTagging/applySystemTag.ts:3,86`; `src/shared/logger/requestTiming.ts:1,72`; `src/app/api/audio/[id]/stream/route.ts:9,124`; `src/app/api/video/[id]/stream/route.ts:6,68`; `src/app/api/v1/contacts/route.ts:8,78,104`; `src/app/api/public/forms/[id]/submit/route.ts:7,589,629` | `@vercel/functions` `waitUntil` to finish work after response. Code's own comment says it is a **no-op outside a Vercel context** (`EventBus.ts:63-67`) | `ctx.waitUntil` via `getCloudflareContext()` (OpenNext) — shim one module | Med | **High** — silent loss of automation triggers, tag sync, timing rows, cache fills |
| 12 | Fire-and-forget EventBus callers | `src/lib/events/EventBus.ts:59-66` (comment) + 40 `publishEvent(` calls in 29 files | Callers deliberately don't `await`; correctness depends on `waitUntil` | Fix the shim in #11 (single point) | Low (after #11) | High |
| 13 | Vercel package | `package.json` `@vercel/functions ^3.9.1` | Only `@vercel/*` dependency | Remove after shim | Low | Low |
| 14 | Vercel build gate | `vercel.json:2`, `scripts/vercel-ignore-build.sh:28,36,45` | `ignoreCommand` using `VERCEL_ENV`, `VERCEL_GIT_COMMIT_REF`, `VERCEL_GIT_PULL_REQUEST_ID`, `VERCEL_GIT_PREVIOUS_SHA` | Cloudflare Workers Builds "build watch paths" / GitHub Actions path filters | Low | Low |
| 15 | `.vercelignore` | `.vercelignore:1-5` | excludes `scratch/`, `scripts/db-checks/`, `*.log`, `*.sql` from upload | `.assetsignore`/wrangler `exclude` equivalents (or n/a with git-based builds) | Low | Low |
| 16 | File tracing for binaries | `next.config.js:66-205` (`outputFileTracingIncludes`, 18 route keys) | `@vercel/nft` tracing (named in `next.config.js:66`) force-includes `@sparticuz/chromium` + `puppeteer-core` into 16 route bundles, `pdfjs-dist` into 2 | N/A on Workers — nothing here transfers; chromium cannot ship in a Worker | High | **High** |
| 17 | Headless Chromium PDF (shared helper) | `src/lib/pdf/htmlToPdf.ts:1-2,11,23,28,32`; callers `src/lib/quotes/sendQuoteEmail.ts:94`, `src/lib/invoices/sendInvoiceEmail.ts:111`, `src/app/api/pdf/route.ts:19`, `src/app/api/hr/payslips/[id]/download/route.ts:66` | `@sparticuz/chromium` (Amazon-Linux binary, comment `htmlToPdf.ts:11`) + `puppeteer-core` | Cloudflare **Browser Rendering** (`@cloudflare/puppeteer`) or an external PDF service/Container | High | **High** — quote/invoice send, payslips, `/api/pdf` |
| 18 | Chromium: certificates | `libs/services/src/pdf/cert-generator.ts:1-2,39,42`; `src/app/api/student/courses/[id]/certificate/route.ts:8,120` | same | same | High | High |
| 19 | Chromium: bookkeeping report | `libs/services/src/pdf/bookkeeping-report-generator.ts:1-2,11`; `src/app/api/finance/documents/[id]/export/route.ts:4` | same | same | High | Med |
| 20 | Chromium: KYC report (**sibling gap**) | `src/app/api/kyc/reports/download/[contactId]/route.ts:2-3,535` | chromium+puppeteer, **not** in `outputFileTracingIncludes` (grep of `next.config.js` finds no key for it) | same as #17; also latent bug on Vercel today | High | Med |
| 21 | Chromium: SEO crawler | `src/lib/seo-crawler.ts:117,120` | `require('@sparticuz/chromium')` | Browser Rendering | Med | Low |
| 22 | pdfjs-dist worker | `next.config.js:34` (externals), `:90-95` (tracing includes); cron `/api/cron/workers/document-processing` (`route.ts:18`) | webpack can't resolve `pdf.worker.mjs` (`next.config.js:20-25` comment) | Use `pdfjs-dist` legacy build with inline/fake worker, or `unpdf`; test in Worker | Med | Med |
| 23 | child_process binaries | `src/app/api/blog/voice-import/route.ts:5,33-35` (`ffmpeg`), `src/app/actions/youtubeImport.ts:6,24-27` (`yt-dlp`) | shell-out to host binaries (`exec`) | **Not possible in Workers.** Cloudflare Containers or an external media service | High | Med (feature dies) |
| 24 | Node `fs`/`path` font reads | `src/lib/avatar/generateAvatarPng.ts:4-5,11-18`; `generateWaveformPng.ts:4-5`; `src/lib/builder/countdownImage.ts:17-18,24-26` | `fs.readFileSync(process.cwd()+'src/lib/avatar/roboto-medium.ttf')` | Import font as asset/ArrayBuffer at build time | Low | Med |
| 25 | Native/WASM image stack | `package.json` `@resvg/resvg-js`, `satori`, `harfbuzzjs`, `sharp`; `next.config.js:34` externals; `:26-31` (hb.wasm path bug) | native `.node` binaries (resvg, sharp) | `@resvg/resvg-wasm`, satori's WASM path; sharp → Cloudflare Images | Med | Med |
| 26 | `node:dns`/`https`/`net` | `src/lib/domains/verify.ts:1,8,41`; `src/lib/email/senderDomainVerification.ts:1,12`; `src/lib/security/validateUrl.ts:1-4,156` | `dns.promises.resolveTxt`, `dns.promises.lookup`, `https`/`net` for SSRF guard | DNS-over-HTTPS (1.1.1.1 JSON) for TXT; SSRF guard needs redesign (no `lookup` pinning) | Med | **High** — `validateUrl` is a security control |
| 27 | Absolute-URL fallbacks to `*.vercel.app` | `src/lib/meta/config.ts:4`; `src/app/api/auth/meta/callback/route.ts:21`; `src/lib/email/unsubscribeLink.ts:8,19`; `src/lib/builder/emailRenderer.ts:129` | `NEXT_PUBLIC_APP_URL ?? 'https://leadsmind-new-dashboard.vercel.app'` | Set `NEXT_PUBLIC_APP_URL`; remove fallbacks | Low | **High** — unsubscribe links in sent mail point at vercel.app if the var is ever unset |
| 28 | OAuth redirect URIs built from `NEXT_PUBLIC_APP_URL` | 20+ sites, e.g. `src/app/api/auth/gmail/route.ts:29`, `.../google/route.ts:12`, `.../google-calendar/route.ts:40`, `.../microsoft/route.ts:31`, `.../zoom/route.ts:30`, `src/app/actions/social.ts:266,275,282,300`, `src/app/actions/seo.ts:34`, `src/app/actions/stripeConnect.ts:31` | Provider-side registered redirect URIs match current domain | Re-register URIs at Google/Meta/TikTok/LinkedIn/Zoom/Microsoft/Stripe **if hostname changes**; none if hostname stays | Med | High |
| 29 | Webhook URLs registered at providers | `src/lib/twilio/inboundWebhook.ts:14,43-45`; `src/lib/gmail/pubsubAuth.ts:16,15-17`; `src/lib/email/verifyResendWebhook.ts:8,21`; `src/lib/twilio/ivrRouter.ts:146-202`; `src/app/actions/funnelOrders.ts:212,251`; `src/app/actions/courseCommerce.ts:464`; `src/app/actions/finance.ts:458,1084` | Twilio/Resend/Gmail Pub/Sub/PayFast/Ozow call current domain; Twilio signature validated against rebuilt URL (`inboundWebhook.ts:55-57` comment) | Same hostname after cutover = no change; else update each provider | Med | High |
| 30 | DB trigger → hard-coded prod URL | `supabase/migrations/20240101000100_phase57_sprint5_launch_alert.sql:36,47` | `pg_net` POSTs to `https://www.leadsmind.io/api/webhooks/article-updated` | Keep if domain unchanged; otherwise new migration | Low | Med |
| 31 | Inngest serve endpoint | `src/app/api/inngest/route.ts:1-11` (`serve` from `inngest/next`, `GET/POST/PUT`) ; `src/lib/inngest.ts:20` (`id:'leadsmind'`) | Inngest Cloud syncs against the deployed URL; keys `INNGEST_EVENT_KEY/SIGNING_KEY` (`.env.example:85-86,146-147`) | Re-sync app URL in Inngest dashboard after cutover; or `inngest/cloudflare` serve | Med | High |
| 32 | Inngest function calls cron route in-process | `src/lib/inngest/functions/campaignDispatch.ts:2,24-30` | Imports route `GET` and invokes with synthetic `http://internal/...` Request + `CRON_SECRET` | Works in-process; no change | Low | Low |
| 33 | Request body limit assumption | `src/app/api/lms/upload/route.ts:23-24` (25 MB), `src/app/api/finance/documents/route.ts:22` (15 MB), `src/app/api/support/attachments/route.ts:25` (25 MB); client handler `src/components/builder/MediaVaultModal.tsx:131` (413) | App limits exceed Vercel's 4.5 MB platform limit (limit itself is Vercel doc knowledge, not in repo) | CF request limit is higher by plan; **upside**, verify in POC | Low | Low |
| 34 | `maxDuration` on long routes | `src/app/api/audio/[id]/stream/route.ts:15` (300), `src/app/api/video/[id]/stream/route.ts:14` (300), `src/app/api/v1/ai/research/batch/route.ts:13` (90), `src/app/api/ai/image-generator/route.ts:14` (60), `src/app/api/pdf/route.ts:6` (60), `src/app/api/kyc/reports/download/[contactId]/route.ts:10` (60), `src/app/api/webhooks/gmail/push/route.ts:9` (60), `src/app/api/public/forms/[id]/submit/route.ts:25` (20), OAuth callbacks (30) | Vercel function duration config | Workers have no wall-clock cap while client connected, but **CPU-time** caps instead; `maxDuration` is ignored | Med | Med |
| 35 | Cache-fill background work | `src/app/api/video/[id]/stream/route.ts:7-12,68`; `src/lib/lms/video/videoCache.ts`; audio equivalent | `waitUntil(fillVideoCache)` copies up to ~200 MB (comment `video/.../route.ts:9-11`) into Storage after the response, sharing `maxDuration` | Workers memory (128 MB) + `ctx.waitUntil` 30 s post-response limit make this unlikely to work as-is → Queues/Container | High | Med |
| 36 | Vercel request id header | `src/app/public/forms/[id]/page.tsx:98` | `x-vercel-id` for log correlation (falls back to `x-request-id`) | `cf-ray` | Low | Low |
| 37 | Client IP headers | ~28 files read `x-forwarded-for` / `x-real-ip` (see §C.2), e.g. `src/app/api/webhooks/payfast/route.ts:56-57`, `src/lib/affiliate/attribution.ts:59`, `src/app/r/[code]/route.ts:48` | IP for rate-limit, consent log, PayFast source-IP allowlist, affiliate fraud | Use `cf-connecting-ip`; `x-forwarded-for` is present on CF but format/first-hop semantics must be verified | Med | **High** for PayFast IP check + consent audit trail |
| 38 | `req.ip` usage | `src/lib/affiliate/attribution.ts:59`, `src/app/r/[code]/route.ts:48` | `NextRequest.ip` is populated by Vercel's platform; undefined elsewhere (Next 14 behavior, not in repo) | `cf-connecting-ip` | Low | Med |
| 39 | `x-forwarded-host` for tenant resolve | `src/app/actions/publicBlog.ts:17`, `src/lib/blog/publicWorkspace.ts:12,31`, `src/app/actions/calendar/core.ts:28` | host from forwarded header → tenant lookup | Verify CF forwards original Host / sets `x-forwarded-host` (OpenNext) | Med | High |
| 40 | In-memory rate limiter | `src/lib/rateLimit.ts:4-7` | Per-instance memory; comment names "Redis/Upstash/Vercel KV" | Workers isolates are even more ephemeral → Durable Objects / KV / Rate Limiting binding | Med | Med |
| 41 | next/image optimizer | `next.config.js:15-31` (`remotePatterns`: Supabase host, `lh3.googleusercontent.com`, `avatars.githubusercontent.com`); 41 files use `<Image`; 1 `unoptimized` use | Vercel image optimization (+`sharp`) | OpenNext CF image loader / Cloudflare Images, or `loader` config | Med | Med |
| 42 | ISR / on-demand revalidation | 289 `revalidatePath(` calls (top: `src/app/actions/tags.ts` 17, `seo.ts` 14, `contacts.ts` 14); `generateStaticParams` in `src/app/(marketing)/solutions/[slug]/page.tsx:11`, `.../docs/[slug]/page.tsx:11`; `force-static` `src/app/sitemap-marketing.xml/route.ts:1` | Vercel data/full-route cache | OpenNext incremental cache → R2/KV + tag cache (D1/DO) must be configured | Med | Med (stale pages) |
| 43 | Sitemap/RSS CDN caching | `src/app/sitemap.xml/route.ts:43`, `rss.xml/route.ts:63`, `sitemap-articles.xml/route.ts:39` | `s-maxage` + `stale-while-revalidate` honored by Vercel edge | CF cache honors `s-maxage`; SWR semantic differs | Low | Low |
| 44 | `dynamic = 'force-dynamic'` | 306 files (grep `export const dynamic`; 305 `force-dynamic`, 1 `force-static`) | n/a — portable | none | Low | Low |
| 45 | Observability: pino JSON logs | `src/shared/logger/index.ts:1-50`; `src/lib/observability.ts:2` ("fallback to structured JSON logging for Vercel/Datadog") | Output relies on stdout → Vercel Logs. Sentry code is commented out (`observability.ts:25,47-52`) | Workers Logs / Logpush; `pino` Node transport/worker threads need verification | Med | Med |
| 46 | App-level request timings | `src/shared/logger/requestTiming.ts:72-91`; `supabase/migrations/20260930000022_request_timings.sql:56-66` | Writes `request_timings` via `waitUntil`; pg_cron cleanup | Fix #11; pg_cron is Supabase-side, unaffected | Low | Low |
| 47 | Health page copy | `src/app/system/health/page.tsx:63` | Static text "Vercel Edge Network" (not a real probe) | Edit text | Low | Low |
| 48 | CI | `.github/workflows/ci.yml:3-4,8` | Platform-independent tests; comment mentions Vercel only; **no deploy step** | Add wrangler deploy step | Low | Low |
| 49 | Timezone assumption | `scripts/db-checks/task62-verify.ts:15` (`process.env.TZ='UTC'; // match Vercel production`), `src/app/actions/calendar/scheduling.ts:521`, `src/lib/calendar/displayTime.ts:110`, `src/lib/calendar/notifications.ts:79` | Code comments assume server TZ = UTC (Vercel). Workers run UTC | None expected; confirm in POC | Low | Low |
| 50 | Unused heavy deps | `package.json`: `jspdf` (32 MB on disk), `unzipper` | Zero imports of either in `src/ libs/ server/ workers/` (grep returned nothing) | Remove | Low | Low |

Total findings: **50**.

---

## B. Cron inventory

### B.1 Vercel crons registered in `vercel.json` (30)

Auth for **all**: `Authorization: Bearer ${CRON_SECRET}` string compare; handler throws `[FATAL] CRON_SECRET env var is not configured` if unset. Pattern at e.g. `src/app/api/cron/workers/message-dispatch/route.ts:22-26`. `reminders` and `waitlist-offers` use the inline form `authHeader !== \`Bearer ${process.env.CRON_SECRET}\`` (`reminders/route.ts:16`, `waitlist-offers/route.ts:14`). No `x-vercel-cron` header or user-agent check exists anywhere (grep `x-vercel-cron` → 0 hits) — **good for portability**: any scheduler that sends the Bearer header works.

| # | Path | Schedule | vercel.json line | Handler file | `runtime`/`maxDuration` | Node-only APIs / heavy deps |
|---|------|----------|------|------|------|------|
| 1 | `/api/cron/affiliate-recurring` | `0 0 1 * *` | 5 | `src/app/api/cron/affiliate-recurring/route.ts` | nodejs | none direct |
| 2 | `/api/cron/affiliate-onboarding` | `0 9 * * *` | 9 | `.../affiliate-onboarding/route.ts` | — | none direct; batch `.limit(50)` "to prevent timeout" (`:25`) |
| 3 | `/api/cron/quota-refill` | `0 0 * * *` | 13 | `.../quota-refill/route.ts` | — | none direct (two auth blocks `:45`,`:61` → GET and POST) |
| 4 | `/api/cron/tracking-sync` | `0 4 * * *` | 17 | `.../tracking-sync/route.ts` | — | none direct |
| 5 | `/api/cron/workers/campaign-dispatch` | `*/15 * * * *` | 21 | `.../workers/campaign-dispatch/route.ts` | nodejs | `crypto` (`:` import). **Also invoked in-process by Inngest** (`campaignDispatch.ts:2,29`) |
| 6 | `/api/cron/workers/workflow-resume` | `*/15 * * * *` | 25 | `.../workers/workflow-resume/route.ts` | nodejs; **45 s `TIME_BUDGET_MS` (`:13`)** | `crypto`; transitively **chromium+puppeteer** (send_invoice step; `next.config.js:196-199`) |
| 7 | `/api/cron/workers/automation-jobs-reconciler` | `*/5 * * * *` | 29 | `.../automation-jobs-reconciler/route.ts` | nodejs | none direct |
| 8 | `/api/cron/workers/social-scheduled-dispatch` | `*/5 * * * *` | 33 | `.../social-scheduled-dispatch/route.ts` | nodejs | none direct |
| 9 | `/api/cron/publish` | `*/5 * * * *` | 37 | `.../publish/route.ts` | — | none direct |
| 10 | `/api/cron/workers/social-comment-sync` | `*/5 * * * *` | 41 | `.../social-comment-sync/route.ts` | nodejs | none direct (234 lines) |
| 11 | `/api/cron/workers/whatsapp-dispatch` | `*/5 * * * *` | 45 | `.../whatsapp-dispatch/route.ts` | nodejs | `crypto` |
| 12 | `/api/cron/workers/message-dispatch` | `* * * * *` | 49 | `.../message-dispatch/route.ts` | nodejs | `crypto` |
| 13 | `/api/cron/workers/gmail-sync` | `* * * * *` | 53 | `.../gmail-sync/route.ts` | nodejs; **`maxDuration=60` (`:8`), 45 s budget (`:15`)** | none direct; uses `jose` + Gmail HTTP |
| 14 | `/api/cron/workers/message-delivery-health` | `*/15 * * * *` | 57 | `.../message-delivery-health/route.ts` | nodejs | none direct |
| 15 | `/api/cron/workers/sms-dispatch` | `*/5 * * * *` | 61 | `.../sms-dispatch/route.ts` | nodejs | `crypto`; Twilio SDK (15.9 MB on disk) |
| 16 | `/api/cron/workers/email-queue` | `*/5 * * * *` | 65 | `.../email-queue/route.ts` | nodejs | none direct; Resend |
| 17 | `/api/cron/workers/document-processing` | `*/5 * * * *` | 69 | `.../document-processing/route.ts` | nodejs | **`pdfjs-dist`** (`next.config.js:90-92`), 257 lines |
| 18 | `/api/cron/workers/tag-expiry` | `15 0 * * *` | 73 | `.../tag-expiry/route.ts` | nodejs | none direct |
| 19 | `/api/cron/workers/auto-tag-sweep` | `0 2 * * *` | 77 | `.../auto-tag-sweep/route.ts` | nodejs | none direct |
| 20 | `/api/cron/workers/course-expiry` | `0 3 * * *` | 81 | `.../course-expiry/route.ts` | nodejs | none direct |
| 21 | `/api/cron/workers/rescreen-aml` | `0 4 * * *` | 85 | `.../rescreen-aml/route.ts` → `workers/rescreen-aml.ts` | nodejs | `workers/rescreen-aml.ts:1` sets `global.WebSocket = class {}`, imports `dotenv` (`:5`) and `server/services/refinitiv` |
| 22 | `/api/cron/workers/ai-tag-suggestions` | `0 5 * * *` | 89 | `.../ai-tag-suggestions/route.ts` | nodejs | OpenAI SDK (16 importers repo-wide) |
| 23 | `/api/cron/reengagement-loop` | `0 7 * * *` | 93 | `.../reengagement-loop/route.ts` | nodejs | none direct |
| 24 | `/api/cron/workers/ai-ingest-queue` | `*/5 * * * *` | 97 | `.../ai-ingest-queue/route.ts` | nodejs | none direct; embeddings |
| 25 | `/api/cron/reminders` | `*/5 * * * *` | 101 | `.../reminders/route.ts` | — | none direct (183 lines) |
| 26 | `/api/cron/workers/task-reminders` | `* * * * *` | 105 | `.../task-reminders/route.ts` | nodejs | none direct |
| 27 | `/api/cron/workers/task-escalations` | `0 6 * * *` | 109 | `.../task-escalations/route.ts` | nodejs | none direct |
| 28 | `/api/cron/pre-meeting-brief` | `*/5 * * * *` | 113 | `.../pre-meeting-brief/route.ts` | — | none direct (294 lines); AI |
| 29 | `/api/cron/workers/domain-verification` | `*/15 * * * *` | 117 | `.../domain-verification/route.ts` | nodejs; **`maxDuration=60` (`:9`), 50 s budget (`:24`)** | `node:dns` via `verify.ts:1,41`; **Vercel REST API** |
| 30 | `/api/cron/waitlist-offers` | `10 * * * *` | 121 | `.../waitlist-offers/route.ts` | — | none direct |

Handlers that rely on a long timeout: #6 (45 s), #13 (45 s of a 60 s max), #29 (50 s of a 60 s max). Others rely on batch caps (e.g. 50-row batches in message/campaign workers) rather than wall time. No handler declares `maxDuration` above 60 (grep of `src/app/api/cron`).

Singleton protection: `src/lib/cron/workerLock.ts:9-32` uses DB RPC `acquire_cron_worker_lock` (10-minute lease in `domain-verification:` route line 36) — DB-side, portable. Queue workers use `FOR UPDATE SKIP LOCKED` RPCs (`message-dispatch/route.ts:16-21` comment) — portable; overlapping Cloudflare invocations are safe for those.

### B.2 Cron route files that exist but are NOT in `vercel.json` (4)

| Path | Handler | Triggered by? |
|------|---------|---------------|
| `/api/cron/gsc-sync` | `src/app/api/cron/gsc-sync/route.ts` (calls `workers/gsc-sync.ts`) | Only reference found is `src/app/settings/components/tabs/SeoTab.tsx` (UI). No scheduler registers it. |
| `/api/cron/competitor-keywords` | `.../competitor-keywords/route.ts` | same |
| `/api/cron/seo-rank` | `.../seo-rank/route.ts` | same |
| `/api/cron/seo-pipeline-auto-promote` | `.../seo-pipeline-auto-promote/route.ts` | same |

These never run on a schedule today. Decide per route whether to schedule them on the new platform or leave them manual — otherwise the migration silently "keeps" the current (non-running) state.

Also: `src/app/api/verifytask1920temp/actiontest/route.ts:13,40` is a temp test route that reads `CRON_SECRET` — candidate for deletion, not a migration item.

### B.3 Other schedulers in the repo

| Scheduler | Evidence | Finding |
|-----------|----------|---------|
| **Inngest** | `src/app/api/inngest/route.ts:5-11` registers 4 functions: `webhookDispatchFn`, `workflowTriggerFn`, `campaignDispatchFn`, `metaDiscoveryFn`. Triggers: `webhook/dispatch` (`webhookDispatch.ts:35`), `workflow/trigger` (`workflowTrigger.ts:25`), `campaign/dispatch` (`campaignDispatch.ts:20`), `meta/discover` (`metaDiscovery.ts:181`) | **All event-triggered; zero Inngest `cron` triggers** (grep `cron:` in `src/lib/inngest` → none). Inngest is not a scheduler here. |
| **Supabase pg_cron** | `supabase/migrations/20260930000022_request_timings.sql:60-66`: `cron.schedule('request-timings-cleanup','0 3 * * *', DELETE FROM request_timings …)`. `20240101000066_phase34_invoice_sprint2.sql:65` creates the extension; the `cron.schedule` there (`:69-70`) is commented out | One live pg_cron job, DB-internal — unaffected by migration. |
| **Supabase pg_net** | `supabase/migrations/20240101000100_phase57_sprint5_launch_alert.sql:30,47` (trigger → HTTP POST to `https://www.leadsmind.io/api/webhooks/article-updated`) | DB → app webhook; hostname hard-coded (finding #30). |
| **Supabase Edge Functions** | `supabase/functions` does not exist (`ls` failed) | None. |
| **GitHub Actions schedules** | `.github/workflows/ci.yml` has only `on: push`; grep `schedule:`/`cron:` in `.github` → no matches | None. |
| In-repo scripts | `workers/gsc-sync.ts`, `workers/rescreen-aml.ts`, `workers/screenshot-freshness.ts` are library/CLI modules invoked by routes (rescreen-aml, gsc-sync). `src/lib/lead-finder/MonitoringScheduler.ts:7` comment says "intended to be run via … Supabase Edge Functions or Vercel Cron" — no caller registered | Not scheduled. |

---

## C. Vercel-specific environment variables and headers

### C.1 Env var names

Read by application code:

| Name | Where used |
|------|-----------|
| `VERCEL_API_TOKEN` | `src/lib/domains/vercel.ts:4` (+`.env.example:136`) |
| `VERCEL_PROJECT_ID` | `src/lib/domains/vercel.ts:5` (+`.env.example:137`) |
| `VERCEL_TEAM_ID` | `src/lib/domains/vercel.ts:6` (+`.env.example:138`) |

Read only by the Vercel build-ignore script (`scripts/vercel-ignore-build.sh`):

| Name | Line |
|------|------|
| `VERCEL_ENV` | 28 |
| `VERCEL_GIT_COMMIT_REF` | 29, 37 |
| `VERCEL_GIT_PULL_REQUEST_ID` | 36 |
| `VERCEL_GIT_PREVIOUS_SHA` | 45 |

Vercel-adjacent but platform-neutral names (these are what *replace* `VERCEL_URL`): `NEXT_PUBLIC_APP_URL` (106 references repo-wide; fallback to `http://localhost:3000` in ~15 OAuth routes and to `*.vercel.app` in 4 places — §A #27), `NEXT_PUBLIC_SITE_URL` (3), `GMAIL_PUBSUB_AUDIENCE` (`src/lib/gmail/pubsubAuth.ts:16`), `CRON_SECRET` (38 references).

Env vars **not** used anywhere (grep of `src libs server workers scripts supabase next.config.js`, 0 hits): `VERCEL_URL`, `VERCEL_REGION`, `VERCEL_BRANCH_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_GIT_COMMIT_SHA`, `NEXT_PUBLIC_VERCEL_*`, `VERCEL_AUTOMATION_BYPASS_SECRET`. Total distinct `process.env.*` names in source: 124.

The Vercel dashboard also auto-injects `VERCEL_*` at build; nothing outside the ignore script consumes them.

### C.2 Headers

| Header | Evidence |
|--------|----------|
| `x-vercel-id` | `src/app/public/forms/[id]/page.tsx:98` only (with `x-request-id` fallback) |
| `x-vercel-cron`, `x-vercel-ip-*`, `x-vercel-forwarded-for`, geo headers | **none** (grep `x-vercel` → 1 file above; grep `request.geo`/`x-vercel-ip` → 0). `src/app/blog/[slug]/page.tsx:151` `'geo'` is JSON-LD schema, not a header. |
| `x-forwarded-for` / `x-real-ip` | ~28 files incl. `src/app/(portal)/portal/layout.tsx:43`, `src/app/actions/{calendar/scheduling.ts:360,contacts.ts:95,reputation_actions.ts:201,guestCheckout.ts:35}`, `src/app/api/webhooks/payfast/route.ts:56`, `src/app/api/payfast/webhook`, `src/app/api/auth/student/login/route.ts:33`, `src/app/api/auth/portal/{password-login:16,otp-verify:17,otp:17,magic-link:25}/route.ts`, `src/app/api/public/forms/[id]/{submit:108,recovery-link:20,events:52}/route.ts`, `src/app/api/kyc/consent/submit/route.ts:22`, `src/app/api/checkout/guest-status/route.ts:39`, `src/app/api/support/{tickets:22,public-attachments:33}`, `src/lib/lena/publicSession.ts:60`, `src/lib/affiliate/attribution.ts:59,63`, `src/app/r/[code]/route.ts:48` |
| `req.ip` (Vercel-populated) | `src/lib/affiliate/attribution.ts:59`, `src/app/r/[code]/route.ts:48` |
| `x-forwarded-host` | `src/app/actions/calendar/core.ts:28`, `src/app/actions/publicBlog.ts:17`, `src/lib/blog/publicWorkspace.ts:12,31` |
| `host` | `src/middleware.ts:50` — primary tenant-routing key |
| Custom injected header | `x-domain-config-id` set in middleware (`src/middleware.ts:164,183`) — app-internal, portable |

---

## D. Top 10 blockers / risks (by severity)

1. **Cron has no Cloudflare equivalent wired up.** 30 routes live only in `vercel.json:3-124`. OpenNext generates no `scheduled` handler. Need a wrapper Worker that fans out `fetch` calls with the Bearer secret (auth is Bearer-only, so this is mechanically easy — but nothing exists today). Without it, message/SMS/email/WhatsApp/campaign queues, automations, reminders and gmail sync all stop.
2. **Tenant custom domains + SSL are built on the Vercel Domains API** (`src/lib/domains/vercel.ts`, `verify.ts`, three UI/action call sites). Needs Cloudflare for SaaS Custom Hostnames, a new fallback origin, and a re-pointing plan for every existing tenant CNAME (`domains.leadsmind.io`, `config.ts:3`) — a customer-facing DNS cutover.
3. **`waitUntil` from `@vercel/functions` silently no-ops off Vercel** (the repo says so itself: `EventBus.ts:63-67`). 8 files / ~16 call sites; `EventBus.publishEvent` (40 un-awaited calls in 29 files, `EventBus.ts:59-66`) depends on it — the repo documents a prior production incident where triggers vanished without it. Must be shimmed to `ctx.waitUntil` before any traffic moves.
4. **Headless Chromium PDF generation cannot run in a Worker.** `@sparticuz/chromium` is 66.5 MB on disk (measured) and force-traced into 16 routes (`next.config.js:66-205`). Affects quote/invoice send, invoice auto-notify on every payment webhook, payslips, certificates, bookkeeping export, KYC report, SEO crawler. Needs Browser Rendering or an external PDF service — a rewrite of `src/lib/pdf/htmlToPdf.ts` plus 4 other launch sites.
5. **`ffmpeg` and `yt-dlp` shell-outs** (`src/app/api/blog/voice-import/route.ts:33-35`, `src/app/actions/youtubeImport.ts:24-27`). Workers cannot spawn processes; those features need a Container or a hosted service. They run on a host with those binaries installed, which Vercel's runtime does not normally provide, so verify they work in production today.
6. **Client-IP and host header assumptions** (~28 + 5 files). PayFast source-IP allowlist (`webhooks/payfast/route.ts:56-57`), POPIA consent IP logging (`contacts.ts:95`, `kyc/consent/submit:22`), login rate limits (`auth/portal/*`), and tenant resolution via `x-forwarded-host` all depend on proxy header semantics that change on Cloudflare (`cf-connecting-ip`).
7. **SSRF guard uses `node:dns`/`node:https`/`node:net`** (`src/lib/security/validateUrl.ts:1-4,156`). Used by builder submit, blog social import, LMS link checks. Likely cannot be ported 1:1 (no resolve-then-pin) — a security-control rewrite, not a rename.
8. **`*.vercel.app` hard-coded fallbacks** in unsubscribe links, Meta OAuth redirect, and email countdown image URLs (`unsubscribeLink.ts:8,19`; `meta/config.ts:4`; `emailRenderer.ts:129`; `meta/callback/route.ts:21`). Harmless while `NEXT_PUBLIC_APP_URL` is set; if missed in the new environment, outbound email carries dead vercel.app links.
9. **Worker bundle size / native modules.** `@resvg/resvg-js`, `sharp`, `satori`+`harfbuzzjs` wasm path hacks (`next.config.js:26-31`), `pdfjs-dist` (35.6 MB), `exceljs` (21.6 MB), `twilio` (15.9 MB), `stripe` (15.6 MB), `inngest` (13.1 MB), `openai` (6.1 MB). Disk sizes, not bundle sizes — see E2.
10. **Provider callback re-registration + Inngest re-sync** (Twilio, Resend, Gmail Pub/Sub audience, Meta, TikTok, LinkedIn, Google, Microsoft, Zoom, Stripe, PayPal, PayFast, Ozow, Paystack, Flutterwave; Inngest app sync). Zero cost if the production hostname is preserved through the cutover; otherwise a long manual checklist (§A #28-31). Twilio signature validation rebuilds the URL, so a hostname/proxy mismatch fails closed.

---

## E. Two buckets

### E1. CONFIRMED VERCEL-DEPENDENT (evidence)

- Vercel Cron: `vercel.json:3-124` (30 entries).
- Vercel build gate: `vercel.json:2`; `scripts/vercel-ignore-build.sh:28,36,45` (4 `VERCEL_*` vars).
- Vercel Domains REST API: `src/lib/domains/vercel.ts:9` (`https://api.vercel.com`), `:32,:64,:70,:113` endpoints; consumed by `verify.ts:3`, `actions/domains.ts:6,389`, `actions/builderDeploy.ts:11,204`, `cron/workers/domain-verification/route.ts`.
- Env: `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` (`vercel.ts:4-6`).
- `@vercel/functions` `waitUntil`: 8 files listed in §A #11; dependency in `package.json`.
- `@vercel/nft` output-file-tracing workaround for binaries: `next.config.js:66,75-76` plus `outputFileTracingIncludes` (16 chromium keys + 2 pdfjs keys).
- Customer DNS target is a Vercel-attached domain: `src/lib/domains/config.ts:1-3`; surfaced in `WebsiteSettings.tsx:292`, `help.ts:404-413`, `verify.ts:83`.
- `x-vercel-id`: `src/app/public/forms/[id]/page.tsx:98`.
- `req.ip` (Next platform-populated): `attribution.ts:59`, `r/[code]/route.ts:48`.
- `*.vercel.app` fallbacks: `meta/config.ts:4`, `meta/callback/route.ts:21`, `unsubscribeLink.ts:8,19`, `emailRenderer.ts:129`, `lena/embedOrigin.ts:4`.
- Comments documenting Vercel-only behavior (not code, but evidence of assumptions): `htmlToPdf.ts:11` (Amazon Linux/Vercel runtime), `rateLimit.ts:4-7`, `retryConfig.ts:4` (PRD's 5/15/45 s backoff is below "Vercel Cron's 1-minute floor"; Cloudflare also has a 1-minute floor, so no change), `workerLock.ts:4`.
- Static UI text: `src/app/system/health/page.tsx:63` ("Vercel Edge Network").
- Not Vercel-dependent, confirmed: Inngest is event-only (B.3); pg_cron job is DB-internal; CI has no deploy step.

### E2. NEEDS RUNTIME VERIFICATION IN POC

| Item | Why it cannot be proven by reading code |
|------|------------------------------------------|
| OpenNext on **Next 14.2.35** | Compatibility of this exact version with `@opennextjs/cloudflare`, incl. the `experimental.serverComponentsExternalPackages` / `outputFileTracing*` options (`next.config.js:34-205`), is a tooling fact, not in the repo. |
| Worker bundle size | 10 MB compressed (paid) / 3 MB (free) limit applies after bundling; only a real build tells. Candidates by on-disk size (measured): `@sparticuz/chromium` 66.5, `next` 82.8 (framework), `pdfjs-dist` 35.6, `jspdf` 32.0 (**unused**, removable), `@img`/sharp 27.3, `@mui` 24.8 (client), `exceljs` 21.6, `apexcharts` 20.5 (client), `twilio` 15.9, `stripe` 15.6, `inngest` 13.1, `openai` 6.1, `jsdom` 3.9 (`next.config.js:34` externalized; blog no longer uses it, `next.config.js:93-94`). Top-10 **server-side** by relevance: chromium, pdfjs-dist, sharp/@img, exceljs, twilio, stripe, inngest, resvg+satori+harfbuzz (~13.6 combined), openai, `@supabase/*` (7.9). |
| Node compat (`nodejs_compat`) for `crypto` | 61 files import Node `crypto` (`createHmac/createHash/randomBytes/timingSafeEqual/createCipheriv`); AES-GCM in `src/lib/encryption.ts:35` and `src/lib/storage/encryptedDocuments.ts:46`. Likely supported; unproven here. |
| `node:dns` / `https` / `net` | `verify.ts:41`, `senderDomainVerification.ts:12`, `validateUrl.ts:156` — API surface/behavior in Workers differs; needs testing. |
| `pino` | `src/shared/logger/index.ts:1`; repo history shows worker-thread transport fragility (`:25-40` comment). Production path writes JSON to stdout — confirm in Workers. |
| `@supabase/ssr` cookies + Realtime/WebSocket | Middleware runs `updateSession` per request (`src/lib/supabase/middleware.ts`, `src/middleware.ts` (platform-host branch)); Realtime used by Communications Hub (per project memory); `workers/rescreen-aml.ts:1` stubs `WebSocket`. |
| PDF generation (all 6 launch sites) | Output fidelity (fonts, `@page`, CSS) differs between `@sparticuz/chromium` and Browser Rendering; must compare real invoices/quotes/certificates. |
| `pdfjs-dist` in Worker | Worker-file resolution bug history (`next.config.js:20-25`); `document-processing` cron (257 lines) must be run end-to-end. |
| `satori`/`resvg`/`harfbuzz` | `.node` and `hb.wasm` loading (`next.config.js:26-31`); countdown image route `src/app/api/campaigns/countdown-image/route.ts` must render. |
| `exceljs` | `src/lib/finance/bookkeepingExcelReport.ts:1` uses streams/Buffer heavily. |
| Cron handlers under CPU-time limits | Workers meter CPU time, not wall clock; handlers with 45–50 s loops (`workflow-resume:13`, `gmail-sync:15`, `domain-verification:24`) mostly wait on network but must be measured. Subrequest count per invocation (hundreds of Supabase calls per batch) must also be checked. |
| Streaming audio/video proxies | `video/[id]/stream` 8 MB chunk proxy (`route.ts:34`), audio unbounded stream (`audio/[id]/stream`), Drive cache-fill via `waitUntil` of up to 200 MB (`video route:9-11`) — memory and post-response time limits unverified. |
| Static asset / `public/` + font loading from `process.cwd()` | `generateAvatarPng.ts:11`, `countdownImage.ts:24`. |
| Middleware cost | Every non-static request runs `middleware` (matcher at `src/middleware.ts:240-243`), and for custom hosts does 1–3 Supabase queries (`resolve.ts:62-96`). Latency from Workers→Supabase region must be measured. |
| Client IP semantics | Whether `x-forwarded-for` first hop equals the real client IP through Cloudflare + OpenNext for the PayFast allowlist. |
| Request-body limits | 25 MB/15 MB limits in upload routes (§A #33) vs Cloudflare plan limit. |
| Custom-hostname issuance timing | CF for SaaS validation/SSL timing vs the current `ssl_provisioning` state machine (`verify.ts:214-219`). |
| ISR/cache behavior | 289 `revalidatePath` calls need OpenNext incremental + tag cache configured; correctness only observable at runtime. |

---

## F. Searched and found nothing

| Searched for | Scope | Result |
|---|---|---|
| `.vercel/` directory | repo root | does not exist |
| `vercel.json` `rewrites`, `redirects`, `headers`, `functions`, `regions`, `builds`, memory | `vercel.json` | none — file contains only `ignoreCommand` and `crons` |
| `export const runtime = 'edge'` | `src/` | **0 hits** (only `'nodejs'` appears, ~38 route files). Middleware is the only edge-runtime code (implicit). |
| `preferredRegion` | `src/` | 0 hits |
| `unstable_cache`, `revalidateTag` | `src/` | 0 hits |
| `@vercel/analytics`, `@vercel/speed-insights`, `@vercel/og`, `@vercel/blob`, `@vercel/kv`, `@vercel/postgres`, `@vercel/edge-config`, `@vercel/otel` | `package.json` + `src/` | 0 hits; only `@vercel/functions` |
| `next/og`, `ImageResponse` | `src/` | 0 hits |
| `after()` from `next/server` | `src/` | 0 hits |
| `x-vercel-cron` / user-agent cron check | `src/` | 0 hits |
| `x-vercel-ip-country`, `x-vercel-ip-*`, `request.geo` | `src/` | 0 hits |
| `VERCEL_URL`, `VERCEL_REGION`, `VERCEL_BRANCH_URL`, `NEXT_PUBLIC_VERCEL_*`, `VERCEL_GIT_COMMIT_SHA` | `src libs server workers scripts supabase next.config.js` | 0 hits |
| Vercel CLI usage / `vercel deploy` in scripts or CI | `package.json` scripts, `.github/workflows` | none; the only mention is a comment in `scripts/vercel-ignore-build.sh:37` |
| CI deploy/promotion step | `.github/workflows/ci.yml` | none (tests, tsc, lint, template validators only). Single workflow file. |
| GitHub Actions `schedule:` | `.github/` | none |
| Supabase Edge Functions | `supabase/functions` | directory does not exist |
| Inngest `cron` triggers | `src/lib/inngest*` | none (4 event triggers only) |
| Sentry / Datadog / PostHog / LogRocket wiring | `src/` | only commented-out Sentry (`observability.ts:25,47-52`) and a stray string in `WebsiteEmailScraper.ts:9` |
| Vercel Logs / Observability / Analytics API calls | `src/` | none |
| `winston`, `bcrypt` (native), `canvas`, `pdfkit`, `puppeteer` (non-core, prod) | `src libs server workers` | `bcryptjs` (pure JS) only; `puppeteer` only as dev-only local fallback (`htmlToPdf.ts:28`, `cert-generator.ts:42`); no winston/canvas/pdfkit |
| `jspdf`, `unzipper` imports | `src libs server workers` | 0 imports (dependencies are installed but unused) |
| `worker_threads`, `cluster`, `vm`, `http2` | `src libs server workers` | 0 hits |
| `os` module | `src libs server workers` | 0 hits |
| `next.config.js` `output`, `headers()`, `redirects()`, `serverActions.bodySizeLimit`, `images.loader`, `webpack()` | `next.config.js` | none set; only `rewrites()` (`/widget/ticket.js` → `/api/widget/ticket`, `next.config.js:208-213`) |
| Vercel Blob / signed upload workaround for 4.5 MB limit | `src/` | none; uploads go through route handlers up to 25 MB (the limit would already bind on Vercel — verify those uploads currently work for files > 4.5 MB) |
| Hard-coded A-record / IP DNS targets (e.g. `76.76.21.21`, `cname.vercel-dns.com`) | `src/` | none; only the `domains.leadsmind.io` CNAME |
| `vercel.com` links in UI | `src/` | none (`vercel.com` appears only in `scripts/vercel-ignore-build.sh:5`) |
| `.env.local` | not opened | deliberately not read (secrets). Only `.env.example` names were used. |
| Webhook/redirect *registrations in provider dashboards* | external | not inspectable from the repo; the code-side URL builders are listed in §A #28-30 |
| Actual deployed Vercel project settings (env vars, domains attached, regions, function limits, plan) | external | not inspectable; no `.vercel/` link file |
