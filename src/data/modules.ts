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
  Receipt,
  Globe,
  Mail,
  Phone,
  Sparkles,
} from 'lucide-react';

export interface ModulePainPoint {
  kicker: string;
  body: string;
}

export interface ModuleFeatureGroup {
  title: string;
  items: string[];
}

export interface ModuleHero {
  eyebrow: string;
  headline: string;
  paragraph: string;
  /** 4 short pill labels shown under the paragraph */
  capabilityTags: [string, string, string, string];
  ctaLabel: string;
  finePrint: string;
  visualKey: string;
}

export interface ModulePain {
  eyebrow: string;
  headline: string;
  points: [ModulePainPoint, ModulePainPoint, ModulePainPoint];
}

export interface ModuleFeatures {
  eyebrow: string;
  headline: string;
  groups: ModuleFeatureGroup[];
}

export interface ModuleConnective {
  eyebrow: string;
  headline: string;
  paragraph: string;
}

export interface ModuleFinalCta {
  headline: string;
  subtext: string;
  gradientFrom: string;
  gradientTo: string;
}

export interface ModuleInsideItem {
  title: string;
  description: string;
}

/**
 * Simplified Hero -> Problem -> What's Inside -> Why LeadsMind -> CTA copy
 * shape, used by the Solutions module pages that have been migrated to the
 * verbatim-copy pattern. Optional so unmigrated modules keep rendering the
 * older `pain` / `featureGroups` / `connective` shape.
 */
export interface ModuleContentV2 {
  problem: string;
  insideEyebrow: string;
  insideItems: ModuleInsideItem[];
  whyEyebrow: string;
  whyText: string;
  ctaText: string;
  ctaPrimaryLabel: string;
  ctaSecondaryLabel: string;
  ctaSecondaryHref: string;
}

interface ModuleContentBase {
  slug: string;
  label: string;
  /** 1-line description used in the navbar dropdown tile */
  shortDescription: string;
  /** 2-3 sentence description used on the /solutions index card */
  cardDescription: string;
  icon: LucideIcon;
  color: string;
  /** true = one of the 9 modules shown in the dropdown and the primary Features grid */
  primary: boolean;
  /** Whether the full landing page for this module has been built yet */
  published: boolean;
  metaTitle: string;
  metaDescription: string;
  hero: ModuleHero;
}

/** Legacy content shape: pain-point cards, grouped feature checklists, a connective callout. */
export interface ModuleContentLegacy extends ModuleContentBase {
  pain: ModulePain;
  featureGroups: ModuleFeatures;
  connective: ModuleConnective;
  finalCta: ModuleFinalCta;
}

/** Verbatim-copy shape: Hero -> Problem -> What's Inside -> Why LeadsMind -> CTA. */
export interface ModuleContentModern extends ModuleContentBase {
  content: ModuleContentV2;
}

export type ModuleContent = ModuleContentLegacy | ModuleContentModern;

