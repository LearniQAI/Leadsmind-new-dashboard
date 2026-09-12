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
    // Mirrors NavRailModule.tsx: module.link only renders as a clickable rail entry
    // when the module has no items (e.g. Dashboard). HR & Payroll carries `link: "/hr"`
    // solely so /hr resolves for active-state highlighting (see matchActiveNav.test.ts)
    // -- it must not surface as an extra visible sidebar link here.
    if (module.link && !module.items) links.add(module.link);
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

/**
 * Added by the Territory Map feature: a genuinely new page under the existing
 * Contacts > Lead Finder group, gated by the same "contacts" permission as the
 * rest of that group — not in the frozen OLD_SIDEBAR_DATA snapshot by design,
 * since it didn't exist yet. Excluded from the parity check below, same
 * treatment as the Social, Finance, and Marketing additions above.
 */
const NEWLY_ADDED_LEAD_FINDER_ROUTES = new Set([
  "/lead-finder/map",
]);

/**
 * Added by the Task 44 HR foundation build: a genuinely new page under the
 * existing HR & Payroll > HR & Payroll subItems, gated by the same "commerce"
 * permission as the rest of that group — not in the frozen OLD_SIDEBAR_DATA
 * snapshot by design, since it didn't exist yet. Excluded from the parity
 * check below, same treatment as the Social, Finance, Marketing, and Lead
 * Finder additions above.
 */
const NEWLY_ADDED_HR_ROUTES = new Set([
  "/hr/schedules",
]);

/**
 * Task 47: /hr/payroll changed from role-restricted (admin/owner/hr/payroll only) to
 * visible to any workspace member -- the page itself now branches (full payroll-run
 * management for privileged roles, a self-service "my payslips" view for everyone else),
 * so the nav link needs to be reachable by everyone too. Not a new route (it's in the
 * frozen OLD_SIDEBAR_DATA snapshot already, just with the old restricted visibility), so
 * it doesn't fit NEWLY_ADDED_HR_ROUTES conceptually, but gets the same treatment in the
 * parity check below: excluded from the strict old-vs-new comparison, with its own
 * equivalence test instead.
 */
const HR_PAYROLL_NOW_OPEN_TO_ALL = new Set([
  "/hr/payroll",
]);

/**
 * Sub-nav fix: HR & Payroll changed from a single "HR & Payroll" item (linking to /hr)
 * containing 5 subItems, to 5 flat top-level items with no container and no accordion.
 * The container's own /hr link is gone as a nav entry (it was never actually clickable
 * in the old UI either -- NavItemsList intercepts the click on any item that has
 * subItems and toggles expand/collapse instead of navigating) -- /hr itself is still a
 * real page, still reachable via the "← Overview" links already on the HR sub-pages,
 * just no longer a distinct sidebar link. Excluded from the parity check below.
 */
const HR_OVERVIEW_LINK_REMOVED = new Set([
  "/hr",
]);

/**
 * Help Center ("/articles") moved out of the sidebar rail entirely and now lives
 * in the top bar next to the workspace switcher (DashboardHeader.tsx) instead --
 * unlike HR_OVERVIEW_LINK_REMOVED this isn't "no longer a distinct link," it's
 * "no longer part of this nav config at all," so filterNavByPermissions() never
 * sees it and it can't appear in newLinks. Its real access gate (permission:
 * "business") is preserved separately in deriveRouteMap.ts's
 * EXTRA_PERMISSION_ENTRIES, not here -- this set only affects the sidebar-link
 * parity check below.
 */
const HELP_CENTER_MOVED_TO_TOPBAR = new Set([
  "/articles",
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
    // /hr/payroll's visibility itself changed (Task 47), so it's excluded from BOTH
    // sides here -- filtered out of newLinks like the other NEWLY_ADDED_* sets, but
    // also out of oldLinks, since (unlike a brand new route) it already existed in the
    // frozen snapshot with different, role-restricted visibility. Its own equivalence
    // test below covers the real new behavior.
    const oldLinksExcludingChanges = [...oldLinks].filter(
      (l) =>
        !HR_PAYROLL_NOW_OPEN_TO_ALL.has(l) &&
        !HR_OVERVIEW_LINK_REMOVED.has(l) &&
        !HELP_CENTER_MOVED_TO_TOPBAR.has(l)
    );
    const newLinksExcludingAdditions = [...newLinks].filter(
      (l) =>
        !NEWLY_ADDED_SOCIAL_ROUTES.has(l) &&
        !NEWLY_ADDED_FINANCE_ROUTES.has(l) &&
        !NEWLY_ADDED_MARKETING_ROUTES.has(l) &&
        !NEWLY_ADDED_LEAD_FINDER_ROUTES.has(l) &&
        !NEWLY_ADDED_HR_ROUTES.has(l) &&
        !HR_PAYROLL_NOW_OPEN_TO_ALL.has(l)
    );
    expect(newLinksExcludingAdditions.sort()).toEqual(oldLinksExcludingChanges.sort());
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

  it.each(scenarios)("%s: Territory Map is visible iff /lead-finder already was (same 'contacts' permission)", (_label, role, permissions) => {
    const newLinks = newVisibleLinks({ role, permissions });
    const hadLeadFinder = newLinks.has("/lead-finder");
    NEWLY_ADDED_LEAD_FINDER_ROUTES.forEach((route) => {
      expect(newLinks.has(route)).toBe(hadLeadFinder);
    });
  });

  it.each(scenarios)("%s: Schedules is visible iff /hr/leave already was (both open to any workspace member who can see /hr at all, unlike the role-restricted Employees subItem)", (_label, role, permissions) => {
    const newLinks = newVisibleLinks({ role, permissions });
    const hadHrLeave = newLinks.has("/hr/leave");
    NEWLY_ADDED_HR_ROUTES.forEach((route) => {
      expect(newLinks.has(route)).toBe(hadHrLeave);
    });
  });

  it.each(scenarios)("%s: Payroll is visible iff /hr/leave already was (Task 47 -- Payroll is no longer role-restricted, it's open to any workspace member same as Leave/Time Tracking/Schedules; the page itself branches into an admin view or a self-service view)", (_label, role, permissions) => {
    const newLinks = newVisibleLinks({ role, permissions });
    const hadHrLeave = newLinks.has("/hr/leave");
    HR_PAYROLL_NOW_OPEN_TO_ALL.forEach((route) => {
      expect(newLinks.has(route)).toBe(hadHrLeave);
    });
  });

  it.each(scenarios)("%s: /hr is never a distinct sidebar link (sub-nav fix -- HR & Payroll is a flat list, no container item)", (_label, role, permissions) => {
    const newLinks = newVisibleLinks({ role, permissions });
    HR_OVERVIEW_LINK_REMOVED.forEach((route) => {
      expect(newLinks.has(route)).toBe(false);
    });
  });
});
