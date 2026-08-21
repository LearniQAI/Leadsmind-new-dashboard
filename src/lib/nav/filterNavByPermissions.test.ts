import { describe, it, expect } from "vitest";
import dashboardNav from "@/data/dashboard-nav";
import { filterNavByPermissions, NavRoleContext } from "./filterNavByPermissions";

/**
 * Frozen snapshot of the OLD sidebar-data.ts (pre-restructure), kept only as a fixture
 * for this diff test — the real file has been deleted, this is a historical record of
 * every link/permission/subItem that existed before the rail+sub-nav regrouping.
 */
const OLD_SIDEBAR_DATA = [
  { items: [
    { link: "/dashboard", permission: "dashboard" },
    { link: "/tasks", permission: "dashboard" },
    { link: "/conversations", permission: "contacts" },
  ]},
  { items: [
    { link: "/contacts", permission: "contacts" },
    { link: "/contacts/tags", permission: "contacts" },
    { link: "/lead-finder", permission: "contacts" },
    { link: "/pipelines", permission: "pipelines" },
    { link: "/proposals", permission: "proposals" },
    { link: "/invoices", permission: "invoices" },
    { link: "/quotes", permission: "invoices" },
    { link: "/admin/compliance", permission: "contacts" },
  ]},
  { items: [
    { link: "/calendar", permission: "calendar" },
    { link: "/calendar/waitlist", permission: "calendar" },
    { link: "/calendar/instant-meet", permission: "calendar" },
  ]},
  { items: [
    { link: "/websites", permission: "marketing" },
    { link: "/blog/manage", permission: "marketing" },
    { link: "/ai-studio", permission: "marketing" },
    { link: "/funnels", permission: "marketing" },
    { link: "/campaigns", permission: "marketing" },
    { link: "/segments", permission: "marketing" },
    { link: "/sequences", permission: "marketing" },
    { link: "/sms", permission: "marketing" },
    { link: "/whatsapp-broadcasts", permission: "marketing" },
    { link: "/forms", permission: "marketing" },
    { link: "/social", permission: "marketing" },
    { link: "/reputation", permission: "marketing" },
    { link: "/ads", permission: "marketing" },
  ]},
  { items: [
    { link: "/products", permission: "commerce" },
    { link: "/orders", permission: "commerce" },
    { link: "/shipments", permission: "commerce" },
    { link: "/affiliates", permission: "commerce", subItems: [
      { link: "/affiliates" }, { link: "/affiliate-portal" }, { link: "/affiliate-marketplace" },
    ]},
    { link: "/finance", permission: "commerce", subItems: [
      { link: "/finance" }, { link: "/finance/transactions" }, { link: "/finance/reconciliation" },
      { link: "/finance/connected-accounts" }, { link: "/finance/payment-gateways" },
      { link: "/finance/reports" }, { link: "/finance/expenses" },
      { link: "/finance/credit-notes" }, { link: "/finance/retainers" },
      { link: "/finance/chart-of-accounts" },
    ]},
  ]},
  { items: [
    { link: "/hr", permission: "commerce", subItems: [
      { link: "/hr/employees" }, { link: "/hr/payroll" }, { link: "/hr/leave" }, { link: "/hr/time-tracking" },
    ]},
    { link: "/inventory", permission: "commerce" },
  ]},
  { items: [
    { link: "/projects", permission: "business" },
    { link: "/support", permission: "business" },
    { link: "/articles", permission: "business" },
    { link: "/automations", permission: "automation" },
    { link: "/courses", permission: "learning" },
    { link: "/student", permission: undefined },
    { link: "/courses/certificates", permission: "learning" },
    { link: "/community/forums", permission: "business" },
    { link: "/media", permission: "business" },
  ]},
  { items: [
    { link: "/settings", permission: "settings" },
    { link: "/settings/integrations-hub", permission: "settings" },
    { link: "/settings/developer", permission: "settings" },
    { link: "/settings/lena-chat", permission: "settings" },
  ]},
];

/**
 * Verbatim port of DashBoardSidebar.tsx's OLD inline filtering logic (category/item
 * level lines ~100-113, subItem level lines ~162-171), run against the frozen OLD
 * data above, to diff against the new filterNavByPermissions()+dashboard-nav.ts
 * output. Both sides should produce the identical *set* of visible leaf links for
 * every role/permission combination — the restructure only regroups items into new
 * rail modules, it must not change who can see what.
 */
function oldVisibleLinks(role: string, permissions: string[]): Set<string> {
  const links = new Set<string>();

  OLD_SIDEBAR_DATA.forEach((category) => {
    const filteredItems = category.items.filter((item) => {
      if (role === "admin" || role === "owner") return true;
      if (item.link === "/hr") return true;
      const requiredPermission = item.permission;
      if (!requiredPermission) return true;
      return permissions.includes(requiredPermission);
    });

    filteredItems.forEach((item) => {
      if (item.link) links.add(item.link);
      item.subItems
        ?.filter((sub) => {
          if (role === "admin" || role === "owner") return true;
          if (sub.link === "/hr/employees") return role === "admin" || role === "owner" || role === "hr";
          if (sub.link === "/hr/payroll")
            return role === "admin" || role === "owner" || role === "hr" || role === "payroll";
          return true;
        })
        .forEach((sub) => sub.link && links.add(sub.link));
    });
  });

  return links;
}

