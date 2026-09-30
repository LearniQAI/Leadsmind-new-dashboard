// Pure column-count helpers for the Columns block. Kept free of React / Craft imports so
// server code (student lesson flattening, the HTML renderer) can use them without pulling
// @craftjs/core — which calls createContext at module load — into the server bundle.

/** Column count each layout preset lays out per row (the asymmetric splits are 2 columns). */
export const COLUMN_COUNT: Record<string, number> = { '1': 1, '2': 2, '3': 3, '4': 4, '1/3-2/3': 2, '2/3-1/3': 2 };
export const columnCountFor = (layout: string | undefined) => COLUMN_COUNT[layout ?? ''] ?? 2;
