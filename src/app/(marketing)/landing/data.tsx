import type { ElementType } from 'react';
import {
  Target,
  BookOpen,
  Wallet,
  Zap,
  Users,
  CalendarDays,
  MessageSquare,
  PenSquare,
  Layers,
  MapPinned,
  FileText,
  Headphones,
  Search,
  Banknote,
  CreditCard,
  LineChart,
  Landmark,
  GraduationCap,
  Award,
  Store,
  ClipboardCheck,
  Building2,
  Rocket,
} from 'lucide-react';

export const navLinks = [
  { label: 'Modules', href: '#modules' },
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
];

export const stats = [
  { value: 500, suffix: '+', label: 'Businesses' },
  { value: 60, suffix: '+', label: 'Features' },
  { value: 9, suffix: '', label: 'Modules' },
  { value: 99.9, suffix: '%', label: 'Uptime', decimals: 1 },
];

export const trustedLogos = [
  'VANGUARD',
  'NEXUS.AI',
  'TITAN GROUP',
  'velocity.',
  'ORACLE BAY',
  'SAVANNA CO.',
  'KUBERA',
  'ZENITH TRADE',
];

export type ModuleTab = {
  key: string;
  icon: ElementType;
  label: string;
  tag: string;
  headline: string;
  features: string[];
  accent: string;
};

export const moduleTabs: ModuleTab[] = [
  {
    key: 'crm',
    icon: Target,
    label: 'CRM & Sales',
    tag: 'SALES & CRM',
    headline: 'Track every lead from first click to closed deal.',
    features: [
      'Contact management with full activity history',
      'Visual sales pipeline with drag-and-drop',
      'Quote and proposal generator with PDF export',
      'Lead finder with map view',
    ],
    accent: '#4F46E5',
  },
  {
    key: 'lms',
    icon: BookOpen,
    label: 'LMS & Courses',
    tag: 'LEARNING MANAGEMENT',
    headline: 'Build and sell courses without another platform.',
    features: [
      'Full course builder with modules and lessons',
      '10 quiz question types',
      'Automatic certificate generation',
      'Student portal and marketplace',
    ],
    accent: '#7C3AED',
  },
  {
    key: 'accounting',
    icon: Wallet,
    label: 'Accounting',
    tag: 'ACCOUNTING & FINANCE',
    headline: 'Invoice, get paid, and see your numbers — in ZAR.',
    features: [
      'Professional invoices with one-click PDF',
      'PayFast and Stripe payment collection',
      'Expense tracking and bank connections',
      'Financial reports and reconciliation',
    ],
    accent: '#0891B2',
  },
  {
    key: 'automation',
    icon: Zap,
    label: 'Automation',
    tag: 'WORKFLOWS',
    headline: 'Automate the busywork across every module.',
    features: [
      'Visual workflow builder, no code required',
      'Trigger actions across CRM, LMS, and Finance',
      'Scheduled and event-based automations',
      'Pre-built templates for common tasks',
    ],
    accent: '#F59E0B',
  },
  {
    key: 'hr',
    icon: Users,
    label: 'HR & Payroll',
    tag: 'PEOPLE OPERATIONS',
    headline: 'Manage your team without spreadsheets.',
    features: [
      'Employee records and document storage',
      'Leave management and approvals',
      'Payroll runs with payslip generation',
      'Onboarding and offboarding checklists',
    ],
    accent: '#10B981',
  },
  {
    key: 'calendar',
    icon: CalendarDays,
    label: 'Calendar & Booking',
    tag: 'SCHEDULING',
    headline: 'Let clients book time without the back-and-forth.',
    features: [
      'Shareable booking pages per team member',
      'Two-way sync with Google and Outlook',
      'Automated reminders by email and SMS',
      'Team availability and buffer rules',
    ],
    accent: '#4F46E5',
  },
  {
    key: 'communication',
    icon: MessageSquare,
    label: 'Communication',
    tag: 'INBOX',
    headline: 'Every conversation, one unified inbox.',
    features: [
      'WhatsApp, email, and SMS in one place',
      'Shared team inbox with assignment',
      'Canned responses and templates',
      'Full customer conversation history',
    ],
    accent: '#7C3AED',
  },
  {
    key: 'content',
    icon: PenSquare,
    label: 'Content & Marketing',
    tag: 'MARKETING',
    headline: 'Plan, create, and publish without extra tools.',
    features: [
      'Content calendar across channels',
      'AI-assisted drafts with LENA',
      'Email campaign builder',
      'Landing page and form builder',
    ],
    accent: '#0891B2',
  },
];

