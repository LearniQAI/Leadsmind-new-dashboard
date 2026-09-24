import dashboardNav from "@/data/dashboard-nav";
import {
  EXTRA_MODULE_ROUTES,
  isUngatedRoute,
  longestPrefixModule,
  type ModuleKey,
} from "@/lib/permissions/modules";

/**
 * Page route → module index. Every sidebar link belongs to the module of the section it sits
 * in (so granting "CRM & Sales" covers Contacts, Pipelines, Quotes, ... alike), plus the
 * off-nav sibling routes in EXTRA_MODULE_ROUTES.
 *
 * Previously /shipments, /affiliates and /admin/compliance were deliberately left ungated
 * for direct-URL access even though the nav hid them. Module-level permissions now gate them
 * like every other page in their section; only the self-service routes in UNGATED_ROUTES
 * (student view, affiliate portal/marketplace, dashboard, help articles) stay open.
 */
function buildModuleIndex(): Array<[string, ModuleKey]> {
  const entries: Array<[string, ModuleKey]> = Object.entries(EXTRA_MODULE_ROUTES);

  dashboardNav.forEach((module) => {
    if (module.link) entries.push([module.link, module.module]);
    module.items?.forEach((item) => {
      if (item.link) entries.push([item.link, module.module]);
      item.subItems?.forEach((sub) => entries.push([sub.link, module.module]));
    });
  });

  return entries;
}

const moduleIndex = buildModuleIndex();

/** The module a page route belongs to, or null when the route isn't module-gated. */
export function getRequiredModule(pathname: string): ModuleKey | null {
  if (isUngatedRoute(pathname)) return null;
  return longestPrefixModule(pathname, moduleIndex);
}
