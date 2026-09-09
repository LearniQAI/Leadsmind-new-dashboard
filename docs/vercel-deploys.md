# Vercel deployments — what builds, and when

Vercel's Build CPU Minutes are ~100% of the monthly bill. Two controls keep that in check;
both live in the repo (`vercel.json` → `ignoreCommand` → `scripts/vercel-ignore-build.sh`).

## What triggers a build

| Event | Build? |
|---|---|
| Push / merge to `master` (production) | **Yes** — always |
| Push to a feature branch **with an open PR**, touching code | **Yes** (preview) |
| Push to a feature branch **with an open PR**, touching only `*.md` / `docs/` / `.claude/` / `.vscode/` | No — skipped |
| Push to a feature branch **with no PR yet** | **No** — skipped |

"Skipped" = the deployment is marked `CANCELED` before install/compile. It still counts
against the daily *deployment* quota but consumes **no Build CPU Minutes**.

## I need a live preview for a branch that has no PR

Either:

- **Open a draft PR** — the next push builds a preview, and every push after that does too.
- **One-off manual preview** without a PR:
  ```bash
  npx vercel        # preview deploy of the current directory
  npx vercel --prod # (only if you specifically need a production-style build)
  ```
  or in the Vercel dashboard: **Deployments → ⋯ → Redeploy** on any prior deployment.

## The test gate

GitHub Actions (`.github/workflows/ci.yml`: `npm ci` → `npm run test` → `tsc --noEmit` →
`npm run lint`, on every push and PR) is the authoritative test gate. The Vercel `build`
script is just `next build` — it no longer re-runs the test suite, since CI covers that
independently and running 426 tests on every deployment was pure Build-CPU-Minutes waste.
`next build` still type-checks, so a type error still fails a deployment.
