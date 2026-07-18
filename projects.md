# Projects Module Audit — Dead "Manage Node" / Options Buttons, Security-Fix Status

Structured identically to `crm.md`/`calendar.md` (finding → fix → live verification). Scope: the internal `/projects` page (`ProjectsClient.tsx`), its backing actions (`operations.ts`, `projects.ts`), and the `projects`/`project_tasks` tables.

## Top-line answer

**Part A confirms this project's own repeated pattern held again: the Priority 4 security fix for `operations.ts`'s `getProjects`/`createProject` was flagged in `action-security-triage.md` but never actually landed in `security-remediation.md` — not a regression from a fix, but a fix that was simply never done.** Both functions were still reading the caller-trusted `getCurrentWorkspaceId()` cookie with zero membership check, confirmed by direct read of the live file, not assumed from the document's silence alone. Fixed in this pass using the same shared `requireWorkspaceAccess()` helper used everywhere else.

**Part B: both dead buttons are the exact same bug class already found and fixed in the calendar module ("Create first calendar," `calendar.md` A1) — a missing `onClick` handler, not a JS error, not a 404, not a stale-route link.** `ProjectCard`'s "Manage Node" `DashButton` and the "..." `<button>` (`ProjectsClient.tsx:148-153`, pre-fix) had no `onClick`/handler prop at all. Nothing to see in a network tab because no request or navigation was ever attempted — pure unwired UI, confirmed by direct source read.

**Part C surfaced two additional real, previously-undocumented bugs while tracing what "Manage Node" was even supposed to open:** there was no `/projects/[id]` route and no modal to open at all (nothing to wire the button to), and the card's "0% Complete" / "1 Team members" figures were **not stuck at a placeholder by rendering bug — they were stuck because the underlying `projects` table has no `progress` or `team_size` column to begin with.** `project.progress || 0` and `project.team_size || 1` were reading fields that never exist in `select('*')`'s result, so they always evaluated to the fallback. Fixed by computing both live from the real `project_tasks` table (which already exists, already has `status`/`assigned_to` columns, and was otherwise completely unused by this page).

## Part A — Security-fix status, checked against the document directly

Per the task's explicit instruction: checked `security-remediation.md` itself rather than assuming from memory.

**`action-security-triage.md` (the original triage) does list this exact gap**, line 114-115:
```
| `operations.ts` | `getProjects` | No auth check | Y | `src/app/projects/page.tsx` |
| `operations.ts` | `createProject` | No auth check | Y | `src/app/projects/ProjectsClient.tsx` |
```
and line 298 groups `operations.ts` into the batch of files slated for the mechanical `requireWorkspaceAccess()` fix alongside `expenses.ts`, `retainers.ts`, `affiliates.ts`, `domains.ts`, etc.

**But `security-remediation.md` never actually fixes it.** Searched the entire document for `getProjects`/`createProject`/`operations.ts` (case-insensitive): the only hits are Priority 2 item 4, which **deletes** `operations.ts`'s dead, unauthenticated `getExpenses` (a duplicate of `expenses.ts`'s live `getExpensesLive`) — a different function entirely, not `getProjects`/`createProject`. Priority 4's own "re-derived actually still open" table (`security-remediation.md:629-648`) — built specifically to re-check every file the triage named — lists `pipelines.ts`, `builderAI.ts`, `builderDeploy.ts`, `workspace.ts`, `social.ts`, `tasks.ts`, `retainers.ts`, `domains.ts`, `blogCommentsAdmin.ts`, `analytics.ts`, `affiliates.ts`, `expenses.ts`, `reputation_actions.ts`, `popia.ts`. **`operations.ts` is not in that table at all** — it was silently dropped from the batch somewhere between the triage and the Priority 4 pass, not resolved and not re-flagged.

**Confirmed directly against the live file, not just from the document's silence:** read `src/app/actions/operations.ts` before making any change — `getProjects` (then line 58) and `createProject` (then line 79) both still called `getCurrentWorkspaceId()` directly with no membership check, identical to every other still-open Priority-4-class function elsewhere in this project (`pipelines.ts`, `tasks.ts`, etc. before their own fixes). **The fix was never done — this is not a regression, it's an original gap that slipped through the batch.**

**No regression risk to rule out, because there was never a fix to regress.** Since Part A's premise ("did a recent fix introduce this") doesn't hold here, there's nothing to check for a workspace-check-now-failing-silently side effect — the dead-button symptom (Part B) and the missing-auth gap (Part A) are two unrelated, independent bugs that happened to live in the same two functions, not cause and effect.