function newVisibleLinks(ctx: NavRoleContext): Set<string> {
  const links = new Set<string>();

  filterNavByPermissions(dashboardNav, ctx).forEach((module) => {
    if (module.link) links.add(module.link);
    module.items?.forEach((item) => {
      if (item.link) links.add(item.link);
      item.subItems?.forEach((sub) => links.add(sub.link));
    });
  });

  return links;
}

/**
 * Added by the HR & Payroll / Social nav-promotion change: Connections, Calendar, Inbox, and
 * Analytics are genuinely new pages under the new "social" module (Calendar/Analytics are still
 * placeholder pages for upcoming Task 92/94; Inbox got a real implementation in Task 93 —
 * comment read/reply for Facebook, Instagram, and YouTube), so they don't exist in the frozen
 * OLD_SIDEBAR_DATA snapshot above by design — this isn't a permission regression, it's an
 * intentional addition. Excluded from the parity check below; covered by their own assertion
 * instead.
 */
const NEWLY_ADDED_SOCIAL_ROUTES = new Set([
  "/social/connections",
  "/social/calendar",
  "/social/inbox",
  "/social/analytics",
]);

/**
 * Added by Task 102 (AI Revenue Forecasting): a genuinely new page under the
 * existing Finance > Finance subItems, gated by the same "commerce" permission
 * as the rest of that group — not in the frozen OLD_SIDEBAR_DATA snapshot by
 * design, since it didn't exist yet. Excluded from the parity check below,
 * same treatment as the Social additions above.
 */
const NEWLY_ADDED_FINANCE_ROUTES = new Set([
  "/finance/revenue-forecast",
]);

/**
 * Added by the Content Studio feature: a genuinely new page under the existing
 * Marketing group, gated by the same "marketing" permission as the rest of that
 * group — not in the frozen OLD_SIDEBAR_DATA snapshot by design, since it didn't
 * exist yet. Excluded from the parity check below, same treatment as the Social
 * and Finance additions above.
 */
const NEWLY_ADDED_MARKETING_ROUTES = new Set([
  "/content-studio",
]);

describe("filterNavByPermissions matches the old inline filtering logic exactly", () => {
  const scenarios: Array<[label: string, role: string, permissions: string[]]> = [
    ["admin", "admin", []],
    ["owner", "owner", []],
    ["member with contacts+pipelines only", "member", ["contacts", "pipelines"]],
    ["member with commerce only", "member", ["commerce"]],
    ["member with no permissions at all", "member", []],
    ["hr role", "hr", ["contacts"]],
    ["payroll role", "payroll", []],
    ["member with everything", "member", [
      "dashboard", "contacts", "pipelines", "proposals", "invoices", "calendar",
      "marketing", "commerce", "business", "automation", "learning", "settings",
    ]],
  ];

  it.each(scenarios)("%s sees the identical set of routes (plus the intentionally-added Social pages)", (_label, role, permissions) => {
    const oldLinks = oldVisibleLinks(role, permissions);
    const newLinks = newVisibleLinks({ role, permissions });
    const newLinksExcludingAdditions = [...newLinks].filter(
      (l) =>
        !NEWLY_ADDED_SOCIAL_ROUTES.has(l) &&
        !NEWLY_ADDED_FINANCE_ROUTES.has(l) &&
        !NEWLY_ADDED_MARKETING_ROUTES.has(l)
    );
    expect(newLinksExcludingAdditions.sort()).toEqual([...oldLinks].sort());
  });

  it.each(scenarios)("%s: new Social pages are visible iff /social already was (same 'marketing' permission)", (_label, role, permissions) => {
    const newLinks = newVisibleLinks({ role, permissions });
    const hadSocial = newLinks.has("/social");
    NEWLY_ADDED_SOCIAL_ROUTES.forEach((route) => {
      expect(newLinks.has(route)).toBe(hadSocial);
    });
  });

  it.each(scenarios)("%s: Revenue Forecast is visible iff /finance already was (same 'commerce' permission)", (_label, role, permissions) => {
    const newLinks = newVisibleLinks({ role, permissions });
    const hadFinance = newLinks.has("/finance");
    NEWLY_ADDED_FINANCE_ROUTES.forEach((route) => {
      expect(newLinks.has(route)).toBe(hadFinance);
    });
  });

  it.each(scenarios)("%s: Content Studio is visible iff /ai-studio already was (same 'marketing' permission)", (_label, role, permissions) => {
    const newLinks = newVisibleLinks({ role, permissions });
    const hadMarketing = newLinks.has("/ai-studio");
    NEWLY_ADDED_MARKETING_ROUTES.forEach((route) => {
      expect(newLinks.has(route)).toBe(hadMarketing);
    });
  });
});
