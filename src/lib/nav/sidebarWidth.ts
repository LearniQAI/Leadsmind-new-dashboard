/**
 * Documentation-only source of truth for the sidebar's pixel widths. Tailwind's
 * static scanner needs full literal class strings (e.g. "lg:w-[208px]") present
 * in each consuming file — a helper that builds the class name via template-literal
 * interpolation would not be picked up at build time. So these constants exist to
 * keep NavRail.tsx / DashBoardSidebar.tsx / DefaultWrapper.tsx numerically in sync
 * by hand, not to generate the class strings themselves.
 */
export const RAIL_COLLAPSED_WIDTH = 72;
export const RAIL_EXPANDED_WIDTH = 208;
export const SUBNAV_WIDTH = 220;
export const RAIL_EXPANDED_WITH_SUBNAV_WIDTH = RAIL_EXPANDED_WIDTH + SUBNAV_WIDTH; // 428
