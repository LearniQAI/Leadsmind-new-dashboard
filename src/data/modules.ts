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

export interface ModuleContent {
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
  pain: ModulePain;
  featureGroups: ModuleFeatures;
  connective: ModuleConnective;
  finalCta: ModuleFinalCta;
}

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
    metaTitle: 'CRM & Sales Software for South African SMEs',
    metaDescription:
      'Track every lead from first message to closed deal with a contact database, drag-and-drop pipeline, AI lead scoring, and a built-in Lead Finder — part of the LeadsMind platform.',
    hero: {
      eyebrow: 'CRM & SALES PIPELINE',
      headline: 'Stop chasing leads in a spreadsheet.',
      paragraph:
        'A contact database, visual sales pipeline, and AI lead scoring — plus a built-in Lead Finder that adds new prospects with one click. So your team spends its day closing, not copy-pasting between four different apps.',
      capabilityTags: ['Pipeline', 'Lead Finder', 'AI Scoring', 'Forecasting'],
      ctaLabel: 'Start Free Trial',
      finePrint: 'No credit card required',
      visualKey: 'crm-hero',
    },
    pain: {
      eyebrow: 'THE PROBLEM WITH HOW YOU SELL TODAY',
      headline: "Leads don't die from lack of interest. They die from lack of follow-up.",
      points: [
        {
          kicker: '47% of leads go cold',
          body: 'Without a system to track every conversation, follow-ups slip — and business that was already yours walks to a competitor.',
        },
        {
          kicker: 'Conversations everywhere',
          body: 'WhatsApp, email, Instagram, a notebook by the till — client messages scattered across apps with no central record.',
        },
        {
          kicker: 'No system to find new leads',
          body: "Growth depends on referrals and luck, because outbound prospecting means hiring an agency you can't afford yet.",
        },
      ],
    },
    featureGroups: {
      eyebrow: "WHAT'S INSIDE",
      headline: 'Everything a sales team needs, nothing it doesn\'t',
      groups: [
        {
          title: 'Pipeline & Deals',
          items: [
            'Contact database',
            'Visual, drag-and-drop sales pipeline',
            'Deal stages & sales forecasting',
            'Task & follow-up reminders',
          ],
        },
        {
          title: 'Lead Generation',
          items: [
            'Lead Finder — search Google Maps, LinkedIn, Facebook',
            'AI lead scoring, ranked by likelihood to convert',
            'One-click add prospects straight to your pipeline',
          ],
        },
        {
          title: 'Reporting',
          items: ['Real-time pipeline value', 'Projected monthly revenue', 'Activity & follow-up tracking per contact'],
        },
      ],
    },
    connective: {
      eyebrow: 'ONE DATA LAYER',
      headline: 'Your CRM already knows what your invoices and inbox know.',
      paragraph:
        "A single contact record is updated by CRM, invoicing, email, and support at the same time — so nobody's re-entering the same client's details into a fourth tool.",
    },
    finalCta: {
      headline: 'Your next customer is one Lead Finder search away.',
      subtext: 'Start free and see your whole pipeline in one place — today.',
      gradientFrom: '#1359FF',
      gradientTo: '#7B3FF2',
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
    metaTitle: 'LMS & Online Course Platform for South African Businesses',
    metaDescription:
      'Build and sell courses with a full course builder, structured cohorts, SCORM support, an AI quiz generator, and automatic certificates — part of the LeadsMind platform.',
    hero: {
      eyebrow: 'ONLINE COURSES',
      headline: 'Run your course business without three extra tools.',
      paragraph:
        'A full LMS — certificates, SCORM, drip content, and student analytics — alongside the CRM, email marketing, and invoicing you need to actually run the business around the course. One login, priced in Rands, instead of USD tools that move with the exchange rate.',
      capabilityTags: ['Course Builder', 'Certificates', 'Cohorts', 'AI Quizzes'],
      ctaLabel: 'Start Free Trial',
      finePrint: 'No credit card required',
      visualKey: 'lms-hero',
    },
    pain: {
      eyebrow: 'THE PROBLEM WITH KAJABI-STYLE TOOLS',
      headline: 'Delivering the course was never the hard part. Running the business around it was.',
      points: [
        {
          kicker: 'USD pricing that moves',
          body: 'R3,000–R5,000/month for Kajabi, in dollars — a cost that quietly rises every time the Rand weakens.',
        },
        {
          kicker: 'Three extra tools required',
          body: "Course platforms rarely handle CRM, email marketing, or invoicing — so you're paying for, and switching between, several more apps just to get paid.",
        },
        {
          kicker: 'No single student record',
          body: "Enrolment, payment, and communication live in different systems — so nobody has one clear view of a student's journey.",
        },
      ],
    },
    featureGroups: {
      eyebrow: "WHAT'S INSIDE",
      headline: 'From enrolment to certificate, without switching apps',
      groups: [
        {
          title: 'Course Delivery',
          items: [
            'Drag-and-drop course builder',
            'Drip content on your own schedule',
            'Structured cohorts with shared intake dates',
            'SCORM support for compliance training',
          ],
        },
        {
          title: 'Certification',
          items: ['Automated certificates on completion', 'CPD-ready exports'],
        },
        {
          title: 'Engagement & Insight',
          items: [
            'AI quiz generator — build a graded quiz from any lesson in seconds',
            'Student analytics: completion rates & drop-off points',
            'Payment plans and instalment billing on enrolment',
          ],
        },
      ],
    },
    connective: {
      eyebrow: 'ONE PLATFORM, START TO FINISH',
      headline: 'Find the student, enrol them, get paid, issue the certificate — without switching apps.',
      paragraph:
        'Your course platform, CRM, email marketing, and invoicing already share the same student record — so nothing needs re-entering twice.',
    },
    finalCta: {
      headline: 'Built for South African course creators, trainers, and L&D teams.',
      subtext: 'Start free and launch your first cohort without adding a single extra tool.',
      gradientFrom: '#7B3FF2',
      gradientTo: '#FF3CAC',
    },
  },
  {
    slug: 'accounting-finance',
    label: 'Accounting & Finance',
    shortDescription: 'VAT201, IRP6, EMP201, and payroll — built in.',
    cardDescription:
      'Invoices get made in one tool, expenses tracked in another, and the two rarely match. LeadsMind handles VAT201, IRP6, and EMP201 submissions, PAYE/UIF/SDL payroll, and bank reconciliation with the banks you already use — all posting to a real ledger.',
    icon: Wallet,
    color: '#FF8A00',
    primary: true,
    published: true,
    metaTitle: 'Accounting & Payroll Software for South African SMEs',
    metaDescription:
      'VAT201, IRP6, and EMP201 submissions, PAYE/UIF/SDL payroll, direct bank reconciliation, and a guided AI accountant wizard — part of the LeadsMind platform.',
    hero: {
      eyebrow: 'ACCOUNTING & PAYROLL',
      headline: "SARS compliance that doesn't need an accountant on speed dial.",
      paragraph:
        'VAT201, IRP6, EMP201, and PAYE/UIF/SDL payroll — built in, not bolted on. Bank reconciliation with FNB, Absa, Nedbank, and Capitec, and a guided AI accountant wizard that walks you through setup step by step.',
      capabilityTags: ['VAT201', 'IRP6', 'EMP201', 'Payroll'],
      ctaLabel: 'Start Free Trial',
      finePrint: 'No credit card required',
      visualKey: 'accounting-hero',
    },
    pain: {
      eyebrow: 'THE PROBLEM WITH INFORMAL BOOKKEEPING',
      headline: "SARS doesn't send a friendly reminder. It sends a penalty.",
      points: [
        {
          kicker: 'Missed deadlines, real penalties',
          body: 'Informal spreadsheets and shoebox receipts turn tax season into audit anxiety, with real financial consequences for a missed filing.',
        },
        {
          kicker: 'A separate R850/month tool',
          body: 'Xero handles accounting well, but knows nothing about your CRM, invoicing, or client communication — another login, another cost.',
        },
        {
          kicker: 'No real-time financial picture',
          body: 'Without a live view of cash flow and outstanding invoices, decisions get made on gut feel instead of actual numbers.',
        },
      ],
    },
    featureGroups: {
      eyebrow: "WHAT'S INSIDE",
      headline: 'Everything SARS asks for, without the dread',
      groups: [
        {
          title: 'Compliance',
          items: ['VAT201 submissions', 'IRP6 provisional tax', 'EMP201 filings', 'PAYE, UIF, and SDL payroll deductions'],
        },
        {
          title: 'Banking',
          items: ['Direct feeds: FNB, Absa, Nedbank, Capitec, Investec', 'Automated transaction reconciliation'],
        },
        {
          title: 'Visibility',
          items: [
            '90-day cash flow forecast',
            'AR/AP dashboard',
            'AI accountant wizard — 17-step guided setup',
            'Scheduled financial reports',
          ],
        },
      ],
    },
    connective: {
      eyebrow: 'ONE DATA LAYER',
      headline: 'Every invoice you send already knows where it belongs in your books.',
      paragraph:
        'Accounting shares the same data as invoicing and CRM — an invoice marked paid updates your ledger automatically, with nothing to re-enter by hand.',
    },
    finalCta: {
      headline: 'File with confidence. Get paid faster.',
      subtext: 'Start free and get your books SARS-ready from your very first transaction.',
      gradientFrom: '#FF8A00',
      gradientTo: '#FF3CAC',
    },
  },
  {
    slug: 'invoicing',
    label: 'Invoicing',
    shortDescription: 'Recurring billing, payment links, automated reminders.',
    cardDescription:
      "Invoices go out, then nothing happens until you make an awkward call. LeadsMind sends professional invoices with PayFast, Stripe, and EFT payment links built in, plus a 6-step reminder sequence that chases overdue payments for you.",
    icon: Receipt,
    color: '#34B53A',
    primary: true,
    published: true,
    metaTitle: 'Invoicing Software for South African SMEs',
    metaDescription:
      'Send professional, branded invoices with recurring billing, PayFast/Stripe/EFT payment links, and a 6-step automated reminder sequence — part of the LeadsMind platform.',
    hero: {
      eyebrow: 'INVOICING',
      headline: 'Get paid without the awkward follow-up call.',
      paragraph:
        'Professional, branded invoices with recurring billing, payment plans, and an automated reminder sequence that chases overdue payments for you.',
      capabilityTags: ['Recurring Billing', 'PayFast', 'EFT', 'Auto Reminders'],
      ctaLabel: 'Start Free Trial',
      finePrint: 'No credit card required',
      visualKey: 'invoicing-hero',
    },
    pain: {
      eyebrow: 'THE PROBLEM WITH GETTING PAID',
      headline: "An unpaid invoice doesn't remind itself. And neither do most business owners.",
      points: [
        {
          kicker: 'The awkward follow-up call',
          body: "Chasing a client for money you're owed is uncomfortable enough that most people just don't, and the invoice quietly goes unpaid.",
        },
        {
          kicker: 'Payment status, nowhere to see',
          body: 'Whether an invoice was opened, paid, or ignored lives in your email and your bank app — two places you have to check separately.',
        },
        {
          kicker: 'Every invoice made from scratch',
          body: "Retyping the same client details and line items each month is time that should've gone into actual work.",
        },
      ],
    },
    featureGroups: {
      eyebrow: "WHAT'S INSIDE",
      headline: 'Everything it takes to get paid, without the chasing',
      groups: [
        {
          title: 'Create & Send',
          items: ['Professional, branded invoices', 'Recurring billing', 'Payment plans & instalments'],
        },
        {
          title: 'Get Paid',
          items: [
            'PayFast, Stripe, and EFT payment links on every invoice',
            'Bank reconciliation ties payments straight to your ledger',
          ],
        },
        {
          title: 'Never Chase Again',
          items: [
            '6-step automated reminder sequence',
            'Sent via SMS, WhatsApp, and email',
            'Overdue invoices followed up without an awkward phone call',
          ],
        },
      ],
    },
    connective: {
      eyebrow: 'ONE DATA LAYER',
      headline: 'Every invoice already knows who the client is and what they owe.',
      paragraph:
        'Invoicing is tied to the same contact record as your CRM — so payment status, client history, and communication are always in one place, not spread across three tools.',
    },
    finalCta: {
      headline: 'Send the invoice. Let the reminders do the rest.',
      subtext: 'Start free and get paid on your very first invoice.',
      gradientFrom: '#34B53A',
      gradientTo: '#00B2FF',
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
    metaTitle: 'Business Phone & IVR System for South African SMEs',
    metaDescription:
      'A business phone number, a visual IVR menu builder, click-to-call from any CRM contact, and AI voice prompts — billed directly through your own Twilio account, part of the LeadsMind platform.',
    hero: {
      eyebrow: 'PHONE & IVR',
      headline: 'A business phone system that answers exactly the way you want it to.',
      paragraph:
        'Buy a number, build your call menu, and route every call — "Press 1 for the bank manager, press 2 for our branch" — without touching a Twilio console.',
      capabilityTags: ['Number Search', 'IVR Builder', 'AI Voice', 'Click-to-Call'],
      ctaLabel: 'Start Free Trial',
      finePrint: 'No credit card required',
      visualKey: 'phone-ivr-hero',
    },
    pain: {
      eyebrow: 'THE PROBLEM WITH RUNNING CALLS OFF A CELLPHONE',
      headline: "A personal number doesn't scale, and a missed call doesn't call itself back.",
      points: [
        {
          kicker: "Calls answered by whoever's free",
          body: "Without a call menu, every call lands on one person's cellphone — and if they're on another line, the customer just doesn't get through.",
        },
        {
          kicker: 'No record of who called',
          body: 'A missed call from a cellphone leaves no note, no recording, and no link back to the CRM contact who made it.',
        },
        {
          kicker: 'Setting one up looks like a dev project',
          body: 'Twilio can do all of this — but configuring it directly means a console full of settings most business owners have no reason to learn.',
        },
      ],
    },
    featureGroups: {
      eyebrow: "WHAT'S INSIDE",
      headline: 'A real business phone system, without the Twilio console',
      groups: [
        {
          title: 'Numbers',
          items: [
            'Search & buy a number in-app, on your own connected Twilio account',
            "Import a number you've already purchased directly in Twilio",
          ],
        },
        {
          title: 'IVR Menus',
          items: [
            'Visual, step-based menu builder',
            'Nested menus & business-hours routing',
            'Upload audio, record in-browser, or generate a voice prompt with AI text-to-speech',
          ],
        },
        {
          title: 'Calling & SMS',
          items: [
            'Click-to-call from any CRM contact record',
            'SMS from your business number',
            'Call recording with a built-in consent announcement',
          ],
        },
      ],
    },
    connective: {
      eyebrow: 'TRANSPARENT BILLING',
      headline: "Your Twilio account is billed directly, at Twilio's own rates.",
      paragraph:
        'LeadsMind charges only for platform access — never a per-minute markup on your calls, SMS, or number rental.',
    },
    finalCta: {
      headline: 'Give your business a number that answers itself, correctly.',
      subtext: 'Start free and have your first call menu live in minutes.',
      gradientFrom: '#06B6D4',
      gradientTo: '#1359FF',
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
    metaTitle: 'Sales Funnels & Website Builder for South African SMEs',
    metaDescription:
      'A drag-and-drop builder for landing pages, full websites, and complete sales funnels, published from a professional template library — part of the LeadsMind platform.',
    hero: {
      eyebrow: 'SALES FUNNELS & WEBSITE BUILDER',
      headline: 'Build pages that convert, without touching code.',
      paragraph:
        'A drag-and-drop builder for landing pages, full websites, and complete sales funnels — from a professional template library, published in minutes.',
      capabilityTags: ['Landing Pages', 'Funnels', 'Blog', 'Custom Domains'],
      ctaLabel: 'Start Free Trial',
      finePrint: 'No credit card required',
      visualKey: 'funnels-hero',
    },
    pain: {
      eyebrow: 'THE PROBLEM WITH WAITING ON A DEVELOPER',
      headline: 'A campaign that needs a developer first is a campaign that ships two weeks late.',
      points: [
        {
          kicker: 'A landing page takes a developer and a week',
          body: 'By the time a simple campaign page is built, the offer it was built for has already gone cold.',
        },
        {
          kicker: 'One page, no follow-through',
          body: 'A page with no thank-you step, no upsell, and no sequence behind it converts once and then goes quiet.',
        },
        {
          kicker: 'Website and funnels, two different tools',
          body: "The main site lives in one platform and campaign pages in another — so nothing shares a template, a domain, or a brand kit.",
        },
      ],
    },
    featureGroups: {
      eyebrow: "WHAT'S INSIDE",
      headline: 'Every page a campaign needs, from one editor',
      groups: [
        {
          title: 'Pages That Convert',
          items: ['Landing pages', 'Squeeze pages', 'Thank-you pages', 'Webinar registration pages'],
        },
        {
          title: 'Full Website',
          items: ['Full website builder', 'Blog creation', 'Custom domains'],
        },
        {
          title: 'Build Faster',
          items: ['Drag-and-drop editor', 'Professional template library'],
        },
        {
          title: 'Funnel Types Ready to Use',
          items: [
            'Lead Capture Funnel',
            'Video Sales Letter (VSL) Funnel',
            'Course Sales Funnel',
            'Webinar Funnel',
            'App Launch Funnel',
            'Agency Lead Funnel',
          ],
        },
      ],
    },
    connective: {
      eyebrow: 'ONE DATA LAYER',
      headline: 'Every page you publish already knows how to capture a lead.',
      paragraph:
        'Funnels and landing pages share the same contact record and automation engine as the rest of the platform — a form submission on a page you built this morning can already trigger a CRM entry and a welcome email.',
    },
    finalCta: {
      headline: 'Your next campaign page, live before lunch.',
      subtext: 'Start free and publish your first funnel today.',
      gradientFrom: '#00B2FF',
      gradientTo: '#7B3FF2',
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
    metaTitle: 'Email & WhatsApp Marketing Software for South African SMEs',
    metaDescription:
      'Email campaigns, automated sequences, and segmentation, alongside WhatsApp Business, SMS, and social — every channel in one inbox, part of the LeadsMind platform.',
    hero: {
      eyebrow: 'EMAIL & WHATSAPP MARKETING',
      headline: 'Every channel your customers use, one place to manage it.',
      paragraph:
        "Email campaigns and automated sequences, sitting alongside WhatsApp, SMS, and social — so a client's whole conversation history lives in one thread.",
      capabilityTags: ['Campaigns', 'Sequences', 'Segmentation', 'WhatsApp'],
      ctaLabel: 'Start Free Trial',
      finePrint: 'No credit card required',
      visualKey: 'email-whatsapp-hero',
    },
    pain: {
      eyebrow: 'THE PROBLEM WITH FIVE MARKETING APPS',
      headline: "A client's history lives in five apps — and no single one has the whole story.",
      points: [
        {
          kicker: 'One client, five separate threads',
          body: 'Email, WhatsApp, SMS, and Instagram each hold half a conversation — so nobody replying to any of them has the full picture.',
        },
        {
          kicker: 'The same campaign, built from scratch per channel',
          body: "A promotion gets written once for email, then rebuilt by hand for WhatsApp, because the tools don't talk to each other.",
        },
        {
          kicker: 'No idea what actually landed',
          body: "Without open and click data in one place, it's a guess which message actually brought the customer back.",
        },
      ],
    },
    featureGroups: {
      eyebrow: "WHAT'S INSIDE",
      headline: 'Build the campaign once, reach every channel',
      groups: [
        {
          title: 'Campaigns',
          items: ['Email campaigns', 'Email newsletters', 'Broadcast emails', 'Email analytics'],
        },
        {
          title: 'Automation & Targeting',
          items: ['Automated email sequences', 'Email segmentation', 'Tags', 'Personalisation'],
        },
        {
          title: 'Every Channel, One Inbox',
          items: [
            'WhatsApp Business messaging',
            'SMS',
            'Instagram DMs & Facebook Messenger',
            'One thread per client, across every channel',
          ],
        },
      ],
    },
    connective: {
      eyebrow: 'ONE DATA LAYER',
      headline: 'The segment you email is the same list WhatsApp already knows.',
      paragraph:
        'Campaigns, sequences, and every channel share the same contact record and tags as your CRM — so a segment built for email works for WhatsApp too, with nothing rebuilt twice.',
    },
    finalCta: {
      headline: 'One campaign, every channel your customers actually check.',
      subtext: 'Start free and send your first campaign across email and WhatsApp today.',
      gradientFrom: '#FF3CAC',
      gradientTo: '#FF8A00',
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
    metaTitle: 'Workflow Automation for South African Businesses',
    metaDescription:
      'A visual, no-code workflow builder with 90+ trigger events, 40+ actions across every module, and an AI builder that writes flows from plain English — part of the LeadsMind platform.',
    hero: {
      eyebrow: 'WORKFLOW AUTOMATION',
      headline: 'The engine that runs your business while you sleep.',
      paragraph:
        'A visual drag-and-drop canvas that connects every module — a deal closes, and the invoice, welcome email, course enrolment, and WhatsApp message all fire automatically.',
      capabilityTags: ['Triggers', 'Conditional Logic', 'AI Builder', '90+ Events'],
      ctaLabel: 'Start Free Trial',
      finePrint: 'No credit card required',
      visualKey: 'automation-hero',
    },
    pain: {
      eyebrow: 'THE PROBLEM WITH MANUAL FOLLOW-UP',
      headline: 'Nothing is actually watching for the moment that matters — a person has to remember to.',
      points: [
        {
          kicker: 'Every hand-off depends on memory',
          body: 'A deal closes, a form gets submitted, a course finishes — and the next step only happens if someone remembers to do it.',
        },
        {
          kicker: 'Automation tools that stop at your CRM',
          body: 'Generic automation platforms connect to the CRM, then need a developer to reach invoicing, payroll, or the LMS.',
        },
        {
          kicker: 'Building a flow means learning a new tool',
          body: 'A visual canvas with dozens of unlabeled node types is its own project to learn, before a single workflow gets built.',
        },
      ],
    },
    featureGroups: {
      eyebrow: "WHAT'S INSIDE",
      headline: 'A flow for every hand-off in the business',
      groups: [
        {
          title: 'Build Flows',
          items: ['Rules and triggers', 'Conditional logic & branching', 'Visual drag-and-drop canvas'],
        },
        {
          title: 'Nurture & Route',
          items: ['Lead nurturing', 'Customer journeys', 'Automated tagging', 'CRM automation'],
        },
        {
          title: 'Platform-Wide Reach',
          items: [
            '90+ trigger events across every module',
            '40+ action types — CRM, communication, financial, LMS',
            'Executes in under 5 seconds, start to finish',
          ],
        },
        {
          title: 'Built for South Africa',
          items: ['LENA AI builds flows from a plain-English description', '50+ pre-built South African automation templates'],
        },
      ],
    },
    connective: {
      eyebrow: 'ONE DATA LAYER',
      headline: 'A workflow can touch anything the platform already knows.',
      paragraph:
        'Because automation sits on the same data as CRM, invoicing, and the LMS, a single trigger can update a deal, send an invoice, and enrol a student — without a single integration to configure.',
    },
    finalCta: {
      headline: 'Describe the flow. Let LENA build it.',
      subtext: 'Start free and automate your first hand-off today.',
      gradientFrom: '#8B5CF6',
      gradientTo: '#00B2FF',
    },
  },
  {
    slug: 'ai-tools',
    label: 'AI Tools',
    shortDescription: 'Content, scoring, and a CRM assistant, tuned for SA.',
    cardDescription:
      "Generic AI tools guess at a South African market they weren't built for. LeadsMind's AI is woven through the platform — writing content, scoring leads, drafting support replies, and generating IVR voice prompts — tuned for South African English.",
    icon: Sparkles,
    color: '#EC4899',
    primary: true,
    published: true,
    metaTitle: 'AI Tools for South African Businesses',
    metaDescription:
      'AI content writing, lead scoring, a CRM assistant, and AI voice tools tuned for South African English — woven through the LeadsMind platform, not bolted on.',
    hero: {
      eyebrow: 'AI TOOLS',
      headline: 'AI that actually understands South African business.',
      paragraph:
        'Content generation, lead scoring, and voice tools tuned for South African English — not a US model guessing at your market.',
      capabilityTags: ['Content Writer', 'Lead Scoring', 'CRM Assistant', 'AI Voice'],
      ctaLabel: 'Start Free Trial',
      finePrint: 'No credit card required',
      visualKey: 'ai-tools-hero',
    },
    pain: {
      eyebrow: 'THE PROBLEM WITH GENERIC AI TOOLS',
      headline: "Most AI tools were trained on a market that isn't yours.",
      points: [
        {
          kicker: "Doesn't sound South African",
          body: 'US-trained writing tools default to American spelling, idiom, and tone — and it shows in every email and post they draft.',
        },
        {
          kicker: 'One chatbot, bolted on',
          body: 'Most platforms ship a single generic assistant instead of AI that actually understands your leads, your invoices, or your calls.',
        },
        {
          kicker: 'Another subscription, another login',
          body: "A separate AI writing tool is one more monthly cost that still doesn't know anything about your CRM or your customers.",
        },
      ],
    },
    featureGroups: {
      eyebrow: "WHAT'S INSIDE",
      headline: 'AI, wherever it actually saves you time',
      groups: [
        {
          title: 'Content',
          items: ['AI content writer — blog, email, and social posts', 'Grammar & plagiarism checker', 'SEO scorer'],
        },
        {
          title: 'Sales & Support',
          items: ['AI lead scoring', 'CRM assistant', 'AI reply suggestions for support tickets'],
        },
        {
          title: 'Voice',
          items: ['AI text-to-speech for IVR voice prompts', 'Meeting intelligence'],
        },
        {
          title: 'Built for Africa',
          items: ['Tuned for South African English', 'Expanding into Afrikaans, Zulu, Sotho, and Xhosa'],
        },
      ],
    },
    connective: {
      eyebrow: 'ONE DATA LAYER',
      headline: 'The AI already knows your leads, your invoices, and your calls.',
      paragraph:
        "Because it's built into the platform rather than bolted on, LeadsMind's AI can score a real lead, draft a reply to a real ticket, and read out a real IVR prompt — with no data to export first.",
    },
    finalCta: {
      headline: 'AI that works the way your business actually talks.',
      subtext: 'Start free and put AI to work across your whole platform.',
      gradientFrom: '#EC4899',
      gradientTo: '#7B3FF2',
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
    primary: false,
    published: true,
    metaTitle: 'HR & Payroll Software for South African Teams',
    metaDescription:
      'Manage employee records, clock-in/out time tracking, leave requests, scheduling, and payroll runs with automatic payslips — part of the LeadsMind platform.',
    hero: {
      eyebrow: 'PEOPLE OPERATIONS',
      headline: 'Payroll day, without the spreadsheet fire drill.',
      paragraph:
        'Employee records, attendance, leave, and payroll all live in one place — so running payroll is a few clicks, not a week of chasing timesheets.',
      capabilityTags: ['Employee Records', 'Time Tracking', 'Leave', 'Payroll'],
      ctaLabel: 'Start Free Trial',
      finePrint: 'No credit card required',
      visualKey: 'hr-hero',
    },
    pain: {
      eyebrow: 'THE PROBLEM WITH SPREADSHEET HR',
      headline: 'Payroll month-end turns into a fire drill, and one missed leave request turns into an awkward conversation.',
      points: [
        {
          kicker: 'Payroll by spreadsheet',
          body: 'Month-end payroll turns into a fire drill of formulas and manual calculations nobody fully trusts.',
        },
        {
          kicker: 'Leave tracked in email',
          body: 'A missed leave request buried in an inbox turns into an awkward conversation with an employee who did everything right.',
        },
        {
          kicker: "A folder of contracts, not a record",
          body: "Employee documents scattered across someone's laptop and email threads isn't a record system — it's a risk.",
        },
      ],
    },
    featureGroups: {
      eyebrow: "WHAT'S INSIDE",
      headline: 'Records, attendance, leave, and payroll — all in one place',
      groups: [
        {
          title: 'Employee Records',
          items: ['Full employee directory with documents', 'Formal warning issuance tracking'],
        },
        {
          title: 'Time & Leave',
          items: [
            'Clock-in/out time tracking with overtime',
            'Daily attendance tracking',
            'Leave request, approval, and balance tracking',
          ],
        },
        {
          title: 'Scheduling & Payroll',
          items: [
            'Employee scheduling and shift management',
            'Payroll runs with automatic payslip generation',
            'Employee-facing payslip view',
          ],
        },
      ],
    },
    connective: {
      eyebrow: 'ONE DATA LAYER',
      headline: 'Every employee record already knows their hours, leave, and pay.',
      paragraph:
        "Every employee has one record with documents, leave balances, and attendance in it, so nothing depends on a spreadsheet only one person understands.",
    },
    finalCta: {
      headline: 'Run payroll in minutes, not a week of chasing timesheets.',
      subtext: 'Start free and bring your team records into one place.',
      gradientFrom: '#FF3CAC',
      gradientTo: '#FF8A00',
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
