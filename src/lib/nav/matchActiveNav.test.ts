import { describe, it, expect } from "vitest";
import { resolveActiveNav } from "./matchActiveNav";

describe("resolveActiveNav — every inventoried dashboard route resolves to its expected rail module", () => {
  const cases: Array<[route: string, expectedModuleId: string]> = [
    ["/dashboard", "dashboard"],

    ["/contacts", "crm-sales"],
    ["/lead-finder", "crm-sales"],
    ["/pipelines", "crm-sales"],
    ["/proposals", "crm-sales"],
    ["/quotes", "crm-sales"],
    ["/tasks", "crm-sales"],
    ["/projects", "crm-sales"],

    ["/campaigns", "marketing"],
    ["/funnels", "marketing"],
    ["/forms", "marketing"],
    ["/social", "marketing"],
    ["/ads", "marketing"],
    ["/ai-studio", "marketing"],
    ["/reputation", "marketing"],
    ["/websites", "marketing"],
    ["/blog/manage", "marketing"],

    ["/finance", "finance-accounting"],
    ["/finance/transactions", "finance-accounting"],
    ["/finance/reconciliation", "finance-accounting"],
    ["/finance/connected-accounts", "finance-accounting"],
    ["/finance/payment-gateways", "finance-accounting"],
    ["/finance/reports", "finance-accounting"],
    ["/finance/expenses", "finance-accounting"],
    ["/admin/compliance", "finance-accounting"],
    ["/invoices", "finance-accounting"],

    ["/products", "commerce-ops"],
    ["/orders", "commerce-ops"],
    ["/shipments", "commerce-ops"],
    ["/affiliates", "commerce-ops"],
    ["/affiliate-portal", "commerce-ops"],
    ["/affiliate-marketplace", "commerce-ops"],
    ["/inventory", "commerce-ops"],
    ["/hr", "commerce-ops"],
    ["/hr/employees", "commerce-ops"],
    ["/hr/payroll", "commerce-ops"],
    ["/hr/leave", "commerce-ops"],
    ["/hr/time-tracking", "commerce-ops"],
    ["/calendar", "commerce-ops"],
    ["/calendar/waitlist", "commerce-ops"],
    ["/calendar/instant-meet", "commerce-ops"],
    ["/automations", "commerce-ops"],

    ["/courses", "learning"],
    ["/student", "learning"],
    ["/courses/certificates", "learning"],
    ["/community/forums", "learning"],
    ["/media", "learning"],

    ["/conversations", "communication"],
    ["/settings/lena-chat", "communication"],

    ["/settings", "settings"],
    ["/settings/integrations-hub", "settings"],
    ["/settings/developer", "settings"],
    ["/support", "settings"],
    ["/articles", "settings"],
  ];

  it.each(cases)("%s resolves to module %s", (route, expectedModuleId) => {
    expect(resolveActiveNav(route)?.moduleId).toBe(expectedModuleId);
  });

  it("resolves nested pages via prefix matching (e.g. /contacts/123/edit)", () => {
    expect(resolveActiveNav("/contacts/123/edit")?.moduleId).toBe("crm-sales");
    expect(resolveActiveNav("/finance/transactions/txn_123")?.moduleId).toBe("finance-accounting");
  });

  it("does not false-match unrelated routes sharing a prefix string", () => {
    // /calendar must not swallow a hypothetical /calendarish route
    expect(resolveActiveNav("/calendarish")).toBeNull();
    expect(resolveActiveNav("/invoices-templates")).toBeNull();
  });

  it("returns null for routes with no nav entry", () => {
    expect(resolveActiveNav("/auth/signin-basic")).toBeNull();
    expect(resolveActiveNav("/crm")).toBeNull();
  });
});
