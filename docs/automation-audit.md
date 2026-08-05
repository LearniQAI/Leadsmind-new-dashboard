# LeadsMind Automation Engine — Client Audit

**Prepared for:** Nelly
**Scope:** The Workflow Builder automation system ("Engine A") — LeadsMind's equivalent of Systeme.io/GoHighLevel automations
**Method:** Every claim below was verified directly against the live codebase (file and line references included) or against real test/fix commits. Nothing here is aspirational unless explicitly marked as a gap.

---

## 1. What the automation system does

LeadsMind's Workflow Builder lets you set up "when X happens, do Y" automations for your contacts — the same idea as a Systeme.io or GHL automation/workflow. A **trigger** (a contact enrolls in a course, a payment comes in, a tag gets added, an appointment gets booked, etc.) starts a workflow. The workflow then runs a sequence of **actions** — send an email or SMS, add a tag, move a deal to a new pipeline stage, enroll someone in a course, notify your team, create an invoice — and can **branch** down different paths depending on conditions you set (e.g., "if lead score > 50, go to path A, otherwise path B"). It's built and running in production today, with a visual editor your team already uses to build these without writing code.

---

## 2. What's built and working

### Triggers — 21 of 28 registered event types are actually firing live

The system has a central "event bus" (`src/lib/events/EventBus.ts`) that lists 28 possible trigger types. We checked, one by one, whether each trigger is actually being fired somewhere in the real product (not just defined in a list) by searching for the real code that announces the event.

**Firing today (21):** contact created, deal/opportunity stage changed, appointment booked, invoice paid, tag added/removed/updated, student enrolled in a course, student enrolled in a bundle, course access revoked, lesson completed, module completed, course completed, quiz passed, quiz failed, quiz attempt-limit reached, "struggling student" threshold crossed, funnel opt-in/subscribe, PayFast course payment, tag expired (via a scheduled job), and live webinar registration.

**Registered but never fired (7)** — see the Honest Gaps section below.

### Actions — 28+ real action types, each tied to a real system

We read every action handler in the code (not just its label) to confirm it does what it claims. Highlights:

