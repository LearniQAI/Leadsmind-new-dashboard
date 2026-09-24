import { NavModule, NavItem } from "@/interface";
import { canAccessModule, isUngatedRoute } from "@/lib/permissions/modules";

export interface NavRoleContext {
  role: string;
  permissions: string[];
}

// Employees is HR-role-restricted inside the HR module (matches DefaultWrapper's page gate):
// having the HR & Payroll module gives the self-service pages (Leave, Time Tracking, own
// payslips); managing employee records additionally needs the hr role.
function isItemAllowed(item: NavItem, ctx: NavRoleContext): boolean {
  if (item.link === "/hr/employees") {
    return ctx.role === "admin" || ctx.role === "owner" || ctx.role === "hr";
  }
  return true;
}

/**
 * Module-level: a section is shown iff the member holds its module (admin/owner hold all),
 * with every page in it. Self-service links (UNGATED_ROUTES, e.g. Student Portal) stay
 * visible inside a section the member otherwise lacks.
 */
export function filterNavByPermissions(modules: NavModule[], ctx: NavRoleContext): NavModule[] {
  return modules
    .map((module): NavModule | null => {
      const granted = canAccessModule(ctx.role, ctx.permissions, module.module);

      if (!module.items) return granted ? module : null;

      const filteredItems: NavItem[] = module.items.filter((item) =>
        granted ? isItemAllowed(item, ctx) : Boolean(item.link && isUngatedRoute(item.link))
      );

      if (filteredItems.length === 0) return null;

      return { ...module, items: filteredItems };
    })
    .filter((module): module is NavModule => module !== null);
}
