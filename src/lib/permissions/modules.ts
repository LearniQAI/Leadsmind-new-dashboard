/**
 * Module permission registry — the single source of truth for "which modules exist and what
 * granting one means".
 *
 * The module LIST itself is not duplicated here: every top-level entry in
 * src/data/dashboard-nav.ts carries a `module` key, and the sidebar, the page-access gate
 * (middleware + DefaultWrapper) and the Team invite / edit-member modals all read that one
 * array. This file adds only what the nav can't express:
 *   - the canonical key set + a type for it (checked against the nav by modules.test.ts),
 *   - route prefixes that belong to a module but aren't sidebar links (/deals, /hr, ...),
 *   - API prefixes that belong to a module,
 *   - the mapping from the old, finer-grained permission keys,
 *   - role implications (admin/owner = everything, hr/payroll roles imply HR & Payroll).
 *
 * The same module sets are enforced in the database by public.module_denied_workspaces()
 * and the "module_access" RESTRICTIVE RLS policies
 * (supabase/migrations/20260929000002_module_permission_enforcement.sql). If you add a module
 * here, add its tables there too.
 *
 * Grant semantics are module-level: granting "crm" grants every page under CRM & Sales
 * (Contacts, Tags, Lead Finder, Pipelines, Quotes, Tasks, Projects, Automations).
 */

export const MODULE_KEYS = [
  'dashboard',
  'crm',
  'marketing',
  'social',
  'finance',
  'commerce',
  'calendar',
  'hr',
  'learning',
  'communication',
  'settings',
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

const MODULE_KEY_SET = new Set<string>(MODULE_KEYS);

export function isModuleKey(value: unknown): value is ModuleKey {
  return typeof value === 'string' && MODULE_KEY_SET.has(value);
}

/** Dashboard is every member's landing page; it can't be revoked (its widgets are still
 * filtered by the per-module RLS on the data they read). */
export const ALWAYS_GRANTED: readonly ModuleKey[] = ['dashboard'];

/**
 * Old permission keys (pre-2026-09-29 invite modal) that no longer exist → the module keys
 * covering the pages they used to gate. Mirrors public.expand_module_permissions().
 *
 * "marketing" and "commerce" were also old keys, with wider old meanings (old marketing also
 * gated Social; old commerce also gated Finance). Because they're still valid keys, they are
 * NOT re-expanded here — the one-time backfill in the migration widened stored rows instead.
 */
export const LEGACY_PERMISSION_MAP: Record<string, ModuleKey[]> = {
  contacts: ['crm', 'communication'], // Contacts/Tags/Lead Finder + Chat
  pipelines: ['crm'],
  invoices: ['crm', 'finance'], // Quotes + Invoices
  automation: ['crm'],
  business: ['learning'], // Community + Media Center (Projects/Support were the rest)
};

/** Roles that bypass module permissions entirely. */
export function hasFullAccess(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'admin';
}

/** Roles whose job implies a module even if the checkbox wasn't ticked. */
export function roleImpliedModules(role: string | null | undefined): ModuleKey[] {
  if (role === 'hr' || role === 'payroll') return ['hr'];
  return [];
}

/** Maps legacy keys, drops unknown values, always includes the always-granted modules. */
export function normalizePermissions(input: unknown): ModuleKey[] {
  const out = new Set<ModuleKey>(ALWAYS_GRANTED);
  if (Array.isArray(input)) {
    for (const raw of input) {
      if (isModuleKey(raw)) out.add(raw);
      else if (typeof raw === 'string' && LEGACY_PERMISSION_MAP[raw]) {
        LEGACY_PERMISSION_MAP[raw].forEach((k) => out.add(k));
      }
    }
  }
  return MODULE_KEYS.filter((k) => out.has(k));
}

export function canAccessModule(
  role: string | null | undefined,
  permissions: unknown,
  module: ModuleKey
): boolean {
  if (hasFullAccess(role)) return true;
  if (ALWAYS_GRANTED.includes(module)) return true;
  if (roleImpliedModules(role).includes(module)) return true;
  return normalizePermissions(permissions).includes(module);
}

/**
 * Page routes that belong to a module but aren't (all) sidebar links. Nav links are added
 * automatically by moduleForPath(); these only extend coverage to sibling pages.
 */
export const EXTRA_MODULE_ROUTES: Record<string, ModuleKey> = {
  '/crm': 'crm',
  '/deals': 'crm',
  '/activities': 'crm',
  '/editor': 'marketing',
  '/blog/analytics': 'marketing',
  '/blog/editor': 'marketing',
  '/blog/new': 'marketing',
  '/blog/comments': 'marketing',
  '/community': 'learning',
  '/hr': 'hr',
  '/workspace/team': 'settings',
  '/admin/dead-letters': 'settings',
  '/admin/message-delivery': 'settings',
};

/**
 * Routes under a gated prefix that stay open to every member: self-service surfaces that
 * aren't module administration (a member's own student view, their own affiliate earnings).
 */
export const UNGATED_ROUTES: readonly string[] = [
  '/student',
  '/affiliate-portal',
  '/affiliate-marketplace',
  '/dashboard',
  '/articles',
];

/** API route prefixes that belong to a module. Anything not listed is not module-gated
 * (shared infra such as /api/ai, /api/meet, /api/lena, webhooks, cron, public endpoints). */
export const MODULE_API_PREFIXES: Record<string, ModuleKey> = {
  '/api/crm': 'crm',
  '/api/automation': 'crm',
  '/api/ads': 'marketing',
  '/api/blog': 'marketing',
  '/api/builder': 'marketing',
  '/api/content-studio': 'marketing',
  '/api/reputation': 'marketing',
  '/api/social': 'social',
  '/api/finance': 'finance',
  '/api/inventory': 'commerce',
  '/api/hr': 'hr',
  '/api/courses': 'learning',
  '/api/lms': 'learning',
  '/api/audio': 'learning',
  '/api/video': 'learning',
  '/api/settings/api-keys': 'settings',
  '/api/settings/webhooks': 'settings',
  '/api/domains': 'settings',
};

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Longest-prefix match of `pathname` against a prefix → module table. */
export function longestPrefixModule(
  pathname: string,
  table: Array<[string, ModuleKey]>
): ModuleKey | null {
  let best: [string, ModuleKey] | null = null;
  for (const entry of table) {
    if (matchesPrefix(pathname, entry[0]) && (!best || entry[0].length > best[0].length)) {
      best = entry;
    }
  }
  return best ? best[1] : null;
}

export function moduleForApiPath(pathname: string): ModuleKey | null {
  return longestPrefixModule(pathname, Object.entries(MODULE_API_PREFIXES));
}

export function isUngatedRoute(pathname: string): boolean {
  return UNGATED_ROUTES.some((p) => matchesPrefix(pathname, p));
}
