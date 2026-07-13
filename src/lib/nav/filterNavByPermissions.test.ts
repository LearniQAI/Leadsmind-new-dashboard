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

  it.each(scenarios)("%s sees the identical set of routes", (_label, role, permissions) => {
    const oldLinks = oldVisibleLinks(role, permissions);
    const newLinks = newVisibleLinks({ role, permissions });
    expect([...newLinks].sort()).toEqual([...oldLinks].sort());
  });
});