export const deepFeatures = [
  {
    key: 'crm',
    icon: Target,
    tag: 'SALES & CRM',
    headline: 'Close more deals. Lose fewer leads.',
    body: 'Track every contact, manage your pipeline, send proposals, and follow up automatically — all from your CRM dashboard. Built for the way African sales teams actually work.',
    features: [
      { icon: Users, text: 'Contact management with full activity history' },
      { icon: Layers, text: 'Visual sales pipeline with drag-and-drop' },
      { icon: FileText, text: 'Quote and proposal generator with PDF export' },
      { icon: MapPinned, text: 'Lead finder with map view' },
      { icon: ClipboardCheck, text: 'Form builder for lead capture' },
    ],
    side: 'right' as const,
  },
  {
    key: 'lms',
    icon: BookOpen,
    tag: 'LEARNING MANAGEMENT',
    headline: 'Build courses. Grow your community. Issue certificates.',
    body: 'Create and sell online courses, track student progress, run quizzes, and issue branded certificates — without needing a separate platform.',
    features: [
      { icon: GraduationCap, text: 'Full course builder with modules and lessons' },
      { icon: ClipboardCheck, text: '10 quiz question types' },
      { icon: Award, text: 'Automatic certificate generation' },
      { icon: Store, text: 'Student portal and marketplace' },
      { icon: Zap, text: 'Course automations on enrollment and completion' },
    ],
    side: 'left' as const,
  },
  {
    key: 'accounting',
    icon: Wallet,
    tag: 'ACCOUNTING & FINANCE',
    headline: 'Get paid faster. Know your numbers.',
    body: 'Create professional invoices, accept PayFast and Stripe payments, track expenses, and see your financial health — all in ZAR.',
    features: [
      { icon: FileText, text: 'Professional invoices with one-click PDF' },
      { icon: CreditCard, text: 'PayFast and Stripe payment collection' },
      { icon: Banknote, text: 'Expense tracking and bank connections' },
      { icon: LineChart, text: 'Financial reports and reconciliation' },
      { icon: Landmark, text: 'ZAR throughout — no USD confusion' },
    ],
    side: 'right' as const,
  },
];

export const lenaCapabilities = [
  {
    icon: PenSquare,
    title: 'Content Creation',
    description: 'Generates blog posts, emails, and social content in your brand voice.',
    stat: '10x faster than manual writing',
  },
  {
    icon: Headphones,
    title: 'Customer Support',
    description: 'Handles support tickets with AI responses, escalating when it matters.',
    stat: '72% of tickets resolved automatically',
  },
  {
    icon: Search,
    title: 'Lead Research',
    description: 'Researches and qualifies leads automatically before your team follows up.',
    stat: '3x more qualified leads',
  },
];

export const lenaChat = [
  { from: 'user' as const, text: 'LENA, draft a follow-up email for leads that went cold this month.' },
  { from: 'lena' as const, text: "On it. I've found 14 leads inactive for 30+ days and drafted a personalised re-engagement email for each." },
  { from: 'lena' as const, text: 'Want me to schedule these to send tomorrow at 9am, or review them first?' },
];

export const saCards = [
  {
    icon: Banknote,
    title: 'ZAR Everywhere',
    description: 'No USD confusion. Every invoice, report, and dashboard shows African Rand.',
  },
  {
    icon: CreditCard,
    title: 'PayFast Built In',
    description: 'Accept payments from African customers via PayFast alongside Stripe for international clients.',
  },
  {
    icon: ClipboardCheck,
    title: 'POPIA Compliant',
    description: 'Built with African data protection requirements in mind from the ground up.',
  },
  {
    icon: CalendarDays,
    title: 'SA Dates & Phones',
    description: 'DD/MM/YYYY dates and +27 XX XXX XXXX phone format throughout the platform.',
  },
];

export const steps = [
  {
    icon: Building2,
    title: 'Create Your Workspace',
    description: 'Sign up, set your business name, logo, and invite your team. Your workspace is live in under 2 minutes.',
  },
  {
    icon: Zap,
    title: 'Connect Your Modules',
    description: 'Activate the modules your business needs — CRM, LMS, Accounting, HR, or all of them. Everything connects automatically.',
  },
  {
    icon: Rocket,
    title: 'Grow Your Business',
    description: 'Manage leads, deliver courses, send invoices, automate workflows, and watch your business scale from one dashboard.',
  },
];

export type PricingTier = {
  id: 'spark' | 'rise' | 'surge' | 'infinity' | 'dynasty';
  name: string;
  description: string;
  monthlyPrice: number;
  features: string[];
  cta: string;
  highlighted?: boolean;
};

