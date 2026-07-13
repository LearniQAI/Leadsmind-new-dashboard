import dashboardNav from "@/data/dashboard-nav";

interface PermissionEntry {
  link: string;
  permission?: string;
}

/**
 * These routes carry a `permission` in dashboard-nav.ts (used to hide them from the
 * nav for unauthorized roles) but were never gated for direct-URL access in the old
 * DefaultWrapper.tsx routeMap. Confirmed with the user to preserve that — deriving
 * the access gate from the nav permission would newly lock these off for roles that
 * can reach them today. Nav-level hiding (filterNavByPermissions.ts) is unaffected.
 */
const PAGE_ACCESS_UNGATED = new Set([
  "/shipments",
  "/affiliates",
  "/affiliate-portal",
  "/affiliate-marketplace",
  "/admin/compliance",
]);

function buildPermissionIndex(): PermissionEntry[] {
  const entries: PermissionEntry[] = [];

  dashboardNav.forEach((module) => {
    if (module.link) {
      entries.push({ link: module.link, permission: module.permission });
    }

    module.items?.forEach((item) => {
      if (item.link) {
        entries.push({
          link: item.link,
          permission: PAGE_ACCESS_UNGATED.has(item.link) ? undefined : item.permission,
        });
      }
      item.subItems?.forEach((sub) => {
        entries.push({
          link: sub.link,
          permission: PAGE_ACCESS_UNGATED.has(sub.link) ? undefined : sub.permission ?? item.permission,
        });
      });
    });
  });

  return entries.sort((a, b) => b.link.length - a.link.length);
}

const permissionIndex = buildPermissionIndex();

export function getRequiredPermission(pathname: string): string | undefined {
  const match = permissionIndex.find(
    (entry) => pathname === entry.link || pathname.startsWith(`${entry.link}/`)
  );
  return match?.permission;
}
