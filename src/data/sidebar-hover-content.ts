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
};

/**
 * Level 2 content, keyed by the sub-item's real `link`. Only CRM & Sales is
 * filled in for this pass (PRD Section 10, staged rollout) — every other
 * module's sub-items are a deliberate follow-up.
 */
export function level1LenaQuestion(moduleLabel: string): string {
  return `What can I do in ${moduleLabel}?`;
}

export function level2LenaQuestion(moduleLabel: string, subItemLabel: string): string {
  return `What is ${subItemLabel} in ${moduleLabel}?`;
}

export const level2Content: Record<string, string> = {
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
};
