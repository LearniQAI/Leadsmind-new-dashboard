import { describe, it, expect } from "vitest";
import dashboardNav from "@/data/dashboard-nav";
import { filterNavByPermissions, NavRoleContext } from "./filterNavByPermissions";
import { getRequiredModule } from "./deriveRouteMap";
import { canAccessModule } from "@/lib/permissions/modules";

function visible(ctx: NavRoleContext) {
  const modules = filterNavByPermissions(dashboardNav, ctx);
  const links = new Set<string>();
  modules.forEach((module) => {
    // Mirrors NavRailModule.tsx: module.link only renders as a clickable rail entry when the
    // module has no items (e.g. Dashboard). HR & Payroll carries `link: "/hr"` solely for
    // active-state highlighting.
    if (module.link && !module.items) links.add(module.link);
    module.items?.forEach((item) => {
      if (item.link) links.add(item.link);
      item.subItems?.forEach((sub) => links.add(sub.link));
    });
  });
  return { sections: modules.map((m) => m.module), links };
}

const scenarios: Array<[string, string, string[]]> = [
  ["admin", "admin", []],
  ["owner", "owner", []],
  ["member: dashboard + marketing", "member", ["dashboard", "marketing"]],
  ["member: crm only", "member", ["crm"]],
  ["member: hr module", "member", ["dashboard", "hr"]],
  ["hr role, nothing ticked", "hr", ["dashboard"]],
  ["viewer, nothing ticked", "viewer", []],
];

describe("filterNavByPermissions (module-level)", () => {
  it("admin and owner see every section", () => {
    expect(visible({ role: "admin", permissions: [] }).sections).toEqual(dashboardNav.map((m) => m.module));
    expect(visible({ role: "owner", permissions: [] }).sections).toEqual(dashboardNav.map((m) => m.module));
  });

  it("a member sees exactly the sections they were granted (+ Dashboard, + self-service links)", () => {
    const { sections, links } = visible({ role: "member", permissions: ["dashboard", "marketing"] });
    expect(sections).toEqual(["dashboard", "marketing", "learning"]);
    // Courses shows ONLY the student self-service link, never the admin pages.
    expect(links.has("/student")).toBe(true);
    expect(links.has("/courses")).toBe(false);
    for (const hidden of ["/contacts", "/social", "/invoices", "/calendar", "/hr/leave", "/conversations", "/settings"]) {
      expect(links.has(hidden)).toBe(false);
    }
  });

  it("granting a section shows every page in it (CRM & Sales covers Contacts…Automations)", () => {
    const { links } = visible({ role: "member", permissions: ["crm"] });
    for (const l of ["/contacts", "/contacts/tags", "/lead-finder", "/lead-finder/map", "/pipelines", "/quotes", "/tasks", "/projects", "/automations"]) {
      expect(links.has(l)).toBe(true);
    }
  });

  it("Employees needs the hr role even inside a granted HR & Payroll section", () => {
    expect(visible({ role: "member", permissions: ["hr"] }).links.has("/hr/employees")).toBe(false);
    expect(visible({ role: "member", permissions: ["hr"] }).links.has("/hr/leave")).toBe(true);
    expect(visible({ role: "hr", permissions: [] }).links.has("/hr/employees")).toBe(true);
    expect(visible({ role: "member", permissions: ["dashboard"] }).links.has("/hr/leave")).toBe(false);
  });

  it.each(scenarios)("%s: /hr is never a distinct sidebar link", (_l, role, permissions) => {
    expect(visible({ role, permissions }).links.has("/hr")).toBe(false);
  });

  it.each(scenarios)("%s: every visible link is one the page gate also allows (sidebar and gate agree)", (_l, role, permissions) => {
    for (const link of visible({ role, permissions }).links) {
      const module = getRequiredModule(link);
      if (module) expect(canAccessModule(role, permissions, module), link).toBe(true);
    }
  });
});
