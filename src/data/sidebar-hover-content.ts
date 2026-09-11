/**
 * Content manifest for the sidebar hover panels (Level 1 = top-level module,
 * Level 2 = sub-item inside an open module panel). Same hands-on, manually-
 * authored-per-key pattern the PRD asks for (PRD_Sidebar_Hover_Panels.md
 * Section 6.2) — no page-manifest system exists yet anywhere else in this
 * codebase to plug into (confirmed by audit), so this is a small, standalone
 * lookup table, not a second copy of a bigger system.
 *
 * Keys:
 * - Level 1 keys are `NavModule.id` from src/data/dashboard-nav.ts.
 * - Level 2 keys are the sub-item's real `link` (stable, unique) from the
 *   same file's `NavItem.link`.
 *
 * Quick actions are ONLY ever a real, existing route already reachable
 * elsewhere in the app — verified against real page files before being
 * added here. A module with no obvious real quick action just has none;
 * nothing here is invented to fill a slot.
 */

export interface HoverQuickAction {
  label: string;
  /** lucide-react icon name, rendered by the hover card component. */
  icon: 'Plus' | 'FileText' | 'Send' | 'Calendar' | 'Zap' | 'Kanban' | 'PenSquare';
  href: string;
}

export interface Level1Content {
  description: string;
  quickActions?: HoverQuickAction[];
}

export const level1Content: Record<string, Level1Content> = {
  dashboard: {
    description: 'Your business at a glance — recent activity, key numbers, and what needs your attention today, all in one place.',
    quickActions: [
      { label: 'New Lead', icon: 'Plus', href: '/contacts/new' },
    ],
  },
  'crm-sales': {
    description: 'Manage every contact, deal, and sales workflow in one place — from first lead to closed deal.',
    // These 5 are the exact real, live quick actions from the Dashboard's own
    // top bar (src/components/pagesUI/apps/home/HomeDashboardClient.tsx) —
    // the closest real equivalent to a "CRM & Sales dashboard" top bar, since
    // CRM & Sales itself has no dedicated page (it's flyout-only in the nav).
    // "New Lead" is left off here since it's Dashboard's own card above.
    quickActions: [
      { label: 'New Invoice', icon: 'FileText', href: '/invoices/new' },
      { label: 'Send Campaign', icon: 'Send', href: '/campaigns' },
      { label: 'Book Appointment', icon: 'Calendar', href: '/calendar' },
      { label: 'New Automation', icon: 'Zap', href: '/automations' },
      { label: 'New Proposal', icon: 'PenSquare', href: '/proposals' },
    ],
  },
  marketing: {
    description: 'Reach your audience and grow your business — campaigns, funnels, forms, ads, and content, all from one place.',
    quickActions: [
      { label: 'New Sequence', icon: 'Send', href: '/sequences/new' },
    ],
  },
  social: {
    description: 'Plan, post, and track your social media — schedule posts, manage all your connected accounts, and see what’s working.',
    quickActions: [
      { label: 'Compose Post', icon: 'PenSquare', href: '/social' },
    ],
  },
  'finance-accounting': {
    description: 'Your books, invoices, and money in one place — track revenue, send invoices, and stay on top of your finances.',
    quickActions: [
      { label: 'New Invoice', icon: 'FileText', href: '/invoices/new' },
    ],
  },
  'commerce-ops': {
    description: 'Manage what you sell and how it gets to customers — products, orders, shipments, affiliates, and inventory.',
  },
  'calendar-meetings': {
    description: 'Book appointments, manage your schedule, and run meetings — every time-related tool your business needs, in one place.',
    quickActions: [
      { label: 'Book Appointment', icon: 'Calendar', href: '/calendar' },
    ],
  },
  'hr-payroll': {
    description: 'Manage your team — employees, schedules, payroll, leave, and time tracking, all in one place.',
  },
  learning: {
    description: 'Build and sell online courses — create lessons, manage students, and hand out certificates.',
  },
  communication: {
    description: 'Chat with your team and customers, and get help from LENA, your AI assistant, whenever you need it.',
  },
  settings: {
    description: 'Configure your workspace — account settings, integrations, developer tools, and support.',
  },
  'help-center': {
    description: 'Search verified help articles and step-by-step guides for using LeadsMind — the same real content LENA answers from.',
  },
};

export function level1LenaQuestion(moduleLabel: string): string {
  return `What can I do in ${moduleLabel}?`;
}

export function level2LenaQuestion(moduleLabel: string, subItemLabel: string): string {
  return `What is ${subItemLabel} in ${moduleLabel}?`;
}

/**
 * Level 2 content, keyed by the sub-item's real `link`, sourced directly
 * from src/data/dashboard-nav.ts. Covers every flyout-based module's
 * top-level sub-items — Dashboard and Help Center are direct-link modules
 * with no `items`, so they correctly have none here. Affiliates' own nested `subItems`
 * (Management / Affiliate Portal / Program Marketplace) are a third level
 * not covered by this feature — same as every other module sits at Level 2
 * only, no deeper.
 */