export const modules: ModuleContent[] = [
  {
    slug: 'crm-sales',
    label: 'CRM & Sales',
    shortDescription: 'Pipeline, AI lead scoring, and a built-in Lead Finder.',
    cardDescription:
      "Leads come in through WhatsApp, a form, a referral call — and details get lost between them. LeadsMind keeps every contact, deal, and follow-up in one record, with a drag-and-drop pipeline, AI lead scoring, and a built-in Lead Finder.",
    icon: Target,
    color: '#1359FF',
    primary: true,
    published: true,
    metaTitle: 'CRM Software for African Businesses | LeadsMind',
    metaDescription:
      'Track every lead, deal, and follow-up in one pipeline — with AI lead scoring and a built-in Lead Finder. Built for African business, priced fairly.',
    hero: {
      eyebrow: 'CRM & SALES PIPELINE',
      headline: 'Your pipeline, out of your head and onto one screen',
      paragraph:
        'Track every contact, every deal, and every follow-up in one place — with AI that tells you which leads to chase first.',
      capabilityTags: ['Pipeline', 'Lead Finder', 'AI Scoring', 'Forecasting'],
      ctaLabel: 'Start Free',
      finePrint: 'No credit card required',
      visualKey: 'crm-hero',
    },
    content: {
      problem:
        "Most African business owners run their pipeline from memory, a notebook, or a spreadsheet nobody updates. Deals get forgotten. Follow-ups slip. And by the time you remember a lead, they've already gone with someone who called back sooner.",
      insideEyebrow: "WHAT'S INSIDE",
      insideItems: [
        {
          title: 'Visual pipeline',
          description: 'Drag deals through stages, see your whole sales process at a glance',
        },
        {
          title: 'AI lead scoring',
          description: 'Know which leads are actually worth your time, automatically ranked',
        },
        {
          title: 'Lead Finder',
          description:
            'Search by location and industry, add new prospects to your CRM in one click, no outbound agency needed',
        },
        {
          title: 'Task management',
          description: 'Every follow-up assigned, tracked, and never lost in your inbox',
        },
        {
          title: 'Sales forecasting',
          description: "See projected revenue before the month ends, not after",
        },
      ],
      whyEyebrow: 'WHY LEADSMIND',
      whyText:
        "Because your CRM shares one data layer with your invoicing and accounting — update a contact once, and it updates everywhere. No exporting a spreadsheet to \"sync\" with your accounting software. It just is your accounting software too.",
      ctaText: 'Start finding and closing more deals — free, no credit card needed.',
      ctaPrimaryLabel: 'Start Free',
      ctaSecondaryLabel: 'See CRM in Action',
      ctaSecondaryHref: '/#demo',
    },
  },
  {
    slug: 'lms-courses',
    label: 'LMS & Courses',
    shortDescription: 'Course builder, certificates, cohorts, and AI quizzes.',
    cardDescription:
      'Selling a course usually means a WhatsApp group, a shared drive, and hand-made certificates. LeadsMind gives you a full course builder, structured cohorts, SCORM support, and certificates that generate automatically the moment a student finishes.',
    icon: BookOpen,
    color: '#7B3FF2',
    primary: true,
    published: true,
    metaTitle: 'Course & LMS Software for African Creators | LeadsMind',
    metaDescription:
      'Build courses, issue certificates, and track student progress — with AI-generated quizzes and drip content. Built for creators across Africa.',
    hero: {
      eyebrow: 'ONLINE COURSES',
      headline: 'Run your course business without duct-taping five tools together',
      paragraph:
        'Build the course, issue the certificate, track the student, chase the payment — all from one platform.',
      capabilityTags: ['Course Builder', 'Certificates', 'Cohorts', 'AI Quizzes'],
      ctaLabel: 'Start Free',
      finePrint: 'No credit card required',
      visualKey: 'lms-hero',
    },
    content: {
      problem:
        'Course creators typically stitch together a course host, a CRM, an email tool, and a payment processor — each billed separately, often in US dollars, and none of them talking to each other.',
      insideEyebrow: "WHAT'S INSIDE",
      insideItems: [
        {
          title: 'Course builder',
          description: 'Drag-and-drop lessons, modules, and drip-fed content',
        },
        {
          title: 'Certificates',
          description: 'Auto-issued on course completion, branded to you',
        },
        {
          title: 'SCORM support',
          description: 'For creators building compliance or corporate training content',
        },
        {
          title: 'Cohorts',
          description: 'Run structured, date-based groups instead of one-size-fits-all self-paced courses',
        },
        {
          title: 'Student analytics',
          description: "See who's engaged, who's stuck, and who's about to drop off",
        },
        {
          title: 'AI quiz generator',
          description: 'Turn your course content into graded quizzes in minutes, not hours',
        },
      ],
      whyEyebrow: 'WHY LEADSMIND',
      whyText:
        'Because the same platform that hosts your course also invoices your students, emails them reminders, and tracks them as CRM contacts. One dashboard for the whole course business — not four different logins with four different bills.',
      ctaText: 'Build your first course free — no separate CRM or invoicing tool required.',
      ctaPrimaryLabel: 'Start Free',
      ctaSecondaryLabel: 'See the Course Builder',
      ctaSecondaryHref: '/#demo',
    },
  },
  {
    slug: 'accounting-finance',
    label: 'Accounting & Finance',
    shortDescription: 'Tax filing support, payroll, and bank reconciliation — built in.',
    cardDescription:
      'Invoices get made in one tool, expenses tracked in another, and the two rarely match. LeadsMind handles compliance-minded tax filing support, statutory payroll, and bank reconciliation with the banks you already use — all posting to a real ledger.',
    icon: Wallet,
    color: '#FF8A00',
    primary: true,
    published: true,
    metaTitle: 'Compliant Accounting Software for African SMEs | LeadsMind',
    metaDescription:
      'Tax filings, payroll, and bank reconciliation — built to understand African business, not adapted from a foreign system.',
    hero: {
      eyebrow: 'ACCOUNTING & PAYROLL',
      headline: 'Accounting that actually understands your business',
      paragraph:
        'Tax filings, payroll, and bank reconciliation — handled inside the same platform as your CRM, not bolted on from a foreign tax system.',
      capabilityTags: ['Tax Filing Support', 'Payroll', 'Bank Reconciliation', 'AI Wizard'],
      ctaLabel: 'Start Free',
      finePrint: 'No credit card required',
      visualKey: 'accounting-hero',
    },
    content: {
      problem:
        "Most accounting software wasn't built with African business in mind — it was adapted for it, if that. That gap shows up as missed deadlines, awkward workarounds, and a bookkeeper doing manually what software should handle automatically.",
      insideEyebrow: "WHAT'S INSIDE",
      insideItems: [
        {
          title: 'General ledger',
          description: 'A real, complete view of your finances, not just invoices',
        },
        {
          title: 'Bank reconciliation',
          description: 'Connected directly to major local banks',
        },
        {
          title: 'Tax filing support',
          description:
            "Prepared and export-ready, built around real local tax requirements (currently deepest for South Africa's VAT201, IRP6, and EMP201, expanding market by market)",
        },
        {
          title: 'Payroll',
          description: 'Statutory deductions handled correctly, every pay cycle',
        },
        {
          title: 'AI accountant wizard',
          description: "A guided, step-by-step setup so you're not staring at a blank chart of accounts",
        },
      ],
      whyEyebrow: 'WHY LEADSMIND',
      whyText:
        "Because your accounting and your CRM share the same contact and invoice records — no re-entering a client's details in two different systems, and no guessing whether your books match your pipeline.",
      ctaText: 'Try compliance-ready accounting free — see your first reconciliation in minutes.',
      ctaPrimaryLabel: 'Start Free',
      ctaSecondaryLabel: 'Talk to Sales',
      ctaSecondaryHref: '/#demo',
    },
  },
  {
    slug: 'invoicing',
    label: 'Invoicing',
    shortDescription: 'Recurring billing, payment links, automated reminders.',
    cardDescription:
      "Invoices go out, then nothing happens until you make an awkward call. LeadsMind sends professional invoices with local payment gateways, Stripe, and EFT payment links built in, plus a 6-step reminder sequence that chases overdue payments for you.",
    icon: Receipt,
    color: '#34B53A',
    primary: true,
    published: true,
    metaTitle: 'Invoicing Software with Automated Reminders | LeadsMind',
    metaDescription:
      'Professional invoices, recurring billing, and a 6-step automated reminder sequence — so overdue payments get collected without the awkward call.',
    hero: {
      eyebrow: 'INVOICING',
      headline: 'Invoices that chase themselves',
      paragraph:
        'Send a professional invoice, accept the payment methods your customers actually use, and let automated reminders handle the follow-up — no awkward "just checking in" messages required.',
      capabilityTags: ['Recurring Billing', 'Local Payment Methods', 'EFT', 'Auto Reminders'],
      ctaLabel: 'Start Free',
      finePrint: 'No credit card required',
      visualKey: 'invoicing-hero',
    },
    content: {
      problem:
        "Nobody enjoys messaging a client to ask for money they already owe. So most business owners just… don't — and that unpaid invoice quietly sits there, sometimes for months.",
      insideEyebrow: "WHAT'S INSIDE",
      insideItems: [
        {
          title: 'Branded, professional invoices',
          description: 'Look like the business you actually are',
        },
        {
          title: 'Recurring billing',
          description: 'For retainers, subscriptions, and repeat clients',
        },
        {
          title: 'Payment plans',
          description: 'Split larger invoices without manual tracking',
        },
        {
          title: 'Local payment gateways and EFT',
          description: 'Payment links built into every invoice',
        },
        {
          title: '6-step automated reminders',
          description: 'SMS, WhatsApp, and email, sent on schedule, not on your memory',
        },
      ],
      whyEyebrow: 'WHY LEADSMIND',
      whyText:
        'Because an invoice created here updates your CRM, your accounting, and your cash flow forecast at the same time — one entry, everywhere it needs to appear.',
      ctaText: 'Send your first invoice free — and never chase a payment manually again.',
      ctaPrimaryLabel: 'Start Free',
      ctaSecondaryLabel: 'See Invoicing in Action',
      ctaSecondaryHref: '/#demo',
    },
  },
  {
    slug: 'phone-ivr',
    label: 'Phone & IVR',
    shortDescription: 'Business numbers, call menus, click-to-call.',
    cardDescription:
      "A missed call is a missed customer, and a personal cellphone number doesn't look like a real business. LeadsMind gives you a business number, a visual IVR menu builder, and click-to-call from any CRM contact — billed transparently through your own Twilio account.",
    icon: Phone,
    color: '#06B6D4',
    primary: true,
    published: true,
    metaTitle: 'Business Phone System & IVR for African SMEs | LeadsMind',
    metaDescription:
      'A real business number, call menus, and click-to-call — without a separate phone system or a hardware contract.',
    hero: {
      eyebrow: 'PHONE & IVR',
      headline: 'Sound like a real business, from your first call',
      paragraph:
        'A business number, a call menu, and click-to-call — built into the same platform as your CRM, so every call logs against the right contact.',
      capabilityTags: ['Number Search', 'IVR Builder', 'AI Voice', 'Click-to-Call'],
      ctaLabel: 'Start Free',
      finePrint: 'No credit card required',
      visualKey: 'phone-ivr-hero',
    },
    content: {
      problem:
        'A personal cellphone number doesn\'t say "established business" — and juggling a separate phone system means yet another login, yet another bill, and call records that never make it into your CRM.',
      insideEyebrow: "WHAT'S INSIDE",
      insideItems: [
        {
          title: 'Dedicated business numbers',
          description: 'Local, professional, not your personal cell',
        },
        {
          title: 'Call menus (IVR)',
          description: 'Route callers to the right person or department automatically',
        },
        {
          title: 'Click-to-call',
          description: 'Call a contact directly from their CRM record, no dialling required',
        },
        {
          title: 'Call logging',
          description: 'Every call attached to the contact automatically, so nothing gets lost',
        },
      ],
      whyEyebrow: 'WHY LEADSMIND',
      whyText:
        'Because every call is logged against the same contact record your CRM, invoicing, and support tickets already use — your team sees the full history, not just the last conversation.',
      ctaText: 'Set up your business number free — no hardware, no contract.',
      ctaPrimaryLabel: 'Start Free',
      ctaSecondaryLabel: 'See Phone & IVR',
      ctaSecondaryHref: '/#demo',
    },
  },
  {
    slug: 'sales-funnels-website',
    label: 'Sales Funnels & Website Builder',
    shortDescription: 'Landing pages, funnels, and a full website builder.',
    cardDescription:
      "A campaign idea often dies waiting on a developer to build the landing page. LeadsMind's drag-and-drop editor builds landing pages, full websites, and complete sales funnels from a professional template library, published in minutes.",
    icon: Globe,
    color: '#00B2FF',
    primary: true,
    published: true,
    metaTitle: 'Website & Funnel Builder for African Businesses | LeadsMind',
    metaDescription:
      'Drag-and-drop landing pages, funnels, and a full website builder — mobile-responsive, SEO-ready, with checkout built in.',
    hero: {
      eyebrow: 'SALES FUNNELS & WEBSITE BUILDER',
      headline: 'A website and checkout page, no developer required',
      paragraph:
        'Build landing pages, funnels, and a full website — mobile-responsive and SEO-ready — without waiting on a developer or a design agency.',
      capabilityTags: ['Landing Pages', 'Funnels', 'Blog', 'Custom Domains'],
      ctaLabel: 'Start Free',
      finePrint: 'No credit card required',
      visualKey: 'funnels-hero',
    },
    content: {
      problem:
        'Every small change to a website usually means a message to a developer, a wait, and an invoice. For most business owners across Africa, that turns "update the homepage" into a multi-week project.',
      insideEyebrow: "WHAT'S INSIDE",
      insideItems: [
        {
          title: 'Drag-and-drop builder',
          description: 'Build and edit pages yourself, no code',
        },
        {
          title: 'Mobile-responsive by default',
          description: 'Every page works on the phone your customers are actually using',
        },
        {
          title: 'SEO tools built in',
          description: 'So your pages are found, not just built',
        },
        {
          title: 'A/B testing',
          description: 'Know which version of a page actually converts',
        },
        {
          title: 'Checkout pages',
          description: 'Sell directly from the funnel, connected to your invoicing and accounting',
        },
      ],
      whyEyebrow: 'WHY LEADSMIND',
      whyText:
        'Because a lead who fills in a form on your funnel becomes a CRM contact instantly — no separate integration, no lead falling through a gap between your website tool and your CRM.',
      ctaText: 'Build your first page free — live in minutes, not weeks.',
      ctaPrimaryLabel: 'Start Free',
      ctaSecondaryLabel: 'See the Builder',
      ctaSecondaryHref: '/#demo',
    },
  },
  {
    slug: 'email-whatsapp-marketing',
    label: 'Email & WhatsApp Marketing',
    shortDescription: 'Campaigns, sequences, and WhatsApp — one inbox.',
    cardDescription:
      "A client messages on WhatsApp, opens an email, and gets no reply that sounds like the same business. LeadsMind runs email campaigns and automated sequences alongside WhatsApp, SMS, and social — with every channel's history in one thread.",
    icon: Mail,
    color: '#FF3CAC',
    primary: true,
    published: true,
    metaTitle: 'Email & WhatsApp Marketing Software for African Businesses | LeadsMind',
    metaDescription:
      '37+ email templates, automated sequences, and WhatsApp — all from one inbox. Built for how African customers actually communicate.',
    hero: {
      eyebrow: 'EMAIL & WHATSAPP MARKETING',
      headline: 'Email and WhatsApp, finally in one inbox',
      paragraph:
        'Run campaigns and sequences across email and WhatsApp — the way your customers actually message you — from a single, compliance-minded platform.',
      capabilityTags: ['Campaigns', 'Sequences', 'Segmentation', 'WhatsApp'],
      ctaLabel: 'Start Free',
      finePrint: 'No credit card required',
      visualKey: 'email-whatsapp-hero',
    },
    content: {
      problem:
        "For most customers across Africa, WhatsApp isn't a nice-to-have channel — it's the main one. Most marketing platforms treat it as an afterthought, if they support it at all.",
      insideEyebrow: "WHAT'S INSIDE",
      insideItems: [
        {
          title: '37+ email templates',
          description: 'Professional campaigns without starting from a blank page',
        },
        {
          title: 'A/B testing',
          description: 'Know what actually gets opened and clicked',
        },
        {
          title: 'Auto-resend to non-openers',
          description: 'Get a second chance at the same send, automatically',
        },
        {
          title: 'WhatsApp broadcasts and sequences',
          description: 'Treated as a first-class channel, not an add-on',
        },
        {
          title: 'Compliant unsubscribe handling',
          description: 'Built in, not bolted on',
        },
      ],
      whyEyebrow: 'WHY LEADSMIND',
      whyText:
        'Because email and WhatsApp both flow into the same Unified Inbox as your other client conversations — one thread per client, regardless of which channel they used.',
      ctaText: 'Send your first campaign free — email and WhatsApp, one platform.',
      ctaPrimaryLabel: 'Start Free',
      ctaSecondaryLabel: 'See Campaigns in Action',
      ctaSecondaryHref: '/#demo',
    },
  },
  {
    slug: 'automation',
    label: 'Workflow Automation',
    shortDescription: 'Visual workflows, 90+ triggers, and an AI builder.',
    cardDescription:
      "A deal closes and someone still has to remember to send the invoice, the welcome email, and the WhatsApp message by hand. LeadsMind's visual workflow builder connects 90+ triggers across every module to real actions — no code, and LENA can write the flow for you from plain English.",
    icon: Zap,
    color: '#8B5CF6',
    primary: true,
    published: true,
    metaTitle: 'Business Automation Software for African SMEs | LeadsMind',
    metaDescription:
      'Visual workflows, 90+ triggers, and an AI builder — automate follow-ups, reminders, and tasks without writing a line of code.',
    hero: {
      eyebrow: 'WORKFLOW AUTOMATION',
      headline: 'Set it up once. Never do it again.',
      paragraph:
        'Build visual workflows that handle follow-ups, reminders, and task creation automatically — no code, no developer, no repeating yourself.',
      capabilityTags: ['Triggers', 'Conditional Logic', 'AI Builder', '90+ Events'],
      ctaLabel: 'Start Free',
      finePrint: 'No credit card required',
      visualKey: 'automation-hero',
    },
    content: {
      problem:
        'Every manual follow-up, every repeated reminder, every "don\'t forget to…" task is time you\'re spending on something a system could be doing for you.',
      insideEyebrow: "WHAT'S INSIDE",
      insideItems: [
        {
          title: 'Visual workflow builder',
          description: 'Drag-and-drop logic, no code required',
        },
        {
          title: '90+ triggers',
          description: 'New lead, invoice overdue, course completed, and more',
        },
        {
          title: 'Multi-branch routing',
          description: 'Different paths for different conditions, handled automatically',
        },
        {
          title: 'Webhooks',
          description: 'Connect to tools outside LeadsMind when you need to',
        },
        {
          title: 'AI builder',
          description: 'Describe what you want automated, and get a working workflow to refine',
        },
      ],
      whyEyebrow: 'WHY LEADSMIND',
      whyText:
        'Because your workflows can trigger across CRM, invoicing, email, WhatsApp, and support tickets — one automation engine for the whole business, not a separate tool for every module.',
      ctaText: 'Build your first automation free — and stop doing it manually.',
      ctaPrimaryLabel: 'Start Free',
      ctaSecondaryLabel: 'See Automation Examples',
      ctaSecondaryHref: '/#demo',
    },
  },
  {
    slug: 'ai-tools',
    label: 'AI Tools',
    shortDescription: 'Content, scoring, and a CRM assistant, tuned for African business.',
    cardDescription:
      "Generic AI tools guess at an African market they weren't built for. LeadsMind's AI is woven through the platform — writing content, scoring leads, drafting support replies, and generating IVR voice prompts — tuned for African business and languages.",
    icon: Sparkles,
    color: '#EC4899',
    primary: true,
    published: true,
    metaTitle: 'AI Tools for African Business | LeadsMind',
    metaDescription:
      'AI content writing, lead scoring, meeting intelligence, and a CRM assistant — tuned for African business and languages.',
    hero: {
      eyebrow: 'AI TOOLS',
      headline: 'Your own AI team, built into the platform',
      paragraph:
        "Content writing, lead scoring, meeting notes, and a CRM assistant — AI that's tuned for African business, not translated for it.",
      capabilityTags: ['Content Writer', 'Lead Scoring', 'CRM Assistant', 'AI Voice'],
      ctaLabel: 'Start Free',
      finePrint: 'No credit card required',
      visualKey: 'ai-tools-hero',
    },
    content: {
      problem:
        "Most AI tools are built for a global, English-first market. They don't understand African business context — or the languages a lot of your customers actually speak.",
      insideEyebrow: "WHAT'S INSIDE",
      insideItems: [
        {
          title: 'AI Content Writer',
          description: 'Blog posts, emails, and social captions, drafted for you',
        },
        {
          title: 'AI lead scoring',
          description: 'Know which leads are worth chasing, ranked automatically',
        },
        {
          title: 'Meeting intelligence',
          description: 'Notes and summaries from your calls, without anyone typing during them',
        },
        {
          title: 'AI phone agent',
          description: "Handles routine calls so your team doesn't have to",
        },
        {
          title: 'CRM assistant',
          description: 'Ask it questions about your own pipeline and get straight answers',
        },
        {
          title: 'Multilingual support',
          description: 'Built with African languages in mind, not just English',
        },
      ],
      whyEyebrow: 'WHY LEADSMIND',
      whyText:
        'Because these AI tools work across your CRM, content, and communication — not as a bolt-on chatbot, but as part of how the whole platform runs.',
      ctaText: 'Put AI to work in your business — try it free.',
      ctaPrimaryLabel: 'Start Free',
      ctaSecondaryLabel: 'See AI Tools in Action',
      ctaSecondaryHref: '/#demo',
    },
  },
  {
    slug: 'hr-payroll',
    label: 'HR & Payroll',
    shortDescription: 'Payroll day, without the spreadsheet fire drill.',
    cardDescription:
      "Employee records in a folder, leave tracked in email, payroll calculated by hand — that's how one missed request becomes an awkward conversation. LeadsMind keeps records, attendance, leave, and payroll together in one place.",
    icon: Users,
    color: '#FF3CAC',
    primary: true,
    published: true,
    metaTitle: 'HR & Payroll Software for African Businesses | LeadsMind',
    metaDescription:
      'Employee records, leave management, time tracking, and payroll — statutory deductions handled correctly, every pay cycle.',
    hero: {
      eyebrow: 'PEOPLE OPERATIONS',
      headline: 'Run HR and payroll without a spreadsheet held together by hope',
      paragraph:
        'Employee records, leave requests, time tracking, and payroll — all in one place, connected to the same CRM and accounting your business already runs on.',
      capabilityTags: ['Employee Records', 'Time Tracking', 'Leave', 'Payroll'],
      ctaLabel: 'Start Free',
      finePrint: 'No credit card required',
      visualKey: 'hr-hero',
    },
    content: {
      problem:
        "Most small businesses manage HR through a mix of spreadsheets, WhatsApp messages, and memory — until a leave request gets missed, a payslip goes out wrong, or nobody can find last month's records when it matters.",
      insideEyebrow: "WHAT'S INSIDE",
      insideItems: [
        {
          title: 'Employee records',
          description: 'One real system of record, not a spreadsheet nobody updates',
        },
        {
          title: 'Leave management',
          description: 'Requests, approvals, and balances tracked automatically',
        },
        {
          title: 'Time tracking',
          description: 'Clock-ins, hours, and overtime, without a separate tool',
        },
        {
          title: 'Payroll runs',
          description: 'Statutory deductions handled correctly, every pay cycle',
        },
        {
          title: 'Self-service payslips',
          description: 'Employees see their own pay history, without asking HR',
        },
        {
          title: 'HR notifications',
          description: 'New hires, terminations, and payroll runs, never missed',
        },
      ],
      whyEyebrow: 'WHY LEADSMIND',
      whyText:
        'Because payroll runs through the same platform as your accounting and invoicing — no exporting a payroll report to reconcile it against your books by hand.',
      ctaText: 'Set up your first employee record free — payroll and HR, one platform.',
      ctaPrimaryLabel: 'Start Free',
      ctaSecondaryLabel: 'See HR & Payroll in Action',
      ctaSecondaryHref: '/#demo',
    },
  },
  {
    slug: 'calendar-booking',
    label: 'Calendar & Booking',
    shortDescription: "A booking page that ends the back-and-forth.",
    cardDescription:
      "Coordinating a meeting time over WhatsApp costs you messages you don't have time for. LeadsMind gives every team member a branded booking page, one-click video calls, and a waitlist that fills its own gaps.",
    icon: CalendarDays,
    color: '#14B8A6',
    primary: false,
    published: true,
    metaTitle: 'Calendar & Booking Software for South African Businesses',
    metaDescription:
      'Let clients book time on a branded page with automatic reminders, join meetings with one-click video calling, and fill cancellations from a waitlist — part of the LeadsMind platform.',
    hero: {
      eyebrow: 'SCHEDULING',
      headline: "A booking page that ends the 'what time works for you?' back-and-forth.",
      paragraph:
        'Clients pick a slot on your branded booking page, get automatic reminders, and join the call with one click — no separate scheduling app, no hunting for a Zoom link.',
      capabilityTags: ['Booking Pages', 'Video Calls', 'Reminders', 'Waitlist'],
      ctaLabel: 'Start Free Trial',
      finePrint: 'No credit card required',
      visualKey: 'calendar-hero',
    },
    pain: {
      eyebrow: 'THE PROBLEM WITH BOOKING BY MESSAGE',
      headline: "Booking a call still costs five messages before anything's confirmed.",
      points: [
        {
          kicker: 'Five messages before a time is confirmed',
          body: "Coordinating a meeting time over WhatsApp or email costs messages you don't have time for.",
        },
        {
          kicker: 'A Zoom link, hunted down separately',
          body: 'Even once a time is confirmed, joining the call means digging up a link from a different app.',
        },
        {
          kicker: 'Empty slots that never refill',
          body: 'A cancelled booking sits empty with no way to know it, or fill it, automatically.',
        },
      ],
    },
    featureGroups: {
      eyebrow: "WHAT'S INSIDE",
      headline: 'Booking, meetings, and a full calendar that fills its own gaps',
      groups: [
        {
          title: 'Booking Pages',
          items: [
            'Shareable, branded public booking pages',
            'Automatic confirmations and reminders',
            'Custom intake question forms',
          ],
        },
        {
          title: 'Meetings',
          items: ['One-click instant video meetings with recording', 'Multi-calendar management'],
        },
        {
          title: 'Fewer Gaps, Fewer No-Shows',
          items: ['Booking analytics', 'Waitlist with automatic promotion'],
        },
      ],
    },
    connective: {
      eyebrow: 'ONE DATA LAYER',
      headline: 'A booking already knows who the client is.',
      paragraph:
        'Every team member gets a branded, shareable booking page tied to the same contact record as the rest of the platform — so a booking is never a stranger showing up on the calendar.',
    },
    finalCta: {
      headline: 'Let clients book themselves — and stop the back-and-forth for good.',
      subtext: 'Start free and share your first booking page today.',
      gradientFrom: '#14B8A6',
      gradientTo: '#00B2FF',
    },
  },
  {
    slug: 'communication',
    label: 'Communication & Support',
    shortDescription: 'One inbox for support, instead of three.',
    cardDescription:
      "A support question on email, a ticket on your site, and no single view of either — that's how the same question gets answered twice. LeadsMind brings tickets and email into one inbox, with LENA helping your team respond faster.",
    icon: MessageSquare,
    color: '#1359FF',
    primary: false,
    published: true,
    metaTitle: 'Customer Support & Communication Software',
    metaDescription:
      'A support ticket system, embeddable widget, unified inbox, and LENA AI assistant to help your team respond faster — part of the LeadsMind platform.',
    hero: {
      eyebrow: 'SUPPORT',
      headline: 'One inbox for support, instead of three separate places to check.',
      paragraph:
        'Tickets, your support widget, and email meet in one inbox, with LENA helping your team respond faster — WhatsApp and SMS are joining that same inbox as we roll them out.',
      capabilityTags: ['Tickets', 'Unified Inbox', 'LENA AI', 'Support Widget'],
      ctaLabel: 'Start Free Trial',
      finePrint: 'No credit card required',
      visualKey: 'communication-hero',
    },
    pain: {
      eyebrow: 'THE PROBLEM WITH SCATTERED SUPPORT',
      headline: 'The same question, answered twice, by two different people.',
      points: [
        {
          kicker: 'The same question, answered twice',
          body: 'A customer messages on WhatsApp, emails a different question, and submits a support form — and three people end up answering the same thing.',
        },
        {
          kicker: 'No record of who replied',
          body: 'Questions that arrive by email get lost between inboxes, with no thread showing who answered what.',
        },
        {
          kicker: 'Agents answering the same thing, over and over',
          body: 'Typing out the same reply for the twentieth time is where support teams burn out.',
        },
      ],
    },
    featureGroups: {
      eyebrow: "WHAT'S INSIDE",
      headline: 'Tickets, AI assistance, and one inbox for every channel',
      groups: [
        {
          title: 'Support Tickets',
          items: ['Support ticket system with public thread and agent reply', 'Embeddable support widget'],
        },
        {
          title: 'LENA AI Assistant',
          items: ['LENA AI assistant for customer support', 'Configurable LENA personality and knowledge base'],
        },
        {
          title: 'Unified Inbox',
          items: ['Unified conversation inbox across channels', 'Email compose and read interface'],
        },
      ],
    },
    connective: {
      eyebrow: 'ONE DATA LAYER',
      headline: 'Support already knows who the customer is and what they bought.',
      paragraph:
        'Tickets and email share the same contact record as CRM and invoicing — so an agent can see a customer\'s history without asking them to repeat it.',
    },
    finalCta: {
      headline: 'One inbox. Every question answered from the same place.',
      subtext: 'Start free and bring your support channels into one inbox.',
      gradientFrom: '#1359FF',
      gradientTo: '#00B2FF',
    },
  },
  {
    slug: 'content-marketing',
    label: 'Content & Marketing',
    shortDescription: 'Write it, publish it, and see what converts.',
    cardDescription:
      "A blog in one tool, a landing page in another, and no clear view of which one brought in the lead. LeadsMind's content studio, blog, landing pages, and funnels live in one place, each with its own analytics.",
    icon: PenSquare,
    color: '#7B3FF2',
    primary: false,
    published: true,
    metaTitle: 'Content & Marketing Tools for South African Businesses',
    metaDescription:
      'Draft with AI assistance, publish a blog with built-in SEO, build landing pages and funnels, and capture leads with embeddable forms — part of the LeadsMind platform.',
    hero: {
      eyebrow: 'MARKETING',
      headline: 'Write it, publish it, and see what actually converts — without leaving the platform.',
      paragraph:
        "A content studio, blog, landing pages, and funnels live in one place, each with its own analytics, so a campaign isn't scattered across three logins.",
      capabilityTags: ['Content Studio', 'Blog', 'Landing Pages', 'Funnels'],
      ctaLabel: 'Start Free Trial',
      finePrint: 'No credit card required',
      visualKey: 'content-hero',
    },
    pain: {
      eyebrow: 'THE PROBLEM WITH SCATTERED CONTENT TOOLS',
      headline: "Nobody's quite sure which page actually brought in the lead.",
      points: [
        {
          kicker: 'A blog in one tool, a landing page in another',
          body: "Nobody's quite sure which one actually brought in the lead when campaign content is scattered across separate logins.",
        },
        {
          kicker: 'Formatting breaks between apps',
          body: 'Writing in one app and publishing in another means formatting breaks and drafts get lost in translation.',
        },
        {
          kicker: "A page with no way to capture anyone",
          body: "A beautiful page that doesn't capture a visitor's details is a missed opportunity, not a campaign.",
        },
      ],
    },
    featureGroups: {
      eyebrow: "WHAT'S INSIDE",
      headline: 'Draft, publish, and capture a lead — in one place',
      groups: [
        {
          title: 'Content Studio',
          items: [
            'Content studio with AI writing assistance',
            'Full blog CMS with categories, comments, and analytics',
            'Per-post SEO settings with sitemap generation',
          ],
        },
        {
          title: 'Pages & Funnels',
          items: [
            'Drag-and-drop landing page editor',
            'Full website page editor and publisher',
            'Multi-step funnel builder with analytics',
          ],
        },
        {
          title: 'Lead Capture',
          items: ['Embeddable forms builder'],
        },
      ],
    },
    connective: {
      eyebrow: 'ONE DATA LAYER',
      headline: 'Every page already knows how to capture a lead.',
      paragraph:
        'Content, pages, and funnels feed leads straight into the same CRM and automation engine as the rest of the platform — no export, no re-import.',
    },
    finalCta: {
      headline: 'Write it, publish it, and watch what actually converts.',
      subtext: 'Start free and publish your first piece of content today.',
      gradientFrom: '#7B3FF2',
      gradientTo: '#FF3CAC',
    },
  },
];

export function getModule(slug: string): ModuleContent | undefined {
  return modules.find((m) => m.slug === slug);
}

export function getPublishedModule(slug: string): ModuleContent | undefined {
  const mod = getModule(slug);
  return mod?.published ? mod : undefined;
}
