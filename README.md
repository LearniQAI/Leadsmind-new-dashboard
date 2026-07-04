# LeadsMind — Complete Feature Inventory

This repository contains a Next.js 14 SaaS platform with a broad set of business modules spanning CRM, LMS, finance, automation, HR, calendar, communications, content marketing, settings, and integrations.

This document is a repository-level audit summary of the implemented features, workflows, routes, server actions, API routes, and database-backed modules found in the codebase.

---

## Overview

- Platform: Next.js 14
- Primary stack: TypeScript, React, Supabase, Tailwind
- Architecture: App Router, server actions, API routes, database-backed workflow modules
- Scope: Multi-tenant SaaS application with modules for sales, learning, accounting, workflows, HR, booking, messaging, content, and settings

---

## 1. App Routes Inventory

### CRM and Sales
- /crm — CRM dashboard
- /crm/leads — lead management
- /crm/deals — deals management
- /crm/pipelines — sales pipeline management
- /crm/activity — CRM activity feed
- /crm/crm-setup — CRM setup workflow
- /contacts — contact list and search
- /contacts/new — create contact
- /contacts/[id] — contact detail
- /contacts/[id]/edit — edit contact
- /contacts/tags — contact tagging and segmentation
- /pipelines — pipeline overview
- /pipelines/new — create pipeline
- /pipelines/[id]/stages — pipeline stage setup
- /forms — forms dashboard
- /forms/[id] — form detail
- /forms/[id]/submissions — form submissions
- /forms/[id]/partial-submissions — partial submissions
- /forms/[id]/analytics — form analytics
- /forms/[id]/automations — form automation settings
- /forms/[id]/governance — form governance
- /forms/[id]/ab-testing — A/B testing
- /forms/builder/[id] — form builder
- /lead-finder — lead discovery UI
- /lead-finder/results — results list
- /lead-finder/saved — saved searches
- /lead-finder/watchlists — watchlists
- /lead-finder/map — map-based lead discovery
- /lead-finder/lead/[id] — lead detail
- /lead-finder/contact/[id] — discovered contact detail

### Finance and Billing
- /finance — finance overview
- /finance/transactions — accounting transactions
- /finance/reports — financial reports
- /finance/reconciliation — reconciliation view
- /finance/payment-gateways — payment gateway settings
- /finance/expenses — expense tracking
- /finance/connected-accounts — bank/account connections
- /invoices — invoices list
- /invoices/new — create invoice
- /invoices/[id]/edit — edit invoice
- /quotes — quotes dashboard
- /quotes/new — create quote
- /quotes/[id]/edit — edit quote
- /proposals — proposals list

### LMS and Education
- /courses — course catalog and admin view
- /courses/[id] — course workspace
- /courses/[id]/learn — learner course player
- /courses/[id]/quiz/[quizId] — quiz experience
- /courses/[id]/automations — course automations
- /courses/certificates — certificates page
- /student — student portal home
- /student/marketplace — marketplace
- /student/courses/[id] — student course detail
- /student/courses/[id]/remedial — remedial assignment page
- /student/checkout/[courseId] — checkout flow
- /unauthenticated/courses/[slug] — public course page

### Automation and Workflows
- /automation — workflow management home
- /automation/history — execution history
- /automations — automation list and management

