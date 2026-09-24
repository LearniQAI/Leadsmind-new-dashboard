import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import dashboardNav from "@/data/dashboard-nav";
import {
  MODULE_KEYS,
  LEGACY_PERMISSION_MAP,
  EXTRA_MODULE_ROUTES,
  MODULE_API_PREFIXES,
  normalizePermissions,
  canAccessModule,
  moduleForApiPath,
} from "./modules";
import { PERMISSION_MODULES } from "./permissionModules";
import { getRequiredModule } from "@/lib/nav/deriveRouteMap";

const ROOT = path.resolve(__dirname, "../../..");
const APP = path.join(ROOT, "src/app");
const MIGRATION = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260929000002_module_permission_enforcement.sql"),
  "utf8"
);

describe("one module list: sidebar ↔ registry ↔ invite modal ↔ database", () => {
  it("every sidebar section has a distinct module key, and together they are exactly MODULE_KEYS", () => {
    const keys = dashboardNav.map((m) => m.module);
    expect(new Set(keys).size).toBe(keys.length);
    expect([...keys].sort()).toEqual([...MODULE_KEYS].sort());
  });

  it("the invite/edit modal list is the sidebar, 1:1, same labels, same order", () => {
    expect(PERMISSION_MODULES.map((m) => [m.id, m.label])).toEqual(
      dashboardNav.map((m) => [m.module, m.label])
    );
  });

  it("the RLS migration knows every module key and every legacy key", () => {
    const allowList = MIGRATION.match(/WHERE k IN \(([^)]*)\)/)?.[1] ?? "";
    for (const k of MODULE_KEYS) expect(allowList).toContain(`'${k}'`);
    for (const legacy of Object.keys(LEGACY_PERMISSION_MAP)) {
      expect(MIGRATION).toContain(`WHEN p = '${legacy}'`);
    }
  });

  it("every module except dashboard owns at least one RLS-gated table", () => {
    for (const k of MODULE_KEYS.filter((k) => k !== "dashboard")) {
      expect(MIGRATION).toMatch(new RegExp(`'\\{[a-z,]*\\b${k}\\b[a-z,]*\\}'`));
    }
  });
});

describe("normalizePermissions / canAccessModule", () => {
  it("maps retired keys, drops unknown values, always includes dashboard", () => {
    expect(normalizePermissions(["contacts", "bogus", "invoices"])).toEqual([
      "dashboard", "crm", "finance", "communication",
    ]);
    expect(normalizePermissions(null)).toEqual(["dashboard"]);
  });

  it("does not re-widen keys that are still valid (marketing ≠ social, commerce ≠ finance)", () => {
    expect(normalizePermissions(["marketing", "commerce"])).toEqual(["dashboard", "marketing", "commerce"]);
  });

  it("admin/owner get everything; hr/payroll roles imply HR; members get exactly what's granted", () => {
    for (const k of MODULE_KEYS) {
      expect(canAccessModule("admin", [], k)).toBe(true);
      expect(canAccessModule("owner", [], k)).toBe(true);
    }
    expect(canAccessModule("hr", [], "hr")).toBe(true);
    expect(canAccessModule("payroll", [], "hr")).toBe(true);
    expect(canAccessModule("hr", [], "finance")).toBe(false);
    expect(canAccessModule("member", ["marketing"], "marketing")).toBe(true);
    expect(canAccessModule("member", ["marketing"], "social")).toBe(false);
    expect(canAccessModule("viewer", [], "crm")).toBe(false);
    expect(canAccessModule("member", [], "dashboard")).toBe(true);
  });
});

describe("page routes resolve to their sidebar section's module", () => {
  it("every sidebar link is gated by the section it sits in (or deliberately ungated)", () => {
    const ungated = new Set(["/student", "/affiliate-portal", "/affiliate-marketplace", "/dashboard"]);
    for (const m of dashboardNav) {
      const links = [
        ...(m.items ? [] : m.link ? [m.link] : []),
        ...(m.items ?? []).flatMap((i) => [i.link, ...(i.subItems ?? []).map((s) => s.link)]),
      ].filter(Boolean) as string[];
      for (const link of links) {
        expect(getRequiredModule(link)).toBe(ungated.has(link) ? null : m.module);
      }
    }
  });

  it.each([
    ["/contacts/abc/edit", "crm"],
    ["/deals/property", "crm"],
    ["/crm/leads", "crm"],
    ["/tasks", "crm"],
    ["/quotes/new", "crm"],
    ["/settings/lena-chat", "communication"],
    ["/settings/team", "settings"],
    ["/hr", "hr"],
    ["/hr/leave", "hr"],
    ["/social/inbox", "social"],
    ["/invoices/123", "finance"],
    ["/admin/compliance", "finance"],
    ["/shipments", "commerce"],
    ["/affiliates", "commerce"],
    ["/calendar/availability", "calendar"],
    ["/community/forums/1", "learning"],
    ["/courses/needs-grading", "learning"],
    ["/blog/manage", "marketing"],
    ["/editor/website/1", "marketing"],
  ])("%s → %s", (route, module) => {
    expect(getRequiredModule(route)).toBe(module);
  });

  it.each(["/blog", "/blog/some-public-post", "/student/courses/1", "/affiliate-portal", "/articles", "/dashboard", "/workspaces/1"])(
    "%s is not module-gated",
    (route) => {
      expect(getRequiredModule(route)).toBeNull();
    }
  );

  it("every off-nav route prefix in the registry is a real app route (no silent drift)", () => {
    for (const route of Object.keys(EXTRA_MODULE_ROUTES)) {
      expect(fs.existsSync(path.join(APP, route)), route).toBe(true);
    }
  });
});

describe("API prefixes", () => {
  it("every gated API prefix is a real route directory", () => {
    for (const prefix of Object.keys(MODULE_API_PREFIXES)) {
      expect(fs.existsSync(path.join(APP, prefix)), prefix).toBe(true);
    }
  });

  it.each([
    ["/api/hr/payroll", "hr"],
    ["/api/finance/reports", "finance"],
    ["/api/lms/x", "learning"],
    ["/api/settings/api-keys", "settings"],
    ["/api/settings/integrations", null],
    ["/api/cron/whatever", null],
    ["/api/webhooks/stripe", null],
  ])("%s → %s", (p, m) => {
    expect(moduleForApiPath(p)).toBe(m);
  });
});
