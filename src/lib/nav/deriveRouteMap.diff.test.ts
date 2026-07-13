import { describe, it, expect } from "vitest";
import { getRequiredPermission } from "./deriveRouteMap";

/**
 * Frozen copy of DefaultWrapper.tsx's current hardcoded routeMap (pre-refactor),
 * used only to diff against the newly-derived permission index. Not imported from
 * the real file so this test keeps working even after DefaultWrapper is rewired.
 */
const OLD_ROUTE_MAP: Record<string, string> = {
  "/contacts": "contacts",
  "/conversations": "contacts",
  "/lead-finder": "contacts",
  "/pipelines": "pipelines",
  "/proposals": "proposals",
  "/invoices": "invoices",
  "/quotes": "invoices",
  "/calendar": "calendar",
  "/websites": "marketing",
  "/blog": "marketing",
  "/ai-studio": "marketing",
  "/funnels": "marketing",
  "/campaigns": "marketing",
  "/forms": "marketing",
  "/social": "marketing",
  "/reputation": "marketing",
  "/ads": "marketing",
  "/products": "commerce",
  "/orders": "commerce",
  "/finance": "commerce",
  "/hr": "commerce", // dead in practice — DefaultWrapper's /hr branch returns before routeMap is consulted
  "/inventory": "commerce",
  "/projects": "business",
  "/support": "business",
  "/articles": "business",
  "/community": "business",
  "/media": "business",
  "/automations": "automation",
  "/courses": "learning",
  "/settings": "settings",
  "/tasks": "dashboard",
};

function oldRequiredPermission(pathname: string): string | undefined {
  return Object.entries(OLD_ROUTE_MAP).find(([path]) => pathname.startsWith(path))?.[1];
}

describe("deriveRouteMap vs. old hardcoded routeMap", () => {
  // /hr excluded: dead entry, DefaultWrapper's earlier /hr branch returns before routeMap
  // is consulted. /blog and /community are prefix-only keys with no page at the bare path —
  // tested via their real routes (/blog/manage, /community/forums) instead.
  const oldMapKeys = Object.keys(OLD_ROUTE_MAP).filter((k) => !["/hr", "/blog", "/community"].includes(k));

  it.each(oldMapKeys)("agrees with the old routeMap for %s", (path) => {
    expect(getRequiredPermission(path)).toBe(oldRequiredPermission(path));
  });

  it.each([
    ["/blog/manage", "/blog"],
    ["/community/forums", "/community"],
  ])("agrees with the old routeMap for %s (real route under prefix key %s)", (realRoute, prefixKey) => {
    expect(getRequiredPermission(realRoute)).toBe(oldRequiredPermission(prefixKey));
  });

  it("flags routes that dashboard-nav.ts gates but the OLD routeMap left open", () => {
    // These routes have a permission in sidebar/dashboard-nav data (used to hide/show
    // the nav item) but were NOT present in DefaultWrapper's OLD routeMap, meaning
    // direct-URL access was previously unrestricted regardless of permission.
    // Wiring getRequiredPermission() into DefaultWrapper as-is would newly GATE these.
    const previouslyUngatedButNowGated = [
      "/shipments",
      "/affiliates",
      "/affiliate-portal",
      "/affiliate-marketplace",
      "/admin/compliance",
    ].filter((path) => oldRequiredPermission(path) === undefined && getRequiredPermission(path) !== undefined);

    // This assertion is expected to FAIL today — it documents the drift so it shows
    // up as a loud, named test failure instead of silently changing access behavior.
    expect(previouslyUngatedButNowGated).toEqual([]);
  });
});
