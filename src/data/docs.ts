import type { LucideIcon } from 'lucide-react';
import { Rocket, Target, Wallet, PenSquare, Zap, BookOpen, MessageSquare, Shield } from 'lucide-react';

export interface DocArticle {
  title: string;
  intro: string;
  /** Ordered how-to steps. Use for task-oriented articles. */
  steps?: string[];
  /** Unordered list. Use for reference-style or conceptual articles. */
  bullets?: string[];
  /** Short italicized callout — used to flag partial/in-progress features rather than presenting them as finished. */
  note?: string;
}

export interface DocCategory {
  slug: string;
  label: string;
  icon: LucideIcon;
  /** Shown on the /docs index card and used as the page's meta description base. */
  description: string;
  articles: DocArticle[];
}

export const docCategories: DocCategory[] = [
  {
    slug: 'getting-started',
    label: 'Getting Started',
    icon: Rocket,
    description: 'Create your account, set up your workspace, and invite your team.',
    articles: [
      {
        title: 'Creating Your Account',
        intro: 'Sign up for LeadsMind and verify your email to activate your workspace.',
        steps: [
          'Go to the signup page and enter your name, email, and a password.',
          'Check your inbox for a confirmation email from LeadsMind and click the verification link.',
          "Once verified, you'll be signed in and taken to set up your workspace.",
        ],
      },
      {
        title: 'Setting Up Your Workspace',
        intro: "Your workspace is your business's home inside LeadsMind — give it a name and logo so it feels like yours.",
        bullets: [
          "Give your workspace a name — this becomes your business name across invoices, quotes, and customer-facing pages.",
          'Upload a logo from Settings → Branding so your documents and support widget carry your branding.',
          'Add your registered company details (legal name, registration number) under Settings → Workspace if you plan to send invoices.',
          'LeadsMind is built for South African businesses, so invoicing defaults to Rand (ZAR).',
        ],
      },
      {
        title: 'Inviting Your Team',
        intro: "Add teammates to your workspace and control what they can see and do with roles and permissions.",
        steps: [
          'Go to Settings → Team.',
          "Click Invite and enter your teammate's email.",
          'Choose a role — Owner, Admin, or Member — to set their overall access level.',
          'Fine-tune specific permissions for that member if you need more granular control.',
          'Your teammate receives an email invitation to join the workspace.',
        ],
      },
      {
        title: 'Quick Start Checklist',
        intro: 'The fastest path from signup to a working LeadsMind workspace.',
        bullets: [
          'Create your account and verify your email',
          'Complete your workspace and business profile',
          'Invite your team and assign roles',
          'Connect your bank account for accounting (optional)',
          'Explore the modules relevant to your business — CRM, Accounting, LMS, Marketing, Automation, and Support',
        ],
      },
    ],
  },
  {
    slug: 'crm-sales',
    label: 'CRM & Sales',
    icon: Target,
    description: 'Manage contacts, run your pipeline, find new leads, and send quotes.',
    articles: [
      {
        title: 'Managing Contacts',
        intro: 'Every person or business you deal with lives in your contact database, with a full history of your interactions.',
        bullets: [
          'Add a contact manually, or let one come in automatically through a form or the Lead Finder.',
          "Edit contact details anytime from the contact's page.",
          'Use tags to segment contacts — for example, "Hot Lead" or "Existing Customer."',
          "Every call, note, task, and email logged against a contact appears in their activity feed, so anyone on your team can see the full history at a glance.",
        ],
      },
      {
        title: 'Pipeline & Deals',
        intro: 'Track every deal from first contact to close with a visual, drag-and-drop sales pipeline.',
        steps: [
          'Create a pipeline and define the stages that match how your business actually sells (e.g. New → Contacted → Proposal → Won).',
          'Add a deal and drag it between stages as it progresses.',
          'Track deal value and expected close date to keep your sales forecast accurate.',
          'Set follow-up tasks and reminders so no deal goes cold.',
        ],
      },
      {
        title: 'Lead Finder',
        intro: 'Discover new prospects without leaving LeadsMind, using the built-in Lead Finder.',
        steps: [
          'Search for businesses by location and category from the Lead Finder map view.',
          'Save promising searches to revisit later.',
          'Add discovered leads straight into your pipeline with one click.',
          "Save leads you're not ready to act on yet to a watchlist to track over time.",
        ],
      },
      {
        title: 'Quotes & Proposals',
        intro: 'Put together professional quotes and proposals for your customers without leaving LeadsMind.',
        steps: [
          'Create a quote or proposal and add your line items.',
          'Share it with your customer, or download it as a PDF.',
          'Convert an accepted quote into an invoice in one click — no need to re-enter line items.',
        ],
      },
      {
        title: 'Forms & Lead Capture',
        intro: 'Capture new leads straight into your CRM with custom forms you can embed anywhere.',
        steps: [
          'Build a form with the fields you need using the form builder.',
          'Embed it on your website, or share it as a link.',
          'Submissions land directly in your contacts and pipeline, ready to follow up on.',
        ],
      },
    ],
  },
  {
    slug: 'accounting-finance',
    label: 'Accounting & Finance',
    icon: Wallet,
    description: 'Invoicing, expenses, bank connections, and your transaction ledger.',
    articles: [
      {
        title: 'Creating Invoices',
        intro: 'Create professional invoices with line items and tax, and keep track of who owes you what.',
        steps: [
          'Create a new invoice and add your line items and applicable tax.',
          'Send it to your customer, or download it as a PDF.',
          'Track its status as draft, sent, paid, or overdue.',
        ],
      },
      {
        title: 'Quotes to Invoices',
        intro: 'Once a customer accepts a quote, turn it into an invoice in a single click — no retyping line items.',
        steps: [
          'Open the accepted quote.',
          'Convert it directly into an invoice, carrying over the line items and totals.',
          'Send the invoice to your customer to collect payment.',
        ],
      },
      {
        title: 'Expense Tracking',
        intro: 'Keep a record of what your business spends, alongside what it earns.',
        steps: [
          'Log an expense with its amount, category, and date.',
          'Attach a receipt or supporting document.',
          'Review your expenses alongside your income for a clear picture of profitability.',
        ],
      },
      {
        title: 'Bank Connections & Reconciliation',
        intro: 'Connect your bank account to bring transactions into LeadsMind and match them against your invoices and expenses.',
        steps: [
          'Connect your bank account from Finance → Connected Accounts.',
          'Imported transactions appear automatically.',
          'Match each transaction to the invoice or expense it belongs to during reconciliation, so your books stay accurate.',
        ],
      },
      {
        title: 'Transaction Ledger & Chart of Accounts',
        intro: 'Every transaction in LeadsMind — invoices, expenses, and bank activity — is recorded in a central ledger organized by a chart of accounts.',
        bullets: [
          'View every recorded transaction in Finance → Transactions.',
          'Transactions are categorized against your chart of accounts, giving you a structured view of where money is coming from and going.',
        ],
        note: "Financial reporting is still being expanded — for now, the transaction ledger is your most reliable, detailed view of your finances.",
      },
    ],
  },
  {
    slug: 'marketing',
    label: 'Marketing',
    icon: PenSquare,
    description: 'Blog, AI-assisted content, funnels, landing pages, and forms.',
    articles: [
      {
        title: 'Blog Management',
        intro: 'Publish and manage blog content directly from LeadsMind, organized with categories and basic SEO fields.',
        steps: [
          'Create a new post from the Blog dashboard.',
          'Organize posts using categories.',
          'Fill in basic SEO fields, like a page title and description, to help your posts get found.',
          "Publish when you're ready — your post goes live on your public blog.",
        ],
      },
      {
        title: 'Content Studio',
        intro: 'Write faster with AI assistance built directly into your content workflow.',
        steps: [
          'Create a new document in Content Studio.',
          'Use the built-in AI writing assistant to draft, rewrite, or expand your content.',
          'Edit and refine before publishing or exporting.',
        ],
      },
      {
        title: 'Funnel Builder',
        intro: 'Build multi-step marketing funnels to guide visitors from landing page to conversion.',
        steps: [
          'Create a new funnel and add the steps you want visitors to move through.',
          "Customize each step's page using the editor.",
          'Publish your funnel and track how visitors move through it.',
        ],
      },
      {
        title: 'Landing Page & Website Editor',
        intro: "Build and publish pages for your business without needing a developer.",
        steps: [
          'Create a new page from the website editor.',
          'Customize the layout, content, and branding.',
          "Publish your page — it's live on your domain.",
        ],
      },
      {
        title: 'Forms Builder',
        intro: 'Build custom forms to capture leads, feedback, or signups anywhere on your site.',
        steps: [
          'Create a form and add the fields you need.',
          'Embed it on a page or funnel, or share it as a standalone link.',
          'Submissions flow directly into your CRM contacts.',
        ],
      },
      {
        title: 'Social Media Posting',
        intro: 'Social media publishing from within LeadsMind is still being expanded.',
        note: 'This feature is still being expanded — for now, treat it as in progress rather than a finished publishing workflow.',
      },
    ],
  },
  {
    slug: 'automation-workflows',
    label: 'Automation & Workflows',
    icon: Zap,
    description: 'Trigger-and-action workflows, form automations, and course automations.',
    articles: [
      {
        title: 'Workflow Builder Overview',
        intro: "LeadsMind's visual workflow builder connects triggers — like a new contact or a form submission — to actions, like sending an email or creating a task.",
        bullets: [
          'A workflow starts with a trigger — something that happens in your business, such as a new lead or a completed form.',
          'From there, you chain together actions such as sending an email, creating a task, or waiting a set amount of time before the next step.',
          'New trigger and action types are being added regularly, so this part of LeadsMind is actively growing.',
        ],
        note: 'The workflow builder is still being expanded — treat this as an introduction to how it works rather than a complete reference of every trigger and action available today.',
      },
      {
        title: 'Form Automations',
        intro: 'Automatically respond to form submissions — for example, sending a confirmation email or creating a follow-up task the moment someone fills out your form.',
        steps: [
          "Open a form's Automations tab.",
          "Set up an automation to run whenever that form is submitted.",
          'Choose what happens next — for example, send a confirmation, notify your team, or create a CRM task.',
        ],
      },
      {
        title: 'Course Automations',
        intro: 'Automatically respond to what happens inside your courses — for example, when a student enrolls or completes a lesson.',
        steps: [
          "Open a course's Automations tab.",
          'Set up an automation tied to a course event, like enrollment or completion.',
          'Choose the resulting action, such as sending a follow-up email.',
        ],
      },
    ],
  },
  {
    slug: 'lms-courses',
    label: 'LMS & Courses',
    icon: BookOpen,
    description: 'Build courses, enroll students, run quizzes, and issue certificates.',
    articles: [
      {
        title: 'Course Builder',
        intro: 'Build courses made up of modules and lessons, with support for different types of media.',
        steps: [
          'Create a course and organize it into modules.',
          'Add lessons to each module, including video, text, or other media.',
          'Arrange modules and lessons in the order students should complete them.',
        ],
      },
      {
        title: 'Enrollment & Checkout',
        intro: "Get students into your course, whether that's a free enrollment or a paid checkout.",
        steps: [
          'Publish your course so it becomes available for enrollment.',
          'Students enroll directly, or pay through the built-in checkout flow for paid courses.',
          'Enrolled students get access to their course in the student portal.',
        ],
      },
      {
        title: 'Quiz Engine',
        intro: 'Test what students have learned with a quiz engine that supports 10 different question types.',
        steps: [
          'Add a quiz to a course module.',
          'Build out your questions, choosing from the available question types.',
          'Set a passing grade if you want to gate progress on quiz results.',
        ],
      },
      {
        title: 'Certificate Generation',
        intro: 'Automatically award a certificate when a student completes your course.',
        steps: [
          'Enable certificates for a course.',
          'When a student finishes, a certificate is generated for them automatically.',
          'Students can download their certificate from the student portal.',
        ],
      },
      {
        title: 'Student Portal & Marketplace',
        intro: 'Students access their enrolled courses from a dedicated student portal, and can discover new courses through the marketplace.',
        bullets: [
          'The student portal is where enrolled students go to continue their courses and access certificates.',
          'The marketplace lists courses available for students to browse and enroll in.',
        ],
        note: 'Detailed progress-tracking features are still being expanded.',
      },
    ],
  },
  {
    slug: 'customer-support',
    label: 'Customer Support',
    icon: MessageSquare,
    description: 'Support tickets, the conversation inbox, LENA, and your support widget.',
    articles: [
      {
        title: 'Support Tickets',
        intro: 'Handle customer support requests as tickets, with replies visible to both your team and the customer.',
        bullets: [
          'A ticket is created when a customer submits a request — for example, through your support widget or a public thread.',
          'Your team replies directly from the ticket view.',
          'Customers can follow the conversation through a public thread link, without needing to log in.',
        ],
      },
      {
        title: 'Conversation Inbox',
        intro: 'See customer conversations from one place, so nothing falls through the cracks.',
        bullets: [
          'Conversations linked to a contact or ticket appear in your inbox.',
          'Assign conversations to team members as needed.',
        ],
      },
      {
        title: 'LENA AI Assistant',
        intro: "LENA is LeadsMind's built-in AI assistant — she can answer support questions, help draft content, and work alongside your team.",
        steps: [
          'Set up support agents in Settings → LENA, including their availability and working hours, so conversations route to the right person.',
          "Customize LENA's appearance and branding to match your business.",
          'Connect a knowledge base so LENA can answer customer questions using your own content.',
          'Get an embed code to add LENA to your website or app.',
        ],
      },
      {
        title: 'Support Widget',
        intro: 'Add an embeddable support widget to your website so customers can reach you without leaving your site.',
        steps: [
          'Customize your welcome message, brand color, and logo from Settings → Support Widget.',
          'Organize incoming requests with departments and categories.',
          'Choose your notification preferences so your team knows when a new request comes in.',
          'Copy the embed code and add it to your website.',
        ],
        note: 'WhatsApp, SMS, and built-in email sending are rolling out as fully supported channels alongside the widget — for now, treat them as in progress.',
      },
    ],
  },
  {
    slug: 'security-data-protection',
    label: 'Security & Data Protection',
    icon: Shield,
    description: "How LeadsMind keeps your workspace and your customers' data separate and protected.",
    articles: [
      {
        title: 'Multi-Tenant Workspace Isolation',
        intro: 'Every business on LeadsMind operates inside its own isolated workspace.',
        bullets: [
          'Your data, your contacts, your financial records, and your team are kept separate from every other business on the platform.',
          "There's no cross-workspace visibility — by design, one business can never see another's data.",
        ],
      },
      {
        title: 'POPIA & Data Protection',
        intro: "LeadsMind is built with South Africa's Protection of Personal Information Act (POPIA) in mind.",
        bullets: [
          "We support data subject rights — for example, a contact can request that their personal information be corrected or erased from your workspace.",
          "We're committed to handling personal information responsibly as the platform grows.",
        ],
      },
      {
        title: 'Data Handling',
        intro: 'We take reasonable steps to keep your business data safe and available.',
        bullets: [
          'If you have specific questions about our data handling practices — such as backups, encryption, or where data is stored — reach out to our team directly so you get an accurate, up-to-date answer rather than a general claim here.',
        ],
      },
    ],
  },
];

export function getDocCategory(slug: string) {
  return docCategories.find((c) => c.slug === slug);
}
