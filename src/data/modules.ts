import type { LucideIcon } from 'lucide-react';
import {
  Target,
  BookOpen,
  Wallet,
  Zap,
  Users,
  CalendarDays,
  MessageSquare,
  PenSquare,
  CheckCircle2,
  Sparkles,
  Link2,
  ShieldCheck,
  Clock3,
  TrendingUp,
  Award,
  Bell,
  Inbox,
} from 'lucide-react';

export interface ModuleFeatureSection {
  eyebrow: string;
  headline: string;
  paragraph: string;
  bullets: string[];
  visualKey: string;
  imageSide: 'left' | 'right';
}

export interface ModuleClosingStat {
  icon: LucideIcon;
  label: string;
}

export interface ModuleHero {
  eyebrow: string;
  headline: string;
  paragraph: string;
  ctaLabel: string;
  finePrint: string;
  visualKey: string;
}

export interface ModuleContent {
  slug: string;
  label: string;
  /** 1-line description used in the navbar dropdown tile */
  shortDescription: string;
  /** 2-3 sentence description used on the /solutions index card */
  cardDescription: string;
  icon: LucideIcon;
  color: string;
  /** Whether the full landing page for this module has been built yet */
  published: boolean;
  metaTitle: string;
  metaDescription: string;
  /** 1-2 sentences naming the concrete daily friction this module solves */
  problemStatement: string;
  /** 2-3 sentences connecting that friction to the actual built feature set */
  solutionStatement: string;
  hero: ModuleHero;
  sections: ModuleFeatureSection[];
  closingStats: [ModuleClosingStat, ModuleClosingStat, ModuleClosingStat];
}

