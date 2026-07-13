import { NavModule, NavItem } from "@/interface";

export interface NavRoleContext {
  role: string;
  permissions: string[];
}

interface PermissionedEntry {
  link?: string;
  permission?: string;
}

function isItemAllowed(item: PermissionedEntry, ctx: NavRoleContext): boolean {
  if (ctx.role === "admin" || ctx.role === "owner") return true;
  // HR & Payroll base page is allowed for all workspace members
  if (item.link === "/hr") return true;
  const requiredPermission = item.permission;
  if (!requiredPermission) return true;
  return ctx.permissions.includes(requiredPermission);
}

function isSubItemAllowed(sub: { link: string }, ctx: NavRoleContext): boolean {
  if (ctx.role === "admin" || ctx.role === "owner") return true;
  if (sub.link === "/hr/employees") {
    return ctx.role === "admin" || ctx.role === "owner" || ctx.role === "hr";
  }
  if (sub.link === "/hr/payroll") {
    return ctx.role === "admin" || ctx.role === "owner" || ctx.role === "hr" || ctx.role === "payroll";
  }
  return true;
}

export function filterNavByPermissions(modules: NavModule[], ctx: NavRoleContext): NavModule[] {
  return modules
    .map((module): NavModule | null => {
      if (!module.items) {
        // Direct-link module (Dashboard) — gate itself using the item-level rule.
        return isItemAllowed(module, ctx) ? module : null;
      }

      const filteredItems: NavItem[] = module.items
        .filter((item) => isItemAllowed(item, ctx))
        .map((item) =>
          item.subItems
            ? { ...item, subItems: item.subItems.filter((sub) => isSubItemAllowed(sub, ctx)) }
            : item
        );

      if (filteredItems.length === 0) return null;

      return { ...module, items: filteredItems };
    })
    .filter((module): module is NavModule => module !== null);
}
