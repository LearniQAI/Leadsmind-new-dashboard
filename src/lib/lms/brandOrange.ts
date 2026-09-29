// The one orange used for LMS "go" actions (Module Quizzes, Publish quiz). Same brand orange as the Continue
// Learning CTA (#F7941D, hover #E07E0C). Kept as literal class strings so Tailwind's scanner sees them.

export const BRAND_ORANGE = '#F7941D';
export const BRAND_ORANGE_HOVER = '#E07E0C';

/** Solid orange button surface: white text, darker orange on hover, matching focus ring. */
export const ORANGE_ACTION =
  'bg-[#F7941D] text-white hover:bg-[#E07E0C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7941D]/50 focus-visible:ring-offset-2';