export const modules: ModuleContent[] = [
  {
    slug: 'crm-sales',
    label: 'CRM & Sales',
    shortDescription: 'One record for every lead, from first message to closed deal.',
    cardDescription:
      "Leads come in through WhatsApp, a form, a referral call — and details get lost between them. LeadsMind keeps every contact, deal, and follow-up in one record, with a drag-and-drop pipeline and PDF proposals built in.",
    icon: Target,
    color: '#1359FF',
    published: true,
    metaTitle: 'CRM & Sales Software for South African SMEs',
    metaDescription:
      'Track every lead from first message to closed deal with full contact profiles, a drag-and-drop pipeline, deal tracking, and PDF proposals — part of the LeadsMind platform.',
    problemStatement:
      "Leads come in through WhatsApp, a form, a referral call — and by the time you follow up, you've forgotten which one said what.",
    solutionStatement:
      "Every contact gets one record with a full activity feed, so the context is never lost between channels. A drag-and-drop pipeline tracks each deal's value, probability, and close date, and new leads from your capture forms or the built-in Lead Finder land straight in it — no retyping from a notebook or a spreadsheet.",
    hero: {
      eyebrow: 'SALES & CRM',
      headline: 'One record for every lead, from first message to closed deal.',
      paragraph:
        "Contacts, pipeline, and proposals live in the same place — so when a lead messages back three weeks later, you already know exactly where things stand.",
      ctaLabel: 'Start Free Trial',
      finePrint: 'No credit card required',
      visualKey: 'crm-hero',
    },
    sections: [
      {
        eyebrow: 'CONTACTS',
        headline: 'Every conversation, attached to the right lead.',
        paragraph:
          "A call here, a WhatsApp message there, a note on a sticky pad — details about a lead used to live in five different places. Every contact now has a full profile with an activity feed, plus notes and tasks attached directly to them, so anyone on the team can pick up exactly where the last conversation left off.",
        bullets: [
          'Full contact profiles with activity feed',
          'Notes and tasks on every contact',
          'Tag-based segmentation with bulk actions',
        ],
        visualKey: 'crm-contacts',
        imageSide: 'right',
      },
      {
        eyebrow: 'PIPELINE',
        headline: 'See exactly where every deal stands.',
        paragraph:
          "Guessing which leads were close to closing meant deals went quiet without anyone noticing. A drag-and-drop pipeline tracks each deal's value, probability, and expected close date, so it's obvious at a glance what needs attention this week and what can wait.",
        bullets: [
          'Drag-and-drop pipeline stages',
          'Deal value, probability, and close date tracking',
          'Lead discovery with conversion tracking',
        ],
        visualKey: 'crm-pipeline',
        imageSide: 'left',
      },
      {
        eyebrow: 'CAPTURE & PROPOSALS',
        headline: 'New leads land in the pipeline on their own.',
        paragraph:
          "Copying leads from a form or a spreadsheet into a CRM by hand is exactly the busywork that gets skipped when the week gets full. Embeddable capture forms — with conditional logic — sync straight into the CRM, and the built-in Lead Finder with map view helps you spot new opportunities nearby. When it's time to close, generate a quote or proposal as a branded PDF without leaving the deal.",
        bullets: [
          'Embeddable lead-capture forms with conditional logic',
          'Lead Finder with map view',
          'Quote and proposal generator with PDF export',
        ],
        visualKey: 'crm-quote',
        imageSide: 'right',
      },
    ],
    closingStats: [
      { icon: CheckCircle2, label: 'Every conversation stays with the lead' },
      { icon: TrendingUp, label: 'Deals tracked from first contact to close' },
      { icon: Clock3, label: 'Proposals out in minutes, not days' },
    ],
  },
  {
    slug: 'lms-courses',
    label: 'LMS & Courses',
    shortDescription: 'Sell a course without a WhatsApp group holding it together.',
    cardDescription:
      'Selling a course usually means a WhatsApp group, a shared drive, and hand-made certificates. LeadsMind gives you a real course builder, checkout-based enrollment, and certificates that generate automatically the moment a student finishes.',
    icon: BookOpen,
    color: '#7B3FF2',
    published: true,
    metaTitle: 'LMS & Online Course Platform for South African Businesses',
    metaDescription:
      'Build and sell courses with a full course builder, checkout-based enrollment, a 10-question-type quiz engine, and automatic certificates — part of the LeadsMind platform.',
    problemStatement:
      'Selling a course means a WhatsApp group, a shared drive of videos, and a certificate you make by hand for every student who finishes.',
    solutionStatement:
      'A full course builder organizes lessons and media into modules, and enrollment — manual or automated through checkout — puts students into a dedicated portal instead of a shared folder. A quiz engine with ten question types tracks every attempt, and a branded certificate generates automatically the moment a student passes — no more building certificates one by one in Canva.',
    hero: {
      eyebrow: 'LEARNING MANAGEMENT',
      headline: 'Sell a course without a WhatsApp group holding it together.',
      paragraph:
        'Students enroll through a real checkout, learn inside a dedicated portal, and get a certificate automatically the moment they pass — no manual admin for every student who finishes.',
      ctaLabel: 'Start Free Trial',
      finePrint: 'No credit card required',
      visualKey: 'lms-hero',
    },
    sections: [
      {
        eyebrow: 'COURSE BUILDER',
        headline: 'Build a course the way students actually learn.',
        paragraph:
          "Stitching together video files, a syllabus doc, and a separate quiz tool never quite worked. The course builder organizes lessons and media into modules in one place, and the quiz engine — with ten question types — tracks every attempt. If a student struggles on a quiz, remedial content gets assigned automatically, so they're not left stuck.",
        bullets: [
          'Full course builder with modules and lessons',
          '10 quiz question types with attempt tracking',
          'Auto-assigned remedial content on quiz performance',
        ],
        visualKey: 'lms-course-builder',
        imageSide: 'right',
      },
      {
        eyebrow: 'ENROLLMENT & CERTIFICATES',
        headline: 'From sign-up to certificate, without your involvement.',
        paragraph:
          "Manually enrolling every student and building their certificate in Canva doesn't scale past a handful of people. Students enroll — manually or automatically through checkout — and land straight in their own portal. The moment they complete a course, a branded certificate generates on its own.",
        bullets: [
          'Manual and automated enrollment with checkout',
          'Dedicated student portal with marketplace',
          'Automatic branded certificate generation',
        ],
        visualKey: 'lms-certificate',
        imageSide: 'left',
      },
      {
        eyebrow: 'DISCOVERY & GROWTH',
        headline: 'Courses that are easy to find and easy to keep running.',
        paragraph:
          "A course nobody can find, and enrollment follow-ups nobody has time to send, both quietly cap how many students you reach. Public course pages are built SEO-ready, so people can find a course from a search, not just a referral. Course-triggered automations can fire off the next step — a welcome message, an unlock — the moment someone enrolls or finishes.",
        bullets: ['SEO-ready public course pages', 'Course-triggered automations on enrollment and completion'],
        visualKey: 'lms-automation',
        imageSide: 'right',
      },
    ],
    closingStats: [
      { icon: CheckCircle2, label: 'Every quiz attempt tracked automatically' },
      { icon: Award, label: 'Certificates issued the moment students finish' },
      { icon: Link2, label: 'One portal, not a WhatsApp group and a shared drive' },
    ],
  },
  {
    slug: 'accounting-finance',
    label: 'Accounting & Finance',
    shortDescription: 'Invoicing and bookkeeping that finally agree with each other.',
    cardDescription:
      'Invoices get made in one tool, expenses tracked in another, and the two rarely match. LeadsMind turns quotes into invoices in one click and reconciles expenses against your bank feed, all posting to a real ledger.',
    icon: Wallet,
    color: '#FF8A00',
    published: true,
    metaTitle: 'Accounting & Invoicing Software for South African SMEs',
    metaDescription:
      'Create professional invoices, convert quotes in one click, track and reconcile expenses, and post to a full transaction ledger — part of the LeadsMind platform.',
    problemStatement:
      "Invoices get made in Word, expenses get tracked in a shoebox of slips, and by month-end nobody's sure what's actually been paid.",
    solutionStatement:
      'Invoices with line items and tax export as branded PDFs, and a quote becomes an invoice in one click. Expenses get categorised and reconciled against your connected bank feed, and everything posts to a full transaction ledger on a standard chart of accounts — so your books stay accurate without hiring a bookkeeper. Payment collection via PayFast and Stripe, and polished financial reports, are still being rolled out.',
    hero: {
      eyebrow: 'ACCOUNTING & FINANCE',
      headline: 'Invoicing and bookkeeping that finally agree with each other.',
      paragraph:
        'Quotes convert to invoices in one click, expenses reconcile against your bank feed, and everything lands in a proper ledger — no separate bookkeeping tool required.',
      ctaLabel: 'Start Free Trial',
      finePrint: 'No credit card required',
      visualKey: 'accounting-hero',
    },
    sections: [
      {
        eyebrow: 'INVOICING',
        headline: 'A quote becomes an invoice in one click.',
        paragraph:
          "Retyping a quote into a separate invoice, then working out the tax by hand, wastes time you don't have. Every invoice includes line items and tax, exports as a branded PDF, and a quote converts to an invoice in a single click — no retyping, no separate tool.",
        bullets: ['Professional invoices with line items, tax, and PDF export', 'One-click quote-to-invoice conversion'],
        visualKey: 'accounting-invoice',
        imageSide: 'right',
      },
      {
        eyebrow: 'EXPENSES',
        headline: 'Know what you spent without a shoebox of slips.',
        paragraph:
          "A shoebox of receipts and a bank statement that doesn't match your spreadsheet is how most small businesses track expenses — until it isn't accurate anymore. Expenses get tracked and categorised, and a connected bank feed reconciles against them automatically, so what you spent and what the bank shows finally agree.",
        bullets: ['Expense tracking and categorisation', 'Bank connection and automatic reconciliation'],
        visualKey: 'accounting-reports',
        imageSide: 'left',
      },
      {
        eyebrow: 'THE LEDGER',
        headline: "Real bookkeeping, not just a spreadsheet with formulas.",
        paragraph:
          "A spreadsheet with formulas isn't the same as an actual set of books — and it shows the moment an accountant or a bank asks for one. Every transaction posts to a full ledger with journal entries on a standard chart of accounts, so the numbers behind your invoices and expenses are structured properly from day one. Payment collection through PayFast and Stripe, and polished financial reports, are still being rolled out.",
        bullets: ['Full transaction ledger with journal entries', 'Standard chart of accounts'],
        visualKey: 'accounting-ledger',
        imageSide: 'right',
      },
    ],
    closingStats: [
      { icon: CheckCircle2, label: 'Quotes and invoices in one click, not two tools' },
      { icon: ShieldCheck, label: 'Expenses reconciled against your real bank feed' },
      { icon: TrendingUp, label: 'A proper ledger behind every number' },
    ],
  },
  {
    slug: 'automation',
    label: 'Automation & Workflows',
    shortDescription: 'The busywork you keep meaning to automate, running in the background.',
    cardDescription:
      "A form gets submitted or a course gets finished, and someone still has to follow up by hand. LeadsMind's visual workflow builder connects those moments to an email, a WhatsApp message, or a task — no code required.",
    icon: Zap,
    color: '#00B2FF',
    published: true,
    metaTitle: 'Workflow Automation for South African Businesses',
    metaDescription:
      'Build no-code workflows that trigger on a form submission or course completion, and take action — send an email, a WhatsApp message, or create a task — with LeadsMind.',
    problemStatement:
      "A form gets submitted, a student finishes a course, and someone still has to remember to follow up manually — because nothing's actually watching for it.",
    solutionStatement:
      "A visual workflow builder lets you connect real triggers — a form submission, a course completion — to actions like sending an email, a WhatsApp message, or creating a task, without writing code. It's one of the fastest-growing parts of the platform: today's workflows run with a full execution history, and new triggers, actions, and templates are shipping regularly.",
    hero: {
      eyebrow: 'WORKFLOWS',
      headline: 'The busywork you keep meaning to automate, running in the background.',
      paragraph:
        "Build a workflow visually and connect it to a real trigger — a form submission, a finished course — no code required. It's actively expanding, with new capability shipping often.",
      ctaLabel: 'Start Free Trial',
      finePrint: 'No credit card required',
      visualKey: 'automation-hero',
    },
    sections: [
      {
        eyebrow: 'WORKFLOW BUILDER',
        headline: 'Build a workflow by connecting boxes, not writing code.',
        paragraph:
          "Automations that require a developer never get built at a small business. The workflow builder is entirely visual — connect a trigger to an action on a canvas — and every run gets logged, so you can see exactly what fired and when, not just hope it worked.",
        bullets: ['Visual, node-based workflow builder', 'Full execution history for every run'],
        visualKey: 'automation-builder',
        imageSide: 'right',
      },
      {
        eyebrow: 'TRIGGERS',
        headline: 'Start a workflow the moment something actually happens.',
        paragraph:
          "Right now, a workflow can kick off from two real moments in your business: a form submission or a student finishing a course. It's a focused starting point — more trigger types are actively being added as the automation engine grows.",
        bullets: ['Form-submission triggers', 'Course-completion triggers'],
        visualKey: 'automation-triggers',
        imageSide: 'left',
      },
      {
        eyebrow: 'ACTIONS',
        headline: 'Then let the workflow do the follow-up.',
        paragraph:
          'Once a workflow fires, it can send an email, send a WhatsApp message, or create a task for someone on your team — the actions built so far, with more on the way as this part of the platform matures.',
        bullets: ['Email and WhatsApp message actions', 'Automatic task creation'],
        visualKey: 'automation-actions',
        imageSide: 'right',
      },
    ],
    closingStats: [
      { icon: Zap, label: 'Workflows connect real triggers to real actions' },
      { icon: CheckCircle2, label: 'No code required to build one' },
      { icon: TrendingUp, label: 'New triggers and actions shipping regularly' },
    ],
  },
  {
    slug: 'hr-payroll',
    label: 'HR & Payroll',
    shortDescription: 'Payroll day, without the spreadsheet fire drill.',
    cardDescription:
      'Employee records in a folder, leave tracked in email, payroll calculated by hand — that\'s how one missed request becomes an awkward conversation. LeadsMind keeps records, attendance, leave, and payroll together in one place.',
    icon: Users,
    color: '#FF3CAC',
    published: true,
    metaTitle: 'HR & Payroll Software for South African Teams',
    metaDescription:
      'Manage employee records, clock-in/out time tracking, leave requests, scheduling, and payroll runs with automatic payslips — part of the LeadsMind platform.',
    problemStatement:
      'Payroll month-end turns into a spreadsheet fire drill, and one missed leave request turns into an awkward conversation.',
    solutionStatement:
      "Every employee has one record with documents, leave balances, and attendance in it, so nothing depends on a spreadsheet only one person understands. Clock-in/out tracks hours and overtime automatically, leave requests get approved in the same place employees check their balance, and payroll runs generate payslips employees can view themselves — no manual calculations at month-end.",
    hero: {
      eyebrow: 'PEOPLE OPERATIONS',
      headline: 'Payroll day, without the spreadsheet fire drill.',
      paragraph:
        "Employee records, attendance, leave, and payroll all live in one place — so running payroll is a few clicks, not a week of chasing timesheets.",
      ctaLabel: 'Start Free Trial',
      finePrint: 'No credit card required',
      visualKey: 'hr-hero',
    },
    sections: [
      {
        eyebrow: 'EMPLOYEE RECORDS',
        headline: 'One record per employee, documents included.',
        paragraph:
          "A folder of contracts on someone's laptop isn't a record system — it's a risk. Every employee gets a full directory profile with documents attached, so HR paperwork is in one place instead of scattered across email threads and personal drives.",
        bullets: ['Full employee directory with documents', 'Formal warning issuance tracking'],
        visualKey: 'hr-people',
        imageSide: 'right',
      },
      {
        eyebrow: 'TIME & LEAVE',
        headline: 'Hours, overtime, and leave — tracked, not guessed.',
        paragraph:
          "Guessing at hours worked and chasing leave forms by email is how overtime gets miscalculated and leave balances get disputed. Clock-in/out tracks hours and overtime automatically, daily attendance is logged as it happens, and leave requests get submitted, approved, and balanced in the same place employees check.",
        bullets: [
          'Clock-in/out time tracking with overtime',
          'Daily attendance tracking',
          'Leave request, approval, and balance tracking',
        ],
        visualKey: 'hr-time',
        imageSide: 'left',
      },
      {
        eyebrow: 'SCHEDULING & PAYROLL',
        headline: 'Shifts planned and payslips generated, without the spreadsheet.',
        paragraph:
          "Building a shift roster in one spreadsheet and running payroll in another is where mistakes creep in. Employee scheduling and shift management plans who's working when, and payroll runs generate payslips automatically — with employees able to view their own payslip instead of asking HR to resend it.",
        bullets: [
          'Employee scheduling and shift management',
          'Payroll runs with automatic payslip generation',
          'Employee-facing payslip view',
        ],
        visualKey: 'hr-payroll',
        imageSide: 'right',
      },
    ],
    closingStats: [
      { icon: Clock3, label: 'Hours and overtime tracked automatically' },
      { icon: CheckCircle2, label: 'Leave approvals without an email thread' },
      { icon: ShieldCheck, label: 'Payslips generated, not calculated by hand' },
    ],
  },
  {
    slug: 'calendar-booking',
    label: 'Calendar & Booking',
    shortDescription: "A booking page that ends the 'what time works for you?' back-and-forth.",
    cardDescription:
      'Coordinating a meeting time over WhatsApp costs you messages you don\'t have time for. LeadsMind gives every team member a branded booking page, one-click video calls, and a waitlist that fills its own gaps.',
    icon: CalendarDays,
    color: '#14B8A6',
    published: true,
    metaTitle: 'Calendar & Booking Software for South African Businesses',
    metaDescription:
      'Let clients book time on a branded page with automatic reminders, join meetings with one-click video calling, and fill cancellations from a waitlist — part of the LeadsMind platform.',
    problemStatement:
      "Booking a client call still means five WhatsApp messages back and forth about what time works — and then a separate Zoom link to dig up.",
    solutionStatement:
      'Every team member gets a branded, shareable booking page where clients pick a slot themselves, with automatic confirmations and reminders. Meetings start with one click over built-in video calling, with recording, and a waitlist automatically fills any slot that opens up. Calendar sync with Google and Outlook is still being rolled out, so bookings are managed inside LeadsMind today rather than pulled automatically from your existing calendar.',
    hero: {
      eyebrow: 'SCHEDULING',
      headline: "A booking page that ends the 'what time works for you?' back-and-forth.",
      paragraph:
        'Clients pick a slot on your branded booking page, get automatic reminders, and join the call with one click — no separate scheduling app, no hunting for a Zoom link.',
      ctaLabel: 'Start Free Trial',
      finePrint: 'No credit card required',
      visualKey: 'calendar-hero',
    },
    sections: [
      {
        eyebrow: 'BOOKING PAGES',
        headline: 'A branded page clients use to book themselves.',
        paragraph:
          "Coordinating a meeting time over WhatsApp or email means at least three messages before anything's confirmed. A shareable, branded booking page lets clients pick a slot themselves, with confirmation and reminders handled automatically, and a custom intake form collects what you need to know before the call even happens.",
        bullets: [
          'Shareable, branded public booking pages',
          'Automatic confirmations and reminders',
          'Custom intake question forms',
        ],
        visualKey: 'calendar-booking',
        imageSide: 'right',
      },
      {
        eyebrow: 'MEETINGS',
        headline: 'The call starts with one click — no separate link to find.',
        paragraph:
          'Digging up a Zoom link, or juggling separate calendars for separate parts of the business, adds friction to something that should be simple. Meetings launch with one click over built-in video calling, with recording, and multi-calendar management keeps different calendars organised in the same place.',
        bullets: ['One-click instant video meetings with recording', 'Multi-calendar management'],
        visualKey: 'calendar-meetings',
        imageSide: 'left',
      },
      {
        eyebrow: 'FEWER GAPS, FEWER NO-SHOWS',
        headline: 'A full calendar, and a plan for the slots that open up.',
        paragraph:
          "A cancelled slot that sits empty, or a fully-booked week with no way to know it, both cost you business. Booking analytics show real demand, and a waitlist automatically promotes the next person in line the moment a spot opens.",
        bullets: ['Booking analytics', 'Waitlist with automatic promotion'],
        visualKey: 'calendar-reminders',
        imageSide: 'right',
      },
    ],
    closingStats: [
      { icon: CalendarDays, label: 'Bookings without the back-and-forth' },
      { icon: Bell, label: 'Automatic confirmations and reminders' },
      { icon: TrendingUp, label: 'Empty slots refill from the waitlist automatically' },
    ],
  },
  {
    slug: 'communication',
    label: 'Communication & Support',
    shortDescription: 'One inbox for support, instead of three separate places to check.',
    cardDescription:
      'A support question on email, a ticket on your site, and no single view of either — that\'s how the same question gets answered twice. LeadsMind brings tickets and email into one inbox, with LENA helping your team respond faster.',
    icon: MessageSquare,
    color: '#1359FF',
    published: true,
    metaTitle: 'Customer Support & Communication Software',
    metaDescription:
      'A support ticket system, embeddable widget, unified inbox, and LENA AI assistant to help your team respond faster — part of the LeadsMind platform.',
    problemStatement:
      "A customer messages on WhatsApp, emails a different question, and submits a support form — and three different people end up trying to answer the same thing.",
    solutionStatement:
      "A support ticket system with a public thread keeps every conversation in one place, backed by an embeddable widget so customers can reach you straight from your site. LENA, LeadsMind's AI assistant, helps your team draft and prioritize responses, and tickets and email meet in one unified inbox. WhatsApp and SMS support are being rolled into that same inbox as they're built out.",
    hero: {
      eyebrow: 'SUPPORT',
      headline: 'One inbox for support, instead of three separate places to check.',
      paragraph:
        'Tickets, your support widget, and email meet in one inbox, with LENA helping your team respond faster — WhatsApp and SMS are joining that same inbox as we roll them out.',
      ctaLabel: 'Start Free Trial',
      finePrint: 'No credit card required',
      visualKey: 'communication-hero',
    },
    sections: [
      {
        eyebrow: 'SUPPORT TICKETS',
        headline: "Every support question, in a thread that doesn't disappear.",
        paragraph:
          "Customer questions that arrive by email get lost between inboxes, with no record of who answered what. A full support ticket system keeps a public thread with agent replies on every question, and an embeddable widget lets customers open a ticket straight from your site instead of hunting for an email address.",
        bullets: ['Support ticket system with public thread and agent reply', 'Embeddable support widget'],
        visualKey: 'communication-tickets',
        imageSide: 'right',
      },
      {
        eyebrow: 'LENA AI ASSISTANT',
        headline: 'An assistant that helps your team answer faster.',
        paragraph:
          "Answering the same question for the twentieth time is where support teams burn out. LENA, LeadsMind's AI assistant, helps draft and prioritise responses, and its personality and knowledge base are configurable, so answers sound like your business, not a generic bot.",
        bullets: ['LENA AI assistant for customer support', 'Configurable LENA personality and knowledge base'],
        visualKey: 'communication-lena',
        imageSide: 'left',
      },
      {
        eyebrow: 'UNIFIED INBOX',
        headline: 'Email and tickets, meeting in one inbox.',
        paragraph:
          "Checking a separate inbox for every channel means something always gets missed. Email compose and reply sit alongside your support tickets in one unified inbox — with WhatsApp and SMS support being rolled into that same inbox as those integrations are completed.",
        bullets: ['Unified conversation inbox across channels', 'Email compose and read interface'],
        visualKey: 'communication-inbox',
        imageSide: 'right',
      },
    ],
    closingStats: [
      { icon: Inbox, label: 'Tickets and email in one place' },
      { icon: Sparkles, label: 'LENA helps your team reply faster' },
      { icon: CheckCircle2, label: 'Every conversation kept in its thread' },
    ],
  },
  {
    slug: 'content-marketing',
    label: 'Content & Marketing',
    shortDescription: 'Write it, publish it, and see what actually converts.',
    cardDescription:
      "A blog in one tool, a landing page in another, and no clear view of which one brought in the lead. LeadsMind's content studio, blog, landing pages, and funnels live in one place, each with its own analytics.",
    icon: PenSquare,
    color: '#7B3FF2',
    published: true,
    metaTitle: 'Content & Marketing Tools for South African Businesses',
    metaDescription:
      'Draft with AI assistance, publish a blog with built-in SEO, build landing pages and funnels, and capture leads with embeddable forms — part of the LeadsMind platform.',
    problemStatement:
      "A blog post lives in one tool, the landing page in another, and nobody's quite sure which one actually brought in the lead.",
    solutionStatement:
      'A content studio with AI writing assistance helps you draft faster, and a full blog CMS handles categories, comments, and analytics with per-post SEO settings and automatic sitemap generation. A drag-and-drop landing page editor and a multi-step funnel builder — both with their own analytics — sit next to embeddable forms, so a campaign\'s pages, forms, and results live in one place.',
    hero: {
      eyebrow: 'MARKETING',
      headline: 'Write it, publish it, and see what actually converts — without leaving the platform.',
      paragraph:
        "A content studio, blog, landing pages, and funnels live in one place, each with its own analytics, so a campaign isn't scattered across three logins.",
      ctaLabel: 'Start Free Trial',
      finePrint: 'No credit card required',
      visualKey: 'content-hero',
    },
    sections: [
      {
        eyebrow: 'CONTENT STUDIO',
        headline: 'Draft faster, then publish without switching tools.',
        paragraph:
          "Writing in one app and publishing in another means formatting breaks and drafts get lost in translation. A long-form content studio with AI writing assistance helps you draft faster, and a full blog CMS handles categories, comments, and analytics — with per-post SEO settings and an automatic sitemap, so search engines can find what you publish.",
        bullets: [
          'Content studio with AI writing assistance',
          'Full blog CMS with categories, comments, and analytics',
          'Per-post SEO settings with sitemap generation',
        ],
        visualKey: 'content-calendar',
        imageSide: 'right',
      },
      {
        eyebrow: 'PAGES & FUNNELS',
        headline: 'Build the page a campaign actually needs.',
        paragraph:
          'A campaign idea often dies waiting on a developer to build the landing page. A drag-and-drop landing page editor and a full website page editor let you publish pages yourself, and a multi-step funnel builder — with its own analytics — turns a page into a sequence that actually moves someone toward a decision.',
        bullets: [
          'Drag-and-drop landing page editor',
          'Full website page editor and publisher',
          'Multi-step funnel builder with analytics',
        ],
        visualKey: 'content-pages',
        imageSide: 'left',
      },
      {
        eyebrow: 'LEAD CAPTURE',
        headline: 'Every page can collect a lead, not just describe one.',
        paragraph:
          "A beautiful page that doesn't capture anyone's details is a missed opportunity. Embeddable forms drop into any page or post, so the content that brought someone in is also what captures them.",
        bullets: ['Embeddable forms builder'],
        visualKey: 'content-campaign',
        imageSide: 'right',
      },
    ],
    closingStats: [
      { icon: CheckCircle2, label: 'Blog, pages, and funnels in one place' },
      { icon: Sparkles, label: 'AI-assisted drafting in the content studio' },
      { icon: Link2, label: 'Every page ready to capture a lead' },
    ],
  },
];

export function getModule(slug: string): ModuleContent | undefined {
  return modules.find((m) => m.slug === slug);
}

export function getPublishedModule(slug: string): ModuleContent | undefined {
  const mod = getModule(slug);
  return mod?.published ? mod : undefined;
}
