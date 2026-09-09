#!/usr/bin/env bash
#
# Vercel "Ignored Build Step" — wired up via `ignoreCommand` in vercel.json.
#
# Contract (see https://vercel.com/docs/project-configuration/project-settings#ignored-build-step):
#   exit 1  -> run the build as normal
#   exit 0  -> skip the build (deployment is marked CANCELED, no install / no `next build`)
#
# Design rule: when anything is uncertain, we BUILD. Skipping is only for cases
# we can prove are safe to skip.
#
# What this enforces:
#   1. Production (master) always builds.                        [safety gate untouched]
#   2. Preview builds only run for branches with an open PR.     [Option C: no auto preview
#      A plain push to a feature branch with no PR is skipped.    on every push to every branch]
#   3. PR preview builds are skipped when the diff is docs /      [Option B: doc-only commits
#      editor-config only.                                         don't burn a full build]
#
# Note: a skipped build still counts as a "deployment" for Vercel's daily quota, but it
# does NOT consume Build CPU Minutes — the run is canceled before install/compile. The
# Build CPU Minutes line is the entire cost problem here, so this still saves the money.

set -uo pipefail

log() { echo "[vercel-ignore] $*"; }

# 1) Production deployments (the master branch) always build.
if [ "${VERCEL_ENV:-}" = "production" ]; then
  log "production deployment on '${VERCEL_GIT_COMMIT_REF:-?}' — building"
  exit 1
fi

# 2) Preview deployments: only build when tied to an open pull request.
#    Per Vercel docs, VERCEL_GIT_PULL_REQUEST_ID is an empty string for a commit
#    pushed to a branch before any PR exists.
if [ -z "${VERCEL_GIT_PULL_REQUEST_ID:-}" ]; then
  log "preview push on '${VERCEL_GIT_COMMIT_REF:-?}' with no open PR — skipping (open a PR, or use \`vercel deploy\` for a one-off preview)"
  exit 0
fi

# 3) PR preview builds: skip when nothing meaningful changed since the last build.
#    Base = VERCEL_GIT_PREVIOUS_SHA (git SHA of the last *successful* deployment for
#    this project+branch; only exposed inside the ignore step). Fall back to HEAD^
#    within the depth=10 clone. If neither resolves, build (can't reason -> safe).
BASE="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [ -z "$BASE" ] || ! git cat-file -e "${BASE}^{commit}" 2>/dev/null; then
  BASE="$(git rev-parse --verify --quiet 'HEAD^' || true)"
fi
if [ -z "$BASE" ] || ! git cat-file -e "${BASE}^{commit}" 2>/dev/null; then
  log "no comparable base commit available — building to be safe"
  exit 1
fi

CHANGED="$(git diff --name-only "$BASE" HEAD 2>/dev/null || true)"
if [ -z "$CHANGED" ]; then
  # Tree is byte-identical to the last successful deployment (e.g. a commit that
  # reverts an earlier one in the same push series). Nothing to rebuild.
  log "tree identical to last successful deploy (${BASE}) — skipping build"
  exit 0
fi

# A path is "safe to skip" only if it matches one of these. Anything under src/,
# public/, libs/, server/, workers/, scripts/, supabase/migrations/, or any
# build/lint/dep config (package.json, *.config.js, tsconfig, .eslintrc, .npmrc,
# .nvmrc, next.config.js, vercel.json, ...) is deliberately NOT here → it builds.
DOC_ONLY_RE='(^|/)[^/]*\.md$|^docs/|^\.claude/|^\.vscode/|^\.idea/|^LICENSE$|^supabase/\.temp/'

NON_DOC="$(printf '%s\n' "$CHANGED" | grep -vE "$DOC_ONLY_RE" || true)"

if [ -z "$NON_DOC" ]; then
  log "docs/config-only change vs ${BASE} — skipping build. Files:"
  printf '%s\n' "$CHANGED" | sed 's/^/  /'
  exit 0
fi

log "code changes present vs ${BASE} — building. Non-doc files:"
printf '%s\n' "$NON_DOC" | sed 's/^/  /'
exit 1