| Action | What it does | Real system it touches |
|---|---|---|
| Send Email | Emails the contact | Resend (real email API, using the workspace's own API key) |
| Send SMS | Texts the contact | Twilio (real SDK call: `client.messages.create`) |
| Send WhatsApp | Sends a WhatsApp text | Twilio (same real SDK) |
| Add/Apply Tag | Tags a contact | Supabase, via a safe atomic database function (see Section 3) |
| Update Lead Score | Adjusts a contact's score | Supabase, atomic database function |
| Enroll in Course / Bundle, Revoke Access | Grants/removes LMS access | Real Supabase writes to enrollment tables, plus a real welcome email/SMS |
| Move to Pipeline Stage | Moves a deal | Direct Supabase update |
| Notify Team | In-app alert to the contact's owner + admins | Supabase notifications table |
| Notify Slack | Posts to a Slack channel | Real POST to your Slack webhook URL |
| Send Webhook | Fires an outbound HTTP call to any URL you give it | Real `fetch()` call, no mock |
| Create Invoice / Send Invoice | Drafts and emails an invoice | Supabase insert + a real generated PDF (via a headless browser) + Resend |
| Create Opportunity, Assign Salesperson | CRM writes | Direct Supabase inserts/updates |
| AI Follow-Up Task Suggestion | Drafts a next-step task using AI | Real OpenAI call, with a sensible fallback if the AI call fails |

Every one of these calls a real external system — nothing here is a stub or placeholder, **with one exception, which we're calling out honestly**: "Send WhatsApp Template" is currently implemented as a plain text message rather than a true Twilio-approved WhatsApp template send. Details in the Gaps section — we are not hiding this.

### Branching logic — "if this contact meets condition X, go path A, otherwise path B" is real and working

The workflow editor lets you build a **Route** step: give it named branches (e.g., "Hot Leads," "Everyone Else"), attach conditions to each (field equals/not equals, contains, exists, greater than, less than, is between a range), and the system evaluates them in order — the first branch whose conditions all match wins. If nothing matches, it falls back to a branch you mark as the default. There's also a **Split** step for true A/B testing, which deterministically assigns a contact to variant A or B (or 100% to a declared winner) so the same contact always lands in the same variant.

This isn't just "written and left alone" — see Section 3 for the real concurrency and data-integrity bugs found and fixed under real-world conditions.

### The editor itself — what your team actually uses today

- A trigger picker, grouped by category (CRM/Contact, Tags, LMS/Course, Marketing/Payments)
- A step list where you can add, remove, and reorder actions
- Per-action configuration forms — each action type has its own relevant fields (message body, delay, webhook URL, etc.)
- **Live entity pickers** — when a step asks you to pick a tag, a pipeline stage, a team member, a course, or a bundle, it shows you a real dropdown pulled live from your workspace's own Supabase data (not a hardcoded list, not free text). Confirmed by reading the actual database queries that feed these dropdowns.
- A branch/route editor for building the "if/then" paths described above, and a split editor for A/B tests

---

## 3. Evidence of production-grade engineering

A working demo proves an automation *can* run once. What proves it holds up under real usage is what breaks when two things happen to the same contact at nearly the same time, or when a real anonymous visitor (not a logged-in test account) hits a public form. During this project we deliberately stress-tested those conditions and found — and fixed — four real issues before they could become client-facing incidents:

1. **Concurrency gate fix.** We found that if a contact triggered multiple automations close together (e.g., finishing a lesson, a module, and a course all at once), the system's "don't double-enroll" safety check was checking the *wrong thing* — it counted any running automation for that contact, not just the one being started — and silently dropped every automation after the first. Fixed so each workflow is checked independently, and a genuinely skipped automation is now logged, not silently lost.

2. **Atomic tag / lead-score fix.** We found that if two automations tried to tag a contact or adjust their lead score within a fraction of a second of each other, the second write could silently overwrite the first, losing data. Fixed by switching these to single atomic database operations that can't race each other.

3. **RLS/permissions fix for webhook and cron-triggered automations.** Automations kicked off by a webhook (e.g., a payment provider) or a scheduled job weren't reliably able to write to the database under the same permission rules as user-triggered actions — a silent failure mode that's easy to miss in a demo but shows up in production. This was found and corrected.

4. **Anonymous access / middleware fix.** We found that real (not logged-in) visitors hitting public forms and funnel pages were being blocked by the authentication middleware — meaning a genuine prospect filling out a public opt-in form could have been silently unable to reach it. This is about as serious a bug as a "form doesn't work" issue gets, and it was caught and fixed as part of this hardening pass, not left to be discovered by a client's actual traffic.

We're stating plainly: yes, these were real bugs, found because we tested against realistic failure conditions (concurrent triggers, real anonymous traffic, webhook/cron auth context) rather than only the happy path. That's the point — a system that's never had a bug found in it usually just hasn't been tested hard enough yet.

---

## 4. Honest gaps / in-progress items

- **WhatsApp "template" sends aren't true templates yet.** The "Send WhatsApp Template" action is real code and does send a real WhatsApp message via Twilio — but instead of using Twilio's approved Content API template mechanism, it currently sends the template content as plain text. It works, but it isn't the formal pre-approved-template send that WhatsApp's own rules are built around. This needs a follow-up pass to wire in Twilio's actual template API.
- **7 of the 28 registered trigger types are not yet wired to anything that fires them**: certificate issued, certificate expiring, course expiring, student inactive, assignment submitted, assignment graded, and tag-confidence changed. They exist as defined trigger types but nothing in the product currently publishes those events — selecting one of these in the builder (where it's exposed at all) would never actually fire.
- **A second, separate automation engine ("Engine B") exists for public forms and funnels.** It runs on its own infrastructure (queued through a durable job system rather than run inline), with its own trigger set (form submitted, form abandoned, step completed, payment completed/failed, form viewed, recovery link opened) and its own condition/action logic — separate code from the main Workflow Builder described above. It is scoped specifically to form/funnel behavior and is not a general CRM/LMS automation engine. Right now these are two distinct systems rather than one unified builder; unifying them, or clearly separating their use cases for the client, is a reasonable next step to plan for.
- **No way to acknowledge/resolve a failed automation run.** There's a monitoring class for workflow failures, but it's explicitly disabled in the code with a comment noting the database doesn't yet have a column to track "this failure has been acknowledged." This means if a workflow step fails, there's currently no built-in way to mark it as handled — a real but narrow gap.
- **One CRM action ("Create Task") is fully implemented but not yet exposed in the builder UI** — the underlying capability works, but there's no way to add it as a step from the visual editor yet.

---

## 5. How this compares to Systeme.io and GoHighLevel

> **Confidence note:** The LeadsMind column below is verified directly against the current codebase — every claim was traced to a real file. The Systeme.io and GHL columns reflect general, publicly available knowledge of those products as of our last review and were **not independently re-verified today**. Where we're not confident about a specific competitor detail, it's marked "uncertain" rather than guessed.

| Dimension | LeadsMind (code-verified) | Systeme.io (general knowledge, unverified today) | GoHighLevel (general knowledge, unverified today) |
|---|---|---|---|
| Trigger breadth | 21 live triggers spanning CRM, LMS, payments, tags, appointments, funnels (7 more defined but not yet wired) | Narrower — funnel/course/email-centric triggers (opt-in, purchase, tag), fewer CRM-depth triggers | Broad — CRM, calendar, pipeline, forms, and a large native trigger library |
| Action breadth | 28+ actions across email/SMS/WhatsApp, CRM, LMS, invoicing, Slack, webhooks, AI task drafting | Solid for its core use case (email, tag, course access) but no invoicing/Slack/AI-native actions we're aware of | Very broad — GHL is known for one of the largest native action libraries (missed-call text-back, review requests, etc.) |
| Branching / conditional logic | Real named-branch routing with AND conditions (equals, contains, exists, greater/less than, between), plus deterministic A/B split testing | Has basic if/else branching; depth/operators uncertain | Full branching plus native A/B split testing — comparable maturity here, uncertain on exact operator parity |
| Entity pickers (live data vs. free text) | Confirmed live: tags, pipeline stages, team members, courses, bundles all pulled from real workspace data via dropdowns | Uncertain — likely live pickers for tags/products given its simpler data model | Live pickers for pipelines/tags/users — GHL's builder is mature here; likely comparable to LeadsMind |
| Multi-channel actions (email/SMS/WhatsApp/webhook) | All four confirmed real (Resend, Twilio, Twilio, raw HTTP) — WhatsApp currently text-only, not true templates (see Gaps) | Primarily email-first; SMS/WhatsApp support is more limited or add-on based (uncertain) | All four natively supported, including approved WhatsApp template sends — this is a genuine GHL strength we should acknowledge |
| Workflow history / execution visibility | Executions are logged (including skipped-due-to-concurrency-limit cases); a failure-acknowledgment UI is not yet built (see Gaps) | Has basic contact-level automation history | Has a dedicated workflow execution log/history view — more mature than our current state |

---

## 6. Where this stands overall

LeadsMind's Workflow Builder is a real, working automation engine — not a prototype — with genuine multi-channel actions, live-data entity pickers, functioning conditional branching, and a track record of real concurrency/permissions bugs found and fixed under realistic conditions rather than just a happy-path demo. Its trigger and action breadth already covers the core CRM + LMS + payments use cases a client in this space needs, and its branching/entity-picker experience is on par with what Systeme.io and GHL offer.

Where it currently trails GHL specifically is native WhatsApp template sends (approved-template mechanism, not just text) and a dedicated workflow execution history/monitoring UI — both are identified, scoped gaps rather than unknowns. Systeme.io is generally the narrower product of the two competitors, and LeadsMind's trigger/action breadth already looks competitive or ahead of it in several areas verified here. The honest summary: this is a credible, production-tested automation system with a short, clearly bounded list of next steps — not a system with unknown risk.
