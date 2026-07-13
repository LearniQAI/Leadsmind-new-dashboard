import dashboardNav from "@/data/dashboard-nav";

interface FlatNavEntry {
  moduleId: string;
  itemId?: number;
  link: string;
}

function buildFlatIndex(): FlatNavEntry[] {
  const entries: FlatNavEntry[] = [];

  dashboardNav.forEach((module) => {
    if (module.link) {
      entries.push({ moduleId: module.id, link: module.link });
    }

    module.items?.forEach((item) => {
      if (item.link) {
        entries.push({ moduleId: module.id, itemId: item.id, link: item.link });
      }
      item.subItems?.forEach((sub) => {
        entries.push({ moduleId: module.id, itemId: item.id, link: sub.link });
      });
    });
  });

  return entries.sort((a, b) => b.link.length - a.link.length);
}

const flatNavIndex = buildFlatIndex();

export interface ActiveNav {
  moduleId: string;
  itemId?: number;
}

export function resolveActiveNav(pathname: string): ActiveNav | null {
  const match = flatNavIndex.find(
    (entry) => pathname === entry.link || pathname.startsWith(`${entry.link}/`)
  );

  if (!match) return null;

  return { moduleId: match.moduleId, itemId: match.itemId };
}

export function __getFlatNavIndexForTesting(): FlatNavEntry[] {
  return flatNavIndex;
}
