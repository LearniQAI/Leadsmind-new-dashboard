# Calendar Module — Premium Light-Theme Redesign Spec

Visual/structural redesign of the Calendar module. **No logic changes** — every
data binding, server action, OAuth flow, round-robin pick, recurrence scope,
waitlist token check stays exactly as built in Tasks 62–70.

---

## Step 1 — Audit result

### Token system (confirmed, reused — NOT reinvented)

Central source: **`src/lib/design/dashboardDesignTokens.ts`** + the primitive
library **`src/components/dashboard-ui/`** (`DashCard`, `DashButton`,
`DashModal*`, `DashFormField`/`DashInput`/`DashTextarea`, `DashStatusPill`,
`DashEmptyState`, `DashSectionHeader`, `DashTabs`, `DashTable`, `DashDropdown`).
These already back the HR module and course pages.

| Token | Value |
|---|---|
| Page bg | `bg-dash-bg` (#FFFFFF) / section tint `bg-dash-surface` (#F8F9FC) |
| Border | `border-dash-border` (#E2E8F0) |
| Text | `text-dash-text` (#0F172A) / muted `text-dash-textMuted` (#475569) |
| Accent | `dash-accent` (#1359FF) |
| Card | `rounded-2xl border border-dash-border bg-white shadow-sm` (+`hover:shadow-md` if interactive) |
| Modal | `DashModalContent` — `rounded-2xl border-dash-border bg-white p-6 shadow-xl`, overlay `bg-dash-text/40 backdrop-blur-sm` |
| Button | `DashButton` variants `primary` (blue gradient) / `secondary` / `ghost` / `destructive`; sizes `sm` h-9, `default` h-11, `lg` h-14 |
| Input | `DashInput`/`DashTextarea` — `h-11 rounded-xl border-dash-border`, focus ring `ring-dash-accent` |
| Status | `DashStatusPill` — sentence case, `bg-<color>/10 text-<color>`: `success` green, `warning` amber, `danger` red, `accent` blue, `neutral` grey, `info` |
| Type | headings `font-space` (Space Grotesk); body `font-sans` (DM Sans); muted body #475569 |
| Icons | `lucide-react`, stroke 2, 14px inline / 20px standalone |
| Motion | `transition-*` + always `motion-reduce:transition-none` |

### Status colour semantics (consistent everywhere in this module)

| Meaning | Pill |
|---|---|
| Booking confirmed / connected / spot held | `success` (green) |
| Sync error ("couldn't sync to Google/Outlook") / waitlist / full session / pending-connection nudge | `warning` (amber) |
| Cancelled / destructive | `danger` (red) |
| Recurring badge / round-robin / info chips | `accent` (blue) or `info` |
| Coming-soon / not configured | `neutral` (grey) |

### Genericness self-review rules (from the HR redesign discipline)

1. **Kill reflexive ALL-CAPS eyebrows.** The public flow currently has
   `font-black uppercase tracking-[0.2em]` on nearly every label. Keep at most
   ONE small-caps eyebrow per page section, and only where it earns it
   (a trust marker). Field labels → sentence case `text-[13px] font-semibold`.
2. **Differentiate card types.** A stat card (number-forward, tinted icon
   chip), a booking-page list row (dense, action on the right), and a modal
   panel (flat, no hover-lift) must not be the same soft-shadow box.
3. **One meaning per colour** — table above, applied identically on every page.
4. **The public booking page is the storefront** — same care as the course
   checkout redesign: real whitespace, a trustworthy sidebar, legible type,
   works one-handed on a phone.

### File map (scope)

**Public / customer-facing** (currently a dark `var(--n900)` theme — full conversion):
- `src/app/book/[slug]/page.tsx`, `src/app/book/domain/[domainName]/[slug]/page.tsx` (shell)
- `src/app/book/manage/[token]/page.tsx` + `components/calendar/public/ManageBookingClient.tsx`
- `src/app/book/waitlist/[token]/page.tsx` + `WaitlistAcceptClient.tsx` + `AttendeeManageClient.tsx`
- `components/calendar/public/BookingClientWrapper.tsx`, `BookingFlow.tsx`, `BookingForm.tsx`, `TimeSlotPicker.tsx`
- `src/app/meet/[id]/page.tsx` + `components/calendar/meet/PreJoinLobby.tsx` (lobby + error/loading states → light; the in-call Jitsi surface stays dark — conventional for video rooms)

**Internal dashboard** (mostly already on `dash-*` tokens — consistency pass):
- `src/app/calendar/{page,CalendarClient,waitlist/page,instant-meet/page,analytics/page,loading}.tsx`
- `components/calendar/`: `CalendarClient`, `CalendarStats`, `CalendarHeader`, `CalendarToolbar`, `CalendarList`, `CalendarEmptyState`, `AppointmentsList`, `WaitlistManager`, `InstantMeetClient`, `CalendarAnalyticsClient`, `BookingHeatmap`, `OutcomeManager`, `IntakeFormBuilder`, `CreditPackageEditor`
- `components/calendar/views/`: `Month`, `Week`, `Day`, `List`, `PagesView`
- `components/calendar/settings/RoundRobinSettings.tsx`
- `components/calendar/menu/`: `DateTimeStep`, `ProviderStep`, `ServiceMenuStep`
- `components/calendar/admin/AttendeeRoster.tsx`

**Modals** (each restyled to `DashModal*`):
`BookingModal`, `AppointmentDetailsModal`, `CalendarSettingsModal`,
`ConfirmationModal`, `RecurrenceScopeModal`, `RoundRobinPoolModal`

**Integrations Hub** — `src/app/settings/integrations-hub/page.tsx` +
`components/settings/{ConnectionCard,ConnectProviderModal}.tsx` (Google / Outlook
/ Zoom / Teams cards, connected/coming-soon states).

---

## Step 2 — Design plan

### Public booking page (`/book/[slug]`)

- Shell: `min-h-screen bg-dash-bg`. Drop the dark blurred blobs; replace with a
  faint top-edge gradient wash (`bg-gradient-to-b from-dash-surface to-white`)
  and generous vertical rhythm (`py-12 lg:py-20`).
- Two-column `lg:grid-cols-[380px_1fr]`, collapses to one column, sidebar first,
  on mobile.
- **Sidebar** = identity + facts, not a card kit: workspace/calendar name in
  `font-space text-3xl font-bold`, a real description paragraph, then a clean
  definition list (Duration / Timezone / Group session) with 36px tinted
  `dash-surface` icon chips. One trust marker at the bottom in a bordered
  `dash-surface` panel — not three badges.
- **Booking panel** = `DashCard` (flat, `padding none`, internal `p-6 sm:p-8`),
  header row with the date + a horizontal 7-day scroller (selected day =
  `bg-dash-accent text-white`, rest = `border-dash-border` chips).
- Language + timezone row: a quiet `text-[12px] text-dash-textMuted` line with a
  small segmented EN/AF control (`DashTabs`-style, not black pills).
- Slot grid: `DashCard`-less; buttons `h-12 rounded-xl border-dash-border`,
  selected `bg-dash-accent text-white`, **full/waitlist** `border-amber/40
  bg-amber/5 text-amber` + a `DashStatusPill warning` "Waitlist" chip, "N left"
  as a plain `text-[11px] text-dash-textMuted`.
- Form: `DashFormField` + `DashInput`/`DashTextarea` (drop `PremiumInput`), 2-col
  name/email/phone grid, custom fields, notes, a real POPIA consent row
  (`dash-surface` panel, checkbox + sentence-case label), payment notice as
  `DashStatusPill`-flavoured `bg-amber/5` panel. Submit = `DashButton lg`
  full-width; disabled hint in muted text (no pulsing red caps).
- Success / waitlist-joined screen: centered, green (booked) or amber (waitlist)
  `rounded-2xl` icon chip, `font-space` headline, muted paragraph,
  `DashButton secondary` "Book another".

### Manage / reschedule (`/book/manage/[token]`) & waitlist (`/book/waitlist/[token]`)

- Same light shell, single centered `max-w-[520px]` `DashCard`.
- One eyebrow ("Manage your booking" / "A spot opened up") as a small
  `DashStatusPill accent`.
- Detail view: title `font-space`, calendar name as muted line (not caps), a
  clean icon list (date / time / meeting link or honest note). Meeting-link
  note rendered from `meetingLinkNote()` unchanged.
- Reschedule: back link (sentence case), 7-day scroller, slot grid (same style
  as booking), `DashButton` confirm.
- Cancel confirm: red icon chip, two `DashButton`s (`ghost` keep / `destructive`
  cancel).
- Within-lockout state: `bg-amber/5 border-amber/20` panel, amber text.
- Terminal states (cancelled / rescheduled / accepted / spot-cancelled):
  centered icon chip (green or red) + headline + line.
- `AttendeeManageClient` "your spot / cancel my spot" and `WaitlistAcceptClient`
  offer/accept/decline — same panel, `DashButton` actions, `DashStatusPill`
  for "Your spot is confirmed" (success) and the offer-expiry line.

### Internal dashboard

Bring every calendar page onto the standard dashboard chrome already used by HR:
`bg-dash-bg` page, `DashCard` panels, `DashSectionHeader` card headers,
`DashStatsGrid`-style stat cards (tinted icon chip + big number + label +
delta), `DashTabs` for the Overview/Booking-pages/… tabs, `DashEmptyState` for
every empty list, `DashStatusPill` for booking status + sync-error + connection
status + the recurring badge + waitlist position.

### Modals

All six on `DashModalContent` — same 16px radius, `shadow-xl`, `p-6`,
`DashModalHeader`/`Title`/`Description`/`Footer`, `DashButton` action rows.
`RecurrenceScopeModal`: three selectable option rows (radio-card style,
`border-dash-border` → `border-dash-accent bg-dash-accent/5` selected).
`RoundRobinPoolModal`: member list with avatar + toggle, zero-host warning as
`bg-amber/5` panel. The "Repeat" section inside `BookingModal`: a bordered
`dash-surface` sub-panel with frequency `DashTabs`, interval `DashInput`, end
condition radio group — visually distinct from the plain fields above it.

### Integrations Hub video-conferencing section

`ConnectionCard` on `DashCard` (non-interactive), connected = `DashStatusPill
success` + account label + `DashButton ghost sm` "Disconnect"; available =
`DashButton primary sm` "Connect"; coming-soon = `DashStatusPill neutral`
"Coming soon" + dimmed. Same treatment for Google / Outlook / Zoom / Teams.

---

## Step 3 — Build order

1. Public customer flow (shells + `public/*` components + meet lobby). ← highest priority
2. Internal calendar pages + views.
3. All six modals.
4. Integrations Hub cards + `RoundRobinSettings`.

## Step 4 — Verification

tsc + lint + full vitest + `next build` after each phase. Screenshots + live
click-through regression: **owned by the user** (this session has no browser) —
the user confirmed they will do the manual UI/functional verification.

---

## What the audit actually found (updated after reading every file)

**The internal dashboard calendar + all six modals + the Integrations Hub cards
were already built on the `dash-*` token system** by the Task 62–70 work
(`DashCard`, `DashButton`, `DashModal*`, `DashStatusPill`, `bg-white`,
`border-dash-border`, sentence-case, green/amber/red status semantics). They did
not need a redesign — they already match HR/courses.

**The only surface still on the old dark `var(--n900)` theme was the
public-facing customer flow** (`/book/*`, `/meet/[id]`, `components/calendar/public/*`,
`meet/PreJoinLobby`). That is what this pass converted.

**Confirmed unreachable / dead (left untouched, not in scope):**
- `src/app/calendar/CalendarClient.tsx` — zero imports (the live one is
  `src/components/calendar/CalendarClient.tsx`).
- `src/components/calendar/menu/{DateTimeStep,ProviderStep,ServiceMenuStep}.tsx`
  — zero imports; an orphaned service-menu booking flow, still dark-themed +
  generic copy ("Select your Strategist", "Global Node"). Not wired to any route.

**Also cleaned (reachable, older `bg-card`/`bg-bgBody` tokens + generic copy):**
- `IntakeFormBuilder.tsx` → `dash-*` tokens, `DashButton`/`DashInput`, real copy
  ("Ask before the meeting" instead of "Intake protocol / Sync protocol").
- `CalendarStats.tsx` → removed the meaningless `+0%` / `Neutral` fake trend
  chips; removed a duplicate local `cn`; `font-space` numbers, `rounded-xl`
  icon chips.