### HR and Payroll
- /hr — HR overview
- /hr/employees — employee directory
- /hr/payroll — payroll dashboard
- /hr/leave — leave management
- /hr/time-tracking — time tracking
- /hrm/* — HRM submodule routes for attendance, timesheet, holidays, leave, overtime, employee profile, schedule, and warning workflows
- /payroll — payroll pages
- /payroll/payroll-payslip — payslip page
- /termination — termination workflow UI

### Calendar and Booking
- /calendar — calendar UI
- /calendar/analytics — booking analytics
- /calendar/instant-meet — instant meet flow
- /calendar/waitlist — waitlist management
- /book/[slug] — public booking page
- /meet/[id] — meeting room page
- /public/events/[workspaceSlug] — public event booking page

### Communication and Support
- /conversations — conversation inbox
- /support — support center
- /support/public-thread — public support thread
- /support/tickets-reply — ticket reply UI
- /apps/email-compose — email composer
- /apps/email-read — email reader
- /campaigns — campaign list
- /campaigns/[id]/builder — campaign editor

### Content and Marketing
- /blog — blog management
- /blog/[slug] — public blog post
- /blog/manage — blog management admin
- /blog/analytics — analytics
- /blog/comments — comments moderation
- /blog/editor/[id] — post editor
- /blog/new/* — create/import blog content
- /content-studio — content studio home
- /content-studio/[id] — content document workspace
- /content-studio/new — create content document
- /funnels — funnel dashboard
- /funnels/[id] — funnel detail
- /funnels/[id]/analytics — funnel analytics
- /editor/website/[id] — website page editor
- /editor/funnel/[id] — funnel editor
- /social — social publishing UI

### Settings and Integrations
- /settings — settings home
- /settings/workspace — workspace settings
- /settings/api — API key management
- /settings/billing — billing settings
- /settings/branding — branding settings
- /settings/developer — developer settings
- /settings/integrations-hub — integrations hub
- /settings/lena-chat — LENA chat settings
- /settings/support-widget — support widget settings
- /settings/ai — AI settings
- /settings/ai/credits — AI credits
- /workspace/team — workspace team management

---

## 2. CRM Module Audit

### Implemented CRM features

- Contacts management
  - UI: present
  - Server actions/API: present
  - Database: present

- Contact detail, edit, and view
  - UI: present
  - Server actions/API: present
  - Database: present

- Notes and tasks on contacts
  - UI: present
  - Server actions/API: present
  - Database: present

- Tags and segmentation
  - UI: present
  - Server actions/API: present
  - Database: present

- Contact activity feed
  - UI: present
  - Server actions/API: present
  - Database: present

- Leads and pipeline management
  - UI: present
  - Server actions/API: present
  - Database: present

- Opportunities and deals
  - UI: present
  - Server actions/API: present
  - Database: present

- Forms and lead capture
  - UI: present
  - Server actions/API: present
  - Database: present

- Quotes and proposals
  - UI: present
  - Server actions/API: present
  - Database: present

- Email/campaign sending to contacts
  - UI: present
  - Server actions/API: present
  - Database: present

---

## 3. LMS Module Audit

### Implemented LMS features

- Course creation and management
  - UI: present
  - Server actions/API: present
  - Database: present

- Course modules and lessons
  - UI: present
  - Server actions/API: present
  - Database: present

- Student enrollment
  - UI: present
  - Server actions/API: present
  - Database: present

- Quiz engine and assessments
  - UI: present
  - Server actions/API: present
  - Database: present

- Certificates
  - UI: present
  - Server actions/API: present
  - Database: present

- Student progress tracking
  - UI: present
  - Server actions/API: present
  - Database: present

- Expert profiles and sessions
  - UI: present in workspace experience
  - Backend/database: present

- Remedial assignments
  - UI: present
  - Server actions/API: present
  - Database: present

- Cohorts and RSVPs
  - Backend/database: present
  - UI: partial or indirect

---

## 4. Accounting / Finance Module Audit

### Implemented finance features

- Invoice creation and management
  - UI: present
  - Server actions/API: present
  - Database: present

- Quote/proposal generation
  - UI: present
  - Server actions/API: present
  - Database: present

- Payment processing (Stripe and PayFast)
  - UI: present
  - Webhooks/API: present
  - Database: present

- Expense tracking
  - UI: present
  - Server actions/API: present
  - Database: present

- Financial reports
  - UI: present
  - API: present
  - Database: present

- Credit notes
  - Backend/database: present
  - UI: not strongly surfaced

- Retainers
  - Backend/database: present
  - UI: not strongly surfaced

- Bank connections
  - UI: present
  - API: present
  - Database: present

- Accounting transactions
  - UI: present
  - API: present
  - Database: present

---

## 5. Automation Module Audit

### Implemented automation features

- Workflow builder
  - UI: present
  - Server actions/API: present
  - Database: present

- Workflow execution engine
  - Backend/database: present
  - UI: present

- Trigger types
  - Present in workflow definitions and seeded automation recipes

- Action types
  - Present for email, WhatsApp, task creation, wait, and conditional logic

- Campaign automation
  - Present through campaigns and cron dispatch routes

- Email sequences
  - Supported through workflows and campaign modules

- SMS automation
  - Backend/integration support exists
  - UI is less comprehensive

---

## 6. HR & Payroll Module Audit

### Implemented HR features

- Employee management
  - UI: present
  - API: present
  - Database: present

- Payroll processing
  - UI: present
  - API: present
  - Database: present

- Time tracking
  - UI: present
  - API: present
  - Database: present

- Leave management
  - UI: present
  - API: present
  - Database: present

- Termination workflows
  - UI: present
  - Workflow support: partial

- HR notifications
  - Backend/database: present
  - UI: partial

---

## 7. Calendar & Booking Module Audit

### Implemented calendar features

- Appointment booking
  - UI: present
  - Server actions/API: present
  - Database: present

- Calendar management
  - UI: present
  - Server actions/API: present
  - Database: present

- Availability rules
  - Backend/database: present
  - UI: partial

- Round robin assignment
  - Backend/database: present
  - UI: partial

- Public booking pages
  - UI: present
  - Backend: present

- Video/meet integration
  - UI: present
  - API: present
  - Database: present

---

## 8. Communication Module Audit

### Implemented communication features

- Email builder and sending
  - UI: present
  - Backend/API: present
  - Database: present

- SMS messaging
  - Integration/backend support: present
  - UI: partial

- WhatsApp / Meta integration
  - UI/API/backend: present

- Chat and LENA AI assistant
  - UI: present
  - API: present
  - Database: present

- Support tickets
  - UI: present
  - API: present
  - Database: present

- Notifications system
  - Backend/database: present
  - UI: partial

---

## 9. Content & Marketing Module Audit

### Implemented content features

- Blog management
  - UI: present
  - Server actions/API: present
  - Database: present

- SEO tools
  - Backend and UI support present in parts
  - Maturity: partial

- Content studio
  - UI: present
  - Server actions/API: present
  - Database: present

- Grammar and plagiarism checker
  - API/backend: present
  - UI: present in content workflow

- Social media posts
  - UI: present
  - Backend/API: present
  - Database: present

- Landing page and funnel builder
  - UI: present
  - Server actions/API: present
  - Database: present

- Forms builder
  - UI: present
  - Backend/API: present
  - Database: present

---

## 10. Settings & Integrations Audit

### Implemented settings features

- Workspace settings
  - UI: present
  - Backend/database: present

- Team management and invitations
  - UI: present
  - Backend/database: present

- API key management
  - UI: present
  - API/backend: present
  - Database: present

- Third-party integrations
  - UI: present
  - API/backend: present
  - Database: present

- Branding and white-label settings
  - UI: present
  - Backend/database: present

- Domain configuration
  - UI/API/backend: present

- Webhook management
  - API/backend: present
  - UI: present in settings

---

## 11. Server Actions and API Routes

### Server action files

The repository contains a large server action layer under [src/app/actions](src/app/actions), including modules for:
- account management
- affiliates
- AI helpers
- analytics
- authentication and workspace setup
- automation and workflows
- blog and content studio
- builder and deployment
- calendar and booking
- CIPC lookup
- contact and CRM workflows
- finance and invoices
- forms and marketing
- HR and payroll
- LMS and quizzes
- messaging and integrations
- projects and operations
- settings and branding
- social publishing
- tasks and workflows
- workspaces and team operations

### API route files

The repository contains many API routes under [src/app/api](src/app/api), including:
- CRM and contact endpoints
- lead and deal endpoints
- invoice and finance endpoints
- LMS course, module, lesson, quiz, and progress endpoints
- HR employee and payroll endpoints
- automation and workflow endpoints
- support ticket endpoints
- LENA chat and conversation endpoints
- webhook endpoints for Stripe, PayFast, Meta, Twilio, and email events
- settings and integration endpoints
- public form submission endpoints

---

## 12. Database Table Inventory

The Supabase migrations define a very broad schema spanning CRM, education, finance, marketing, automation, HR, communication, content, builder, settings, and platform operations.

### Core tables by domain

- CRM / sales: contacts, crm_contacts, crm_companies, crm_activities, crm_opportunities, opportunities, pipelines, pipeline_stages, lead_capture, lead_notes, lead_watchlists, quotes, proposals, tasks, task_tags, task_assignees
- LMS: courses, course_modules, course_lessons, lessons, quizzes, quiz_questions, quiz_attempts, enrollments, course_progress, lesson_progress, lms_certificates, lms_remedial_assignments, lms_expert_profiles, lms_expert_sessions, lms_session_rsvps
- Finance: invoices, invoice_items, accounting_transactions, journal_entries, chart_of_accounts, expenses, credit_notes, retainers, bank_connections, stripe_customers
- Automation: workflows, workflow_steps, workflow_executions, workflow_execution_logs, automation_executions, automation_logs
- HR / payroll: employees, leave_requests, payroll_runs, payslips, time_entries
- Calendar / booking: appointments, booking_calendars, booking_outcomes, booking_intake_forms, booking_waitlists
- Communications: conversations, messages, support_tickets, platform_connections, notifications, inbox_notifications
- Content and marketing: blog_posts, blog_categories, content_studio_documents, funnels, websites, forms, form_submissions, social_posts
- Settings / integrations: workspaces, workspace_members, workspace_invitations, workspace_branding, workspace_integrations, workspace_api_keys, workspace_webhooks

---

## Feature Map

### CRM
- Contacts management: Fully implemented
- Leads and pipeline management: Fully implemented
- Opportunities and deals: Fully implemented
- Contact notes/tasks/activity feed: Fully implemented
- Tags and segmentation: Fully implemented
- Email/campaign sending to contacts: Partial
- Forms and lead capture: Fully implemented
- Quotes/proposals: Fully implemented

### LMS
- Course creation and management: Fully implemented
- Course modules and lessons: Fully implemented
- Student enrollment: Fully implemented
- Quiz engine and assessments: Fully implemented
- Certificate generation: Fully implemented
- Student progress tracking: Partial
- LMS dashboard for admins: Partial
- Expert profiles and sessions: Partial
- Remedial assignments: Fully implemented
- Cohorts and RSVPs: Backend only

### Accounting
- Invoice creation and management: Fully implemented
- Quote/proposal generation: Fully implemented
- Payment processing: Partial
- Expense tracking: Fully implemented
- Financial reports: Partial
- Credit notes: Backend only
- Retainers: Backend only
- Bank connections: Fully implemented
- Accounting transactions: Fully implemented

### Automation
- Workflow builder: Partial
- Trigger types: Partial
- Action types: Partial
- Workflow execution engine: Partial
- Campaign automation: Partial
- Email sequences: Partial
- SMS automation: Backend only

### HR & Payroll
- Employee management: Fully implemented
- Payroll processing: Fully implemented
- Time tracking: Fully implemented
- Leave management: Fully implemented
- Termination workflows: Partial
- HR notifications: Partial

### Calendar & Booking
- Appointment booking: Fully implemented
- Calendar management: Fully implemented
- Availability rules: Partial
- Round robin assignment: Partial
- Booking pages (public): Fully implemented
- Video/meet integration: Fully implemented

### Communication
- Email builder and sending: Partial
- SMS messaging: Partial
- WhatsApp/Meta integration: Partial
- Chat (LENA AI assistant): Fully implemented
- Support tickets: Fully implemented
- Notifications system: Partial

### Content & Marketing
- Blog management: Fully implemented
- SEO tools: Partial
- Content studio: Fully implemented
- Grammar and plagiarism checker: Partial
- Social media posts: Partial
- Landing page/funnel builder: Fully implemented
- Forms builder: Fully implemented

### Settings & Integrations
- Workspace settings: Fully implemented
- Team management and invitations: Fully implemented
- API key management: Fully implemented
- Third-party integrations: Fully implemented
- Branding and white-label settings: Fully implemented
- Domain configuration: Fully implemented
- Webhook management: Fully implemented

---

## Final Assessment

### Total number of implemented features
- 60+ major feature areas across the main modules

### Most complete modules
1. CRM
2. Content & Marketing
3. Settings & Integrations

### Least complete modules
1. Automation
2. HR & Payroll
3. Calendar & Booking

### Modules present in database migrations but with limited or no UI surface
- Credit notes
- Retainers
- Cohorts and RSVPs
- Some advanced HR and compliance workflow tables
- Advanced accounting and analytics tables

### UI pages that appear to have limited backend/database support
- Demo and template-style pages under the design-system and marketing sample areas
- Utility/placeholder routes such as maintenance, coming soon, and offline pages

---

## Notes for Product Positioning

The codebase is not a single-purpose tool; it is a broad multi-module business platform with significant implementation depth in CRM, LMS, finance, communications, content, and settings. The strongest product story is that it already includes a wide catalog of operational SaaS workflows, even if some modules are still more mature in backend/database structure than in polished UI.