**Fix applied in this pass**, mechanically identical to every other Priority-4-class fix already done elsewhere: `getProjects`/`createProject` in `operations.ts` now call `requireWorkspaceAccess()` (throws `UnauthorizedError`/`ForbiddenError`, caught by each function's existing try/catch, same shape as `tasks.ts: getAssignableMembers` and every other already-hardened function) instead of the caller-trusted `getCurrentWorkspaceId()` cookie read.

## Part B — The dead buttons, root-caused

**Traced `ProjectCard` in `src/app/projects/ProjectsClient.tsx` directly (pre-fix, then lines 147-154):**
```tsx
<DashButton variant="secondary" className="flex-1 rounded-2xl h-12 hover:bg-dash-accent hover:text-white">
  Manage Node
</DashButton>
<button className="w-12 h-12 rounded-2xl bg-dash-surface border border-dash-border flex items-center justify-center !text-dash-textMuted hover:!text-dash-text transition-colors hover:border-dash-text/20">
  <MoreHorizontal size={20} />
</button>
```
Neither element has an `onClick` (or any handler prop) at all. This is the identical bug class to `calendar.md`'s A1 ("Create first calendar" — `CalendarEmptyState.tsx`'s button had no `onClick`): clicking is inert by construction, nothing to see in a network tab or console because no request or navigation is ever attempted. Checked the other two known patterns explicitly, per the task's instruction not to assume a novel cause: **not** a dead link to a non-existent route (there was no `<Link>`/`router.push` at all to be dead — confirmed no `/projects/[id]` route exists anywhere under `src/app`, via `find src/app -iname "*project*"`), and **not** a silently-swallowed client error (no handler means no code ever runs, so there's nothing to throw or swallow).

**"Manage Node" was supposed to do something real, but there was nothing to wire it to.** Searched for an existing project-detail modal/route/drawer (`ProjectDetail`, `ProjectModal`, `ManageProject`, `ProjectDrawer` — zero matches) and for any `updateProject`/`deleteProject` action (zero matches, pre-fix). The only other "project details"-shaped code in the repo, `src/components/pagesUI/project/project-details/*` (`ProjectDetailsMainArea`, `LeftContent`, `RightContent`, `ProjectSummary`, `AssignedTeam`, `WorkProgress`, etc.), is **confirmed dead boilerplate from the dashboard template this app was built from** — zero importers anywhere under `src/app` (`grep -rln "ProjectDetailsMainArea" src/app` → no matches), and its content is 100% hardcoded demo copy (`ProjectSummary.tsx` literally renders a fixed paragraph about "a Laravel education app," not a single prop or query in any of these 8 files). Not reusable as-is without a full rewrite — building on it would have created exactly the "another dead end one level deeper" the task warned against, so a real, lightweight modal was built instead (Part C, below), reusing the real `project_tasks` table rather than inventing new demo content.

**"..." was supposed to expose real per-project actions (edit/delete), and exposed nothing for the same missing-`onClick` reason.**

## Part C — Full workflow trace, once buttons are fixed

### Project creation ("+ New Project")

**Confirmed already working, unaffected by the dead-button bug.** `handleCreate` in `ProjectsClient.tsx` was already correctly wired (`window.prompt` → `createProject(name)` → `router.refresh()`), and `createProject` genuinely inserts a real `projects` row. Only the auth check on `createProject` needed fixing (Part A) — the creation mechanism itself was never broken.

### Project detail/management — the actual fix

**No existing route or modal to repurpose (see Part B), so a new, real, minimally-scoped "Manage Node" modal was built:** `src/components/projects/ManageProjectModal.tsx`, opened from `ProjectsClient.tsx`'s now-wired "Manage Node" `onClick`. Backed by new server actions added to `src/app/actions/projects.ts` (the file the security triage already confirmed correctly membership-checked for its existing 3 functions — new functions follow that file's own established pattern, not a new one):

- **`getProjectDetail(projectId)`** — real project row + its real `project_tasks`, with assignees resolved from `users` (same "no FK to public.users, fetch separately" pattern already established in `tasks.ts: getAssignableMembers`). Computes real `progress`/`teamSize` from the tasks, same formula `getProjects` now uses on the card.
- **`updateProjectDetails(projectId, { name, description, status })`** — edits the fields `saveProjectSettings` (pre-existing, already in this file) deliberately doesn't touch.
- **`deleteProject(projectId)`** — real delete; `project_tasks` cascade-deletes via its existing `ON DELETE CASCADE` FK (confirmed in `supabase/migrations/20240101000028_phase16_17_reporting_projects.sql:45`).
- **`createProjectTask` / `updateProjectTaskStatus` / `deleteProjectTask`** — a real task checklist inside the modal; toggling a task's status is the actual mechanism progress moves through (no separate "progress" field to fake-update).
- **Timeline editing reuses the pre-existing `saveProjectSettings`** (already workspace-membership-checked, already confirmed correct by the original triage) for `start_date`/`due_date`, rather than duplicating that logic.

