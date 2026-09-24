import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// A signed-in user whose workspace_members row is `member` (or null = not a member).
let member: { role: string; permissions: string[] } | null = null;
const lookups: string[] = [];

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }), signOut: vi.fn() },
    from: (table: string) => {
      lookups.push(table);
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({ data: member }),
      };
      return chain;
    },
  }),
}));

import { updateSession } from "./middleware";

function req(path: string, workspace: string | null = "w1") {
  const r = new NextRequest(new URL(`https://leadsmind.io${path}`), { headers: { host: "leadsmind.io" } });
  if (workspace) r.cookies.set("active_workspace_id", workspace);
  return r;
}

function outcome(res: Response) {
  if (res.status === 403) return "api-403";
  const loc = res.headers.get("location");
  if (loc?.includes("access_denied=")) return `redirect:${new URL(loc).searchParams.get("access_denied")}`;
  return "allowed";
}

// One real page and one real API route (where the module has one) per module.
const MODULE_ROUTES: Array<[string, string, string | null]> = [
  ["crm", "/contacts", "/api/crm/x"],
  ["marketing", "/campaigns", "/api/reputation/x"],
  ["social", "/social/inbox", "/api/social/x"],
  ["finance", "/invoices", "/api/finance/x"],
  ["commerce", "/orders", "/api/inventory/x"],
  ["calendar", "/calendar/availability", null],
  ["hr", "/hr/leave", "/api/hr/payroll"],
  ["learning", "/courses/needs-grading", "/api/lms/x"],
  ["communication", "/conversations", null],
  ["settings", "/settings", "/api/settings/api-keys"],
];

beforeEach(() => {
  lookups.length = 0;
});

describe("server-side module gate (middleware), member with Dashboard + Marketing only", () => {
  beforeEach(() => {
    member = { role: "member", permissions: ["dashboard", "marketing"] };
  });

  it.each(MODULE_ROUTES)("%s: page %s and API %s", async (module, page, api) => {
    const expectAllowed = module === "marketing";
    expect(outcome(await updateSession(req(page)))).toBe(expectAllowed ? "allowed" : `redirect:${module}`);
    if (api) expect(outcome(await updateSession(req(api)))).toBe(expectAllowed ? "allowed" : "api-403");
  });

  it("dashboard, self-service and unmapped routes are never gated", async () => {
    for (const p of ["/dashboard", "/student", "/affiliate-portal", "/api/cron/x", "/api/ai/x"]) {
      expect(outcome(await updateSession(req(p)))).toBe("allowed");
    }
  });
});

describe("who is NOT gated", () => {
  it("admin/owner reach every module", async () => {
    for (const role of ["admin", "owner"]) {
      member = { role, permissions: [] };
      for (const [, page, api] of MODULE_ROUTES) {
        expect(outcome(await updateSession(req(page)))).toBe("allowed");
        if (api) expect(outcome(await updateSession(req(api)))).toBe("allowed");
      }
    }
  });

  it("non-members of the active workspace (students, portal clients) fall through to the route's own auth", async () => {
    member = null;
    expect(outcome(await updateSession(req("/api/lms/x")))).toBe("allowed");
    expect(outcome(await updateSession(req("/courses/needs-grading")))).toBe("allowed");
  });

  it("does no membership lookup at all for unmapped routes", async () => {
    member = { role: "member", permissions: [] };
    await updateSession(req("/api/webhooks/stripe"));
    await updateSession(req("/dashboard"));
    expect(lookups).toEqual([]);
  });
});

describe("HR", () => {
  it("hr role reaches HR incl. Employees; a member granted HR gets HR but not Employees", async () => {
    member = { role: "hr", permissions: ["dashboard"] };
    expect(outcome(await updateSession(req("/hr/employees")))).toBe("allowed");
    member = { role: "member", permissions: ["hr"] };
    expect(outcome(await updateSession(req("/hr/leave")))).toBe("allowed");
    expect(outcome(await updateSession(req("/hr/employees")))).toBe("redirect:hr");
  });

  it("a member without HR no longer reaches /hr/* (was open to every member before)", async () => {
    member = { role: "member", permissions: ["dashboard"] };
    expect(outcome(await updateSession(req("/hr/payroll")))).toBe("redirect:hr");
  });
});

describe("legacy permission rows still work (mapped, not denied)", () => {
  it("old 'contacts' key reaches CRM and Chat", async () => {
    member = { role: "member", permissions: ["contacts"] };
    expect(outcome(await updateSession(req("/pipelines")))).toBe("allowed");
    expect(outcome(await updateSession(req("/conversations")))).toBe("allowed");
    expect(outcome(await updateSession(req("/invoices")))).toBe("redirect:finance");
  });
});