export const pricingTiers: PricingTier[] = [
  {
    id: 'spark',
    name: 'Spark',
    description: 'For solo entrepreneurs just getting started',
    monthlyPrice: 0,
    features: [
      '1,500 contacts',
      '1 course (LMS)',
      '3 landing pages/funnels',
      'Basic CRM',
      '500 emails/month',
      '3 basic automation flows',
      '1 payment gateway',
    ],
    cta: 'Get Started Free',
  },
  {
    id: 'rise',
    name: 'Rise',
    description: 'For small teams starting to scale',
    monthlyPrice: 199,
    features: [
      '10,000 contacts',
      'Unlimited courses',
      'Unlimited landing pages/funnels',
      'Full CRM',
      'Unlimited email sends',
      'Content Studio AI (50/mo)',
      '1 custom domain',
      'Removes LeadsMind branding',
      '5 payment gateways',
    ],
    cta: 'Start Free Trial',
  },
  {
    id: 'surge',
    name: 'Surge',
    description: 'For growing businesses',
    monthlyPrice: 849,
    features: [
      '25,000 contacts',
      'Everything in Rise',
      'WhatsApp + SMS automation',
      'FB/WhatsApp/IG unified inbox',
      'Unlimited Content Studio AI',
      'Live webinars (500 attendees) + evergreen webinars',
      'Breakout rooms, polls, Q&A',
      '3 custom domains',
      'All payment gateways (global) + affiliate management',
      'Community features',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    id: 'infinity',
    name: 'Infinity',
    description: 'For agencies and established businesses',
    monthlyPrice: 1795,
    features: [
      'Unlimited contacts',
      'Everything in Surge',
      'Live webinars (5,000 attendees)',
      'Unlimited custom domains + wildcard subdomain routing',
      'Partial white-label (removes LeadsMind branding, footer credit remains)',
      'Agency client management, up to 5 sub-workspaces',
      'Up to 25 team members',
      'API access + advanced analytics + priority support',
    ],
    cta: 'Start Free Trial',
  },
  {
    id: 'dynasty',
    name: 'Dynasty',
    description: 'For platforms who resell LeadsMind',
    monthlyPrice: 7999,
    features: [
      'Unlimited contacts, unlimited everything from Infinity',
      'Live webinars (10,000 attendees)',
      'Full white-label (zero LeadsMind branding anywhere)',
      'Custom logo + brand colors',
      'Resell as your own platform',
      'Unlimited sub-workspaces + unlimited team members',
      'Priority support with 24hr SLA',
      'Dedicated onboarding call + custom support URL',
      'Mobile app branding add-on',
    ],
    cta: 'Contact Sales',
  },
];

export const testimonials = [
  {
    quote:
      'We replaced 5 different tools with LeadsMind and cut our software spend by 60%. The CRM and invoicing integration alone saved us hours every week.',
    name: 'Sarah M.',
    title: 'Founder, Marketing Agency — Cape Town',
    initials: 'SM',
  },
  {
    quote:
      'The LMS module let us launch our online training business in a weekend. Our students love the certificate system and we love the ZAR pricing.',
    name: 'David K.',
    title: 'Training Consultant — Johannesburg',
    initials: 'DK',
  },
  {
    quote:
      "Finally a platform that uses PayFast and shows ZAR. No more explaining to clients why their invoice is in USD. LeadsMind just gets Africa.",
    name: 'Thabo N.',
    title: 'Operations Manager — Durban',
    initials: 'TN',
  },
];

export const faqs = [
  {
    q: 'Is LeadsMind built for African businesses?',
    a: 'Yes — ZAR pricing, PayFast integration, POPIA compliance, DD/MM/YYYY dates, and SA phone formats throughout.',
  },
  {
    q: 'Can I replace my current CRM with LeadsMind?',
    a: 'Yes. LeadsMind includes a full CRM with contacts, pipeline, deals, forms, and email campaigns. Most businesses migrate from tools like HubSpot or Pipedrive.',
  },
  {
    q: 'Does LeadsMind support online course creation?',
    a: 'Yes. The LMS module supports full course creation, student enrollment, quizzes, certificates, and a student portal.',
  },
  {
    q: 'What payment methods can I accept from my clients?',
    a: 'PayFast for African payments and Stripe for international clients. Both are built in.',
  },
  {
    q: 'How many users can I add to my workspace?',
    a: 'Starter supports 1 user, Pro supports up to 10, Enterprise supports unlimited users.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes — 14 days free, no credit card required. Full access to all modules during your trial.',
  },
  {
    q: 'Can I white-label LeadsMind for my clients?',
    a: 'Enterprise plan supports custom branding and custom domain.',
  },
  {
    q: 'Is my data safe and POPIA compliant?',
    a: 'Yes. Data is stored securely, workspace-isolated, and built with POPIA requirements in mind.',
  },
];

export const footerLinks = {
  product: [
    { label: 'CRM & Sales', href: '#features' },
    { label: 'LMS & Courses', href: '#features' },
    { label: 'Accounting', href: '#features' },
    { label: 'Automation', href: '#modules' },
    { label: 'HR & Payroll', href: '#modules' },
    { label: 'Calendar & Booking', href: '#modules' },
  ],
  company: [
    { label: 'About', href: '/about' },
    { label: 'Blog', href: '/blog' },
    { label: 'Careers', href: '/careers' },
    { label: 'Press', href: '/press' },
    { label: 'Contact', href: '/contact' },
  ],
  support: [
    { label: 'Documentation', href: '/docs' },
    { label: 'Help Center', href: '/help' },
    { label: 'Status Page', href: '/system' },
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'POPIA Compliance', href: '/privacy-policy' },
  ],
};