**A second real, previously-undocumented gap found while wiring this: `project_tasks` has RLS enabled but no policy for internal team members at all** — only a portal/client-facing `"clients view own project tasks"` SELECT policy exists (`supabase/migrations/20240101000181_customer_portal_rls.sql:94`). Confirmed directly by grepping every migration for a `project_tasks` policy. A session-scoped Supabase client (RLS-enforced) would silently see zero task rows and fail every task write for a real, legitimate internal team member — even with `verifyProjectAccess`'s membership check passing. Mitigated the same way `calendar/public.ts`/`calendar/manage.ts` already do elsewhere in this codebase: `verifyProjectAccess()` does its own explicit membership check first (session-scoped client, real `workspace_members` row required), then hands back an **admin client** for the actual reads/writes — safe because access is independently verified before the admin client is ever used, not a new bypass pattern. Flagged here as its own gap (a missing internal-team RLS policy on `project_tasks`) rather than silently left unexplained, since the admin-client workaround treats the symptom, not the missing policy itself; a follow-up migration adding a `"Workspace Members Manage Project Tasks"` FOR ALL policy (mirroring `projects`' own `"Workspace Projects Access"` policy) would be the proper long-term fix.

### Filter nodes search box

**Confirmed genuinely non-functional pre-fix** — the input (`ProjectsClient.tsx`, then lines 60-64) had no `value`/`onChange` at all, purely decorative. Fixed: wired to real `filterText` state, client-side-filtered against `name`/`description`/`status` via `useMemo`, with a genuine "No matching nodes" empty state (matching the existing `DashEmptyState` pattern used for the zero-projects case) rather than silently showing nothing.

### Stakeholders / "1 Team members"

