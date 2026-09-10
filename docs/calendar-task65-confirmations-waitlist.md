# Task 65 — Confirmations & Self-Service (re-verify) + Waitlist Accept (build)

All evidence below is from a real live run against the real DB
(`scripts/db-checks/task65-verify.ts` → **26/26**). Only outbound HTTP
(Google Calendar + Resend) is intercepted so email bodies and calendar
effects can be asserted.

---

## Part 1 — Re-verify confirmations & self-service cancel/reschedule

### Step 1 audit

1. **Confirmation-email content vs Task 63 states** — `notifications.ts`
   builds the meeting-link line from the real resolved state:
   `apt.meeting_link ? "Meeting link: …" : —` plus
   `meetingLinkNote(metadata.meeting_link_status, audience)`. Correct for
   every state (real Meet link, `/meet/[id]` fallback, Zoom "coming soon").
   **No stale "a link always exists" assumption.**
2. **Reschedule email** — recomputes `New time` from the freshly-reloaded
   row (which `manage.ts` updates before `sendRescheduleNotice`), and
   `pushEventTimeUpdate` runs first — so the email, the DB, and the real
   Google event are all consistent.
3. **`calendar_sync_error` in the manage UI** — decided **host-facing
   only**. The booker's own action succeeded; the host's Google Calendar
   not syncing isn't the booker's concern or actionable for them. The
   host already sees it in `AppointmentDetailsModal`.
4. **Token security** — HMAC-SHA256 over the appointment id
   (`manageToken.ts`), same pattern as `unsubscribeToken` / `shipmentToken`.
   Expiry/single-use enforced against live DB state (`status`,
   `start_time`) on every call. Scoped to one appointment — the id can't
   be swapped without the server secret.

### Step 2 fixes (minor — this part was re-verification)

- `notifications.ts`: the host **reschedule + cancel** emails now append a
  `⚠ … could not be synced to your connected Google/Outlook calendar …`
  line when `metadata.calendar_sync_error` is set (a host who only reads
  email would otherwise never know). Booker emails unchanged.
- The **booker reschedule email** now also carries `meetingLinkNote(...)`
  for consistency with the confirmation email (e.g. the Zoom case).

### Step 3 — Verified live

| Check | Result |
|---|---|
| `google_meet` confirmation email → contains a **real** `meet.google.com/…` link, no placeholder | ✅ |
| `zoom` confirmation email → **no link line**, no `zoom.us` URL, says "coming soon / link to follow" | ✅ |
| reschedule via `/book/manage/[token]` → succeeds; email shows the **new** time + a "Previous time" line | ✅ |
| … and the **real Google Calendar event moved** to the new time | ✅ |
| cancel via `/book/manage/[token]` → succeeds; email clearly says "has been cancelled"; **real Google event deleted** | ✅ |
| token security: a manage token cannot be used for a different appointment | ✅ |

Plus `notifications.test.ts` (6) covering the meeting-link states + the
new `calendar_sync_error` warning.

---

## Part 2 — Waitlist-accept flow (built from scratch)

### Step 1 audit

1. **Data model** — real, per **group session**: `appointments`
   (`max_attendees`, `current_attendee_count`, `waitlist_enabled`) +
   `booking_waitlists` (`position`, `offered_at`, `offer_expires_at`,
   `confirmed`). A DB trigger `tr_cancel_promotion` already marks the next
   person `offered` (2h window) when `current_attendee_count` drops.
2. **Trigger point** — a group-session cancellation that decrements
   `current_attendee_count` (the `manage.ts` cancel already does this).
   The DB trigger picks the next person; **nothing sent them anything.**
3. **Reuse** — `sendEmail` (the one email pipeline) ✓; a new HMAC token
   mirroring `manageToken.ts` for the accept link ✓.
4. **Offer semantics** — **FIFO by `position`, one live offer at a time,
   2-hour window** (matches the existing DB trigger + `offerWaitlistSpot`).
   An offer that lapses unaccepted = that person **forfeits their turn**;
   the queue advances past them (they're only re-offered if literally
   everyone remaining has also lapsed). Not specified in docs — reasoning
   stated here.
5. **Public "join a waitlist" flow** — **does not exist.** The only
   reachable join path today is the admin `/calendar/waitlist` → "Add
   user" (`addContactToWaitlist`). There is no public group-session
   booking flow at all (no `class-booking.ts`, the public `/book/[slug]`
   is purely slot-based). Building a public class-booking + waitlist-join
   UI is a separate, larger feature — **deferred** (see below).

