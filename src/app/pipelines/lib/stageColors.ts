/**
 * Deterministic, order-based pipeline stage color mapping.
 *
 * Replaces the old `colors[stage.position % colors.length]` scheme, which
 * assigned colors purely by an arbitrary position index — the same stage
 * (e.g. "Proposal") could land on a different color depending on how many
 * stages existed or their order. A first pass (2026-07) fixed the
 * determinism but still cycled through four stops (slate/sky/blue/violet),
 * which still read as "an arbitrary rainbow" to a reviewer rather than a
 * deliberate story. This version collapses that down to the three-tier
 * story it's actually meant to tell: early stages are muted/neutral (not
 * yet engaged), everything from the midpoint on reads as the dash-accent
 * blue (active pursuit), and the final stage in the sequence — whatever
 * it's named — always reads as the success green "won" endpoint, matching
 * the delta-pill success convention used elsewhere in the dashboard. Fixed
 * and consistent regardless of stage count or order.
 */
const NEUTRAL_COLOR = "#94A3B8"; // slate-400 — early, not-yet-engaged stages
const ACTIVE_COLOR = "#1359FF"; // dash-accent — mid-pipeline, actively worked
const WON_COLOR = "#10B981"; // success green — the terminal stage only

export interface StageTheme {
  /** Full-strength color for borders, text, and the count badge's foreground. */
  solid: string;
  /** ~5% tint for the column header background. */
  tint: string;
  /** ~12% tint for the count-badge background. */
  badgeBg: string;
}

function withAlpha(hex: string, alpha: number): string {
  const value = parseInt(hex.replace("#", ""), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getStageTheme(index: number, total: number): StageTheme {
  const isFinalStage = total > 1 && index === total - 1;
  const midpoint = Math.ceil((total - 1) / 2);
  const solid = isFinalStage ? WON_COLOR : index < midpoint ? NEUTRAL_COLOR : ACTIVE_COLOR;
  return {
    solid,
    tint: withAlpha(solid, 0.05),
    badgeBg: withAlpha(solid, 0.12),
  };
}
