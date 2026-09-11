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
  // HR & Payroll is now a flat list (no subItems), so its per-page role gating lives here
  // rather than in isSubItemAllowed. Employees stays HR-role-restricted, matching
  // DefaultWrapper's page-level gate; every other /hr/* page is open to any workspace
  // member (Payroll's own page branches into an admin view or a self-service view, see
  // src/app/hr/payroll/page.tsx).
  if (item.link === "/hr/employees") {
    return ctx.role === "hr";
  }
  if (item.link?.startsWith("/hr")) return true;
  const requiredPermission = item.permission;
  if (!requiredPermission) return true;
  return ctx.permissions.includes(requiredPermission);
}

// No subItems-level role restrictions remain (HR & Payroll's were the only ones and moved
// to isItemAllowed above once it became a flat list) -- kept as a named predicate so a
// future module's subItems can add one without re-deriving the filter shape.
function isSubItemAllowed(_sub: { link: string }, _ctx: NavRoleContext): boolean {
  return true;
}

export function filterNavByPermissions(modules: NavModule[], ctx: NavRoleContext): NavModule[] {
  return modules
    .map((module): NavModule | null => {
      if (!module.items) {
        // Direct-link module (Dashboard, Help Center) — gate itself using the item-level rule.
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