### Step 2 build

| File | Purpose |
|---|---|
| `src/lib/calendar/waitlistToken.ts` *(new)* | `${entryId}.${hmac}` accept-link token — same pattern as `manageToken.ts`. |
| `src/lib/calendar/waitlist.ts` *(new)* | `sendWaitlistOfferEmail(entryId)` (real email, time-limited accept link); `notifyNewlyOfferedWaitlist(appointmentId)` (called after a spot frees — emails whoever the trigger just offered, with a self-advance safety net); `advanceWaitlistForAppointment` (FIFO, skips lapsed people); `advanceExpiredWaitlistOffers()` (cron body). |
| `src/app/actions/calendar/waitlistAccept.ts` *(new)* | `getWaitlistOffer(token)`, `acceptWaitlistOffer(token)` (atomic capacity claim → `confirmed = true` → confirmation email to the **claimer**, with a rollback if the confirm write fails), `declineWaitlistOffer(token)`. Every call re-verifies the token + live state server-side. |
| `src/app/book/waitlist/[token]/page.tsx` + `WaitlistAcceptClient.tsx` *(new)* | Public accept page — same look as `/book/manage/[token]`. |
| `src/lib/calendar/notifications.ts` | `NotifyOptions.overrideRecipient` — the waitlist-promotion confirmation emails the person who claimed the spot, not `appointments.contact`. |
| `src/app/actions/calendar/manage.ts` | group-session cancel now calls `notifyNewlyOfferedWaitlist`. |
| `src/app/actions/calendar.ts` | `offerWaitlistSpot` (admin "Offer spot" button) now actually sends the email — previously a no-op that a toast falsely claimed. |
| `src/app/api/cron/waitlist-offers/route.ts` *(new)* + `vercel.json` | Hourly cron (`10 * * * *`) advancing lapsed offers. |

### Step 3 — Verified live

| Check | Result |
|---|---|
| a spot frees → waitlist person #1 marked "offered" with an expiry window | ✅ |
| person #1 receives a **real offer email** with a working `/book/waitlist/<token>` accept link | ✅ |
| `getWaitlistOffer(token)` returns a live valid offer | ✅ |
| `acceptWaitlistOffer` → **the session spot is actually claimed** (`current_attendee_count` 1 → 2) | ✅ |
| … person #1 removed from the waitlist (`confirmed = true`) | ✅ |
| … person #1 (not the session's original booker) gets a "You're off the waitlist" confirmation email | ✅ |
| another free-up → person #2 offered; **let #2's offer lapse** → cron advances to **person #3** and emails them (not a silent stuck slot) | ✅ |

Plus `waitlist.test.ts` (7) covering FIFO / lapsed-skip / live-offer /
all-lapsed fallback / trigger-notify.

---

## Deliberately Deferred

- **Public "join the waitlist" UI** — depends on a real **public
  group-session / class booking flow**, which does not exist in this
  codebase (the public booking page is slot-based only; there's no
  per-attendee record — `fn_secure_booking_or_waitlist`'s "booked" mode
  just bumps a counter). That's a distinct feature (class booking, ~Task
  71 territory). Today's reachable join path is the admin
  `/calendar/waitlist` → "Add user", which is sufficient to operate and
  test the offer→accept→advance loop this task built.
- **Creating a waitlist-enabled group session from the UI** —
  `CalendarSettingsModal` has no `max_attendees` / `waitlist_enabled`
  fields; sessions are created via `/api/v1/appointments` or direct DB.
  Same "class booking feature" gap; out of scope here.
- **Portal group-session cancel** (`portalBookings.ts`) doesn't decrement
  `current_attendee_count`, so a portal cancel of a group session doesn't
  free a spot / trigger the waitlist. Group sessions via the client
  portal are an unlikely combination; noted, not fixed.
- **Waitlist offer ranking beyond FIFO** (priority, weighting) — FIFO by
  `position` is the model the schema + DB trigger already encode; a
  smarter ranking system is a separate feature.
- **Real end-to-end email *delivery*** — this env's `RESEND_API_KEY` is a
  placeholder, so the live run intercepts the Resend HTTP call and
  asserts the exact rendered body. Final manual QA with a real key (send
  a booking, a reschedule, a cancel, and a waitlist offer to a real
  inbox) is still worth doing.