export const level2Content: Record<string, string> = {
  // CRM & Sales
  '/contacts': 'Every person and business you’re in touch with, in one list.',
  '/contacts/tags': 'Label contacts and deals so you can filter and group them your way.',
  '/lead-finder': 'Search for and add new potential leads to your CRM.',
  '/lead-finder/map': 'See where your leads and customers are located, on a map — useful for spotting patterns and planning field visits.',
  '/pipelines': 'Track deals as they move from first contact through to closed.',
  '/proposals': 'Create and send proposals to prospects, and track when they’re viewed.',
  '/quotes': 'Send price quotes and track their status.',
  '/tasks': 'Your to-do list for follow-ups, calls, and reminders tied to a contact or deal.',
  '/projects': 'Manage work for a client after the deal is won.',
  '/automations': 'Set up rules that act automatically — like sending a follow-up when a lead goes quiet.',

  // Marketing
  '/campaigns': 'Send email, SMS, or WhatsApp campaigns to your contacts and track how they perform.',
  '/segments': 'Group your contacts by shared traits so you can target the right people with the right message.',
  '/sequences': 'Set up a series of emails that send automatically over time, like a welcome series for new leads.',
  '/sms': 'Send text messages to a group of contacts at once.',
  '/whatsapp-broadcasts': 'Send a WhatsApp message to many contacts at once, the same way you’d message a customer directly.',
  '/funnels': 'Build step-by-step landing pages that guide a visitor toward booking, buying, or signing up.',
  '/forms': 'Create forms to capture leads from your website or landing pages.',
  '/ads': 'Manage and track your paid ad campaigns.',
  '/ai-studio': 'Use AI to generate marketing copy, images, and content ideas.',
  '/content-studio': 'Plan, write, and organize your marketing content in one place.',
  '/reputation': 'Track and respond to customer reviews across the places people leave them.',
  '/websites': 'Build and manage the websites and landing pages for your business.',
  '/blog/manage': 'Write and publish blog posts to attract visitors and improve your search ranking.',

  // Social
  '/social': 'Write and schedule a post to go out across your connected social accounts.',
  '/social/connections': 'Connect your social media accounts so you can post and manage them from here.',
  '/social/calendar': 'See all your scheduled and published social posts on a calendar.',
  '/social/inbox': 'Reply to comments and messages from your social accounts, all in one place.',
  '/social/analytics': 'See how your social posts are performing — reach, engagement, and growth.',

  // Finance & Accounting
  '/finance': 'A snapshot of your business finances — revenue, expenses, and cash flow at a glance.',
  '/finance/revenue-forecast': 'See a projection of your future revenue based on your current numbers.',
  '/finance/transactions': 'Every money movement in and out of your business, in one list.',
  '/finance/reconciliation': 'Match your recorded transactions against your bank statement to make sure everything lines up.',
  '/invoices': 'Create, send, and track invoices, and see which ones are paid, due, or overdue.',
  '/finance/credit-notes': 'Issue a credit note to reverse or adjust an invoice you’ve already sent.',
  '/finance/retainers': 'Manage upfront client payments that get drawn down against future work.',
  '/finance/connected-accounts': 'Link your bank accounts so transactions flow in automatically.',
  '/finance/payment-gateways': 'Set up how you accept payments from customers, like card or EFT.',
  '/finance/chart-of-accounts': 'The full list of accounts used to categorize your business’s income and expenses.',
  '/finance/expenses': 'Track and categorize what your business spends money on.',
  '/finance/reports': 'Generate financial reports like profit & loss, balance sheet, and more.',
  '/admin/compliance': 'Keep track of the tax and regulatory requirements your business needs to stay on top of.',

  // Commerce & Ops
  '/products': 'Manage the products you sell — pricing, descriptions, and stock.',
  '/orders': 'See and manage every order placed by your customers.',
  '/shipments': 'Track and manage the delivery of orders to customers.',
  '/affiliates': 'Manage people who promote your business and earn a commission for referrals.',
  '/inventory': 'Keep track of how much stock you have on hand across your products.',

  // Calendar & Meetings
  '/calendar': 'See and manage your bookings, appointments, and schedule.',
  '/calendar/waitlist': 'Manage customers waiting for a slot to open up when your calendar is fully booked.',
  '/calendar/instant-meet': 'Start an instant video meeting with a customer or team member, no scheduling needed.',

  // HR & Payroll
  '/hr/employees': 'Manage your team’s profiles, roles, and employment details.',
  '/hr/schedules': 'Plan and manage your employees’ work schedules and shifts.',
  '/hr/payroll': 'Run payroll and manage what your employees get paid.',
  '/hr/leave': 'Track and approve employee leave and time-off requests.',
  '/hr/time-tracking': 'See the hours your employees have logged and worked.',

  // Courses
  '/courses': 'Create and manage the online courses you sell to students.',
  '/student': 'The area where your students log in to access their enrolled courses.',
  '/courses/certificates': 'Manage the certificates students earn for completing a course.',
  '/community/forums': 'A discussion space where your students can ask questions and connect with each other.',
  '/media': 'Store and manage the videos, images, and files used in your courses.',

  // Communication
  '/conversations': 'Message your team and customers directly, all in one inbox.',
  '/settings/lena-chat': 'Configure LENA, your AI assistant — its knowledge base and how it appears to visitors.',

  // Settings
  '/settings': 'Manage your workspace’s account details, branding, and general preferences.',
  '/settings/integrations-hub': 'Connect LeadsMind to other tools and services you use.',
  '/settings/developer': 'Access API keys and developer tools to build custom integrations.',
  '/support': 'Get help from the LeadsMind support team.',
};