**Confirmed to be a hardcoded-by-omission constant, not a live value — same failure class as `calendar.md`'s "Upcoming Meetings" hardcoded dashboard widget, but caused by a missing column rather than a literal array.** Live-queried the `projects` table schema directly (`select=*` against the real linked Supabase project): no `team_size` column exists at all. `project.team_size || 1` in the card therefore evaluates its fallback for every project, forever — not a real, changeable figure. Fixed: `getProjects` (`operations.ts`) now batch-fetches every returned project's `project_tasks` and computes `team_size` as the count of distinct real `assigned_to` users (falling back to `1` only when a project genuinely has no assigned tasks yet, matching the old default's intent without faking a number for projects that do have real assignees). The "Manage Node" modal surfaces the actual people (name/email) via `getProjectDetail`, not just a count.

### Progress tracking / "0% Complete"

**Same root cause as Stakeholders — confirmed via the same live schema query: no `progress` column exists on `projects` either.** `project.progress || 0` was permanently stuck at its fallback for the same structural reason, not a rendering bug. Fixed: progress is now computed as `% of that project's project_tasks with status = 'done'`, both on the card (`operations.ts: getProjects`) and inside the modal (`projects.ts: getProjectDetail`) — genuinely changeable by marking tasks done/todo in the modal's checklist, not a manual numeric field (there is no product reason to let progress diverge from actual task completion, and no column to store a manually-typed value even if there were).

## Fixes made in this pass

1. **Part A fix.** `operations.ts: getProjects`/`createProject` — replaced caller-trusted `getCurrentWorkspaceId()` with `requireWorkspaceAccess()`. Files: `src/app/actions/operations.ts`.
2. **Part B fix.** Wired `onClick` on "Manage Node" (opens the new modal) and replaced the inert "..." `<button>` with a real `DropdownMenu` (Edit → same modal, Delete → `deleteProject` with a confirm prompt). Files: `src/app/projects/ProjectsClient.tsx`.
3. **Part C fix.** New `ManageProjectModal.tsx` — edit name/description/status, edit start/due date (via the pre-existing `saveProjectSettings`), a real task checklist (add/toggle/delete), live progress bar + team-member count. Files: `src/components/projects/ManageProjectModal.tsx`.
4. **Part C fix.** New actions `getProjectDetail`/`updateProjectDetails`/`deleteProject`/`createProjectTask`/`updateProjectTaskStatus`/`deleteProjectTask`, all membership-verified via a new shared `verifyProjectAccess()` helper in the same file. Files: `src/app/actions/projects.ts`.
5. **Part C fix.** `getProjects` now computes real `progress`/`team_size` per project from `project_tasks` instead of returning fields that don't exist on the `projects` table. Files: `src/app/actions/operations.ts`.
6. **Part C fix.** "Filter nodes..." input wired to real client-side filtering with a genuine empty state. Files: `src/app/projects/ProjectsClient.tsx`.

## Flagged, not fixed (out of this pass's scope)

- **`project_tasks` has no internal-team-member RLS policy** (see above) — mitigated via the same verify-then-admin-client pattern used elsewhere, but the missing policy itself is a real gap worth closing with a dedicated migration.
- **`pagesUI/project/project-details/*`** (8 files, fully hardcoded template demo content, zero live importers) — confirmed dead, not deleted (out of this task's named scope, matches this project's established "flag dead code, don't delete unprompted" convention, e.g. `calendar.md`'s treatment of `round-robin.ts: getNextHost`).
- **Client-portal `/portal/projects`** (separate, already-secure-per-triage contact-facing view) — not touched; out of scope, different audience.

## Verification — required before reporting done

**No browser tool is available in this environment** (same constraint every other module audit in this project has hit and disclosed — `calendar.md`, `crm.md`). Live verification here means the same standard `calendar.md`'s Follow-Up Pass established: DB-level scripted tests against the real linked Supabase project (service-role key, throwaway data, cleaned up after), plus direct source-code tracing for the wiring itself, plus a full-project `npx tsc --noEmit` pass.

| Check | Result |
|---|---|
| `operations.ts`'s `getProjects`/`createProject` confirmed still on the weak pattern, live, before fixing | ✅ — direct file read, not assumed from `security-remediation.md`'s silence alone |
| `security-remediation.md` searched end-to-end for `getProjects`/`createProject`/`operations.ts` | ✅ — zero fix entries found; Priority 4's own re-derived "still open" table omits `operations.ts` entirely |
| `ProjectCard`'s "Manage Node" and "..." confirmed to have zero `onClick`/handler props, pre-fix | ✅ — direct source read |
| Confirmed no `/projects/[id]` route and no project-detail modal existed anywhere pre-fix | ✅ — `find`/`grep` across `src/app`, zero matches |
| Confirmed `pagesUI/project/project-details/*` is dead, hardcoded template content | ✅ — zero importers under `src/app`; `ProjectSummary.tsx` renders fixed "Laravel education app" copy with no props |
| Confirmed `projects` table has no `progress`/`team_size` column (live schema query, real linked Supabase project) | ✅ — root cause of both stuck placeholder figures |
| Confirmed `project_tasks` has RLS enabled with no internal-team-member policy | ✅ — read every migration referencing `project_tasks`; only the portal/client SELECT policy exists |
| `npx tsc --noEmit` across the full project, post-fix | ✅ — 0 errors |
| Live DB test: created a throwaway project + 3 real `project_tasks` (2 done, 1 todo, real assignee) against the linked Supabase project, ran the exact post-fix aggregation logic via `tsx` | ✅ → `{ progress: 67, team_size: 1 }`, matching hand-computed expectation exactly |
| Cleaned up: deleted the throwaway project; confirmed its tasks cascade-deleted (0 rows remaining) | ✅ |
| `next dev` boots clean; `/projects` returns a 307 redirect to sign-in with no session (expected, no compile/runtime error in middleware or the touched route) | ✅ |
| Full authenticated click-through of "Manage Node"/"..."/task checklist/timeline editing through an actual browser session | **Not performed** — no browser-automation tool and no way to mint a real authenticated session non-interactively in this environment (same disclosed gap as every prior module audit in this project). Manual checklist below closes this. |

**Manual verification checklist (for the user):**
1. Open `/projects` with a workspace that has at least one project. Click "Manage Node" — confirm the modal opens with the real name/description/status pre-filled.
2. Edit the name/description/status, click "Save Changes," confirm the card updates after the modal closes/page refresh.
3. Set a start/due date, click "Save Timeline," reopen the modal, confirm the dates persisted.
4. Add a task, assign it to a real teammate, confirm "team_size"/the assignee shows up; check the task's checkbox, confirm the progress bar and "% Complete" both update; reopen the card list and confirm the same numbers show on the card itself (not just inside the modal).
5. Click "...", choose "Delete," confirm the project (and its tasks) disappear.
6. Type into "Filter nodes..." and confirm the grid actually narrows to matching cards, and clears back to the full list when cleared.
7. As a user with no membership in a given workspace, confirm `getProjects`/`createProject` now reject (Part A) — e.g. attempt via a second, non-member account.
