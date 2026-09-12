import {
  Sparkles,
  Settings,
  Layers,
  GraduationCap,
  Wallet,
  Receipt,
  Mail,
  Zap,
  ShieldCheck,
  Share2,
  LucideIcon,
} from 'lucide-react';

export interface CategoryAccentClasses {
  iconBg: string;
  iconBorder: string;
  iconText: string;
  hoverBorder: string;
  hoverText: string;
}

export interface CategoryConfigEntry {
  name: string;
  description: string;
  icon: LucideIcon;
  accent: string;
}

// Order and copy match the live `help_articles_category_check` constraint
// (supabase/migrations/20260826000000_help_articles_add_categories.sql) —
// every category listed there must have an entry here, or its articles
// become unreachable from both the persistent nav tree and the landing page.
export const CATEGORY_CONFIG: CategoryConfigEntry[] = [
  { name: 'Getting Started', description: 'Workspace configuration, bank connections, and voice setups.', icon: Settings, accent: 'accent' },
  { name: 'CRM Foundations', description: 'Pipeline configurations, tagging segments, and lead tracking.', icon: Layers, accent: 'purple' },
  { name: 'LMS Advanced Workflows', description: 'Course building, learner progress, and certification flows.', icon: GraduationCap, accent: 'green' },
  { name: 'Accounting & Finance', description: 'Ledgers, reconciliations, and financial reporting.', icon: Wallet, accent: 'amber' },
  { name: 'Invoicing & Automated Payments', description: 'Invoice generation, payment links, and collection automation.', icon: Receipt, accent: 'pink' },
  { name: 'Email Marketing System', description: 'Campaign building, sequences, and deliverability.', icon: Mail, accent: 'cyan' },
  { name: 'Workflow Automation', description: 'Triggers, conditions, and multi-step automation builders.', icon: Zap, accent: 'orange' },
  { name: 'System Controls & Extensions', description: 'Permissions, integrations, and workspace-wide settings.', icon: ShieldCheck, accent: 'slate' },
  { name: 'Social Media', description: 'Scheduling, publishing, and engagement across channels.', icon: Share2, accent: 'rose' },
  { name: 'AI Tools', description: 'LENA assistant configuration and AI-powered features.', icon: Sparkles, accent: 'indigo' },
];

export const ACCENT_CLASSES: Record<string, CategoryAccentClasses> = {
  accent: { iconBg: 'bg-dash-accent/10', iconBorder: 'border-dash-accent/20', iconText: 'text-dash-accent', hoverBorder: 'hover:border-dash-accent/40', hoverText: 'group-hover:text-dash-accent' },
  purple: { iconBg: 'bg-purple/10', iconBorder: 'border-purple/20', iconText: 'text-purple', hoverBorder: 'hover:border-purple/40', hoverText: 'group-hover:text-purple' },
  green: { iconBg: 'bg-green/10', iconBorder: 'border-green/20', iconText: 'text-green', hoverBorder: 'hover:border-green/40', hoverText: 'group-hover:text-green' },
  amber: { iconBg: 'bg-amber/10', iconBorder: 'border-amber/20', iconText: 'text-amber', hoverBorder: 'hover:border-amber/40', hoverText: 'group-hover:text-amber' },
  pink: { iconBg: 'bg-pink/10', iconBorder: 'border-pink/20', iconText: 'text-pink', hoverBorder: 'hover:border-pink/40', hoverText: 'group-hover:text-pink' },
  cyan: { iconBg: 'bg-cyan/10', iconBorder: 'border-cyan/20', iconText: 'text-cyan', hoverBorder: 'hover:border-cyan/40', hoverText: 'group-hover:text-cyan' },
  orange: { iconBg: 'bg-orange-500/10', iconBorder: 'border-orange-500/20', iconText: 'text-orange-500', hoverBorder: 'hover:border-orange-500/40', hoverText: 'group-hover:text-orange-500' },
  slate: { iconBg: 'bg-slate-500/10', iconBorder: 'border-slate-500/20', iconText: 'text-slate-500', hoverBorder: 'hover:border-slate-500/40', hoverText: 'group-hover:text-slate-500' },
  rose: { iconBg: 'bg-rose-500/10', iconBorder: 'border-rose-500/20', iconText: 'text-rose-500', hoverBorder: 'hover:border-rose-500/40', hoverText: 'group-hover:text-rose-500' },
  indigo: { iconBg: 'bg-indigo-500/10', iconBorder: 'border-indigo-500/20', iconText: 'text-indigo-500', hoverBorder: 'hover:border-indigo-500/40', hoverText: 'group-hover:text-indigo-500' },
};

export interface HelpArticleSummary {
  id: string;
  slug: string;
  title: string;
  body_plain: string;
  category: string;
  last_reviewed_at: string;
}

export interface CategoryWithArticles extends CategoryConfigEntry {
  articles: HelpArticleSummary[];
}

export function groupArticlesByCategory(list: HelpArticleSummary[]): CategoryWithArticles[] {
  return CATEGORY_CONFIG.map((config) => ({
    ...config,
    articles: list.filter((a) => a.category === config.name),
  }));
}
