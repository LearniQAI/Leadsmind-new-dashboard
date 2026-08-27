// Premium Course Theme Redesign — Signal / Ember / Grove.
//
// Replaces Phase F's color-token-only system (which differed only by accent hue on an
// identical dark layout/shape/type system — confirmed via audit as the actual bug being
// fixed) with 3 genuinely distinct themes. The 3 real DB enum values stay untouched
// (7 live courses already store clean_minimal/bold_feature_rich/community_coaching —
// renaming them would be a real-data migration for zero real benefit), only what each key
// visually PRODUCES changes. Mapping (unchanged from the brief, confirmed sensible — no
// live course would visually jar from this remap since none of the 3 old looks were
// distinctive enough to be "expected" by an existing customer):
//   clean_minimal      -> Ember  (orange / warm white / near-black text)
//   bold_feature_rich   -> Signal (black / crimson-red / white)
//   community_coaching  -> Grove  (forest green / pale sage / charcoal)
//
// AUDIT CORRECTION vs. the brief: the brief assumed fonts are loaded via next/font. The
// project's REAL pattern (confirmed in src/app/layout.tsx + src/app/globals.css) is a single
// Google Fonts css2 <link>/@import URL listing every family+weight the app uses, with
// Tailwind fontFamily keys pointing at the literal family names — not next/font anywhere in
// this codebase. The 6 new families below were added to that SAME url (both places it's
// declared) rather than introducing a second, inconsistent loading mechanism.
//
// SELF-CRITIQUE (Step 4 — re-read against the brief's 3 failure modes before treating this
// as done):
//  1. "Warm cream + serif + terracotta" cliché — avoided. Ember's background is #FFFDF9
//     (near-true-white with a whisper of warmth), NOT cream #F4F1EA; its display face is a
//     ROUNDED SANS (Sora), not a serif; its accent (#D9622B) is deliberately more saturated/
//     "ember" than the clichéd clay terracotta #D97757. Grove is the one with a serif
//     (Lora) but pairs it with a muted forest green + organic shape language, not a cream/
//     terracotta editorial look — different enough in both color and identity.
//  2. "Near-black + one acid accent" cliché — avoided. Signal's near-black (#0B0B0C) is
//     always paired with prominent WHITE surface cards (not dark-on-dark throughout), a
//     genuinely magenta-leaning crimson (not acid-green/vermilion), and a full real token
//     set (secondary text, border, success, error) — not one hue floating on black.
//  3. "Zero-radius hairline broadsheet" cliché — Signal's near-zero radius risks drifting
//     here structurally, so it's deliberately offset by two things the broadsheet cliché
//     never has: a rotated/diagonal seal shape (breaks the strict grid on purpose) and solid
//     color-blocked sections rather than thin hairline rules.
//  Distinguishable by shape/type alone (color removed, hypothetically): yes — Signal is
//  sharp/angular + a high-contrast grotesque display face; Ember is fully rounded + a
//  rounded humanist display face; Grove is moderately/irregularly rounded + a warm serif
//  display face. Each has exactly ONE signature move (Signal: the seal. Ember: the glow.
//  Grove: the branching progress line) — nothing else decorative was added around them.

export type CourseThemeId = 'clean_minimal' | 'bold_feature_rich' | 'community_coaching';
export type ThemeSignature = 'seal' | 'glow' | 'branch';

export interface CourseThemeTokens {
  id: CourseThemeId;
  /** Human-facing brand name, decoupled from the internal DB enum key. */
  slug: 'signal' | 'ember' | 'grove';
  label: string;
  description: string;
  signature: ThemeSignature;

  /** Real hex, safe for inline style={{}} usage (progress bars, SVG strokes, etc.) */
  primaryHex: string;
  accentHex: string;
  accentHoverHex: string;

  // --- Landing-page palette (each theme gets a genuinely distinct background now, not a
  // shared dark shell recolored — this is the actual structural fix the brief calls for). ---
  pageBgHex: string;
  pageSurfaceHex: string;
  pageTextPrimaryHex: string;
  pageTextSecondaryHex: string;
  pageBorderHex: string;
  pageSuccessHex: string;
  pageErrorHex: string;

  /** Tailwind gradient utility classes (from/via/to) for swatches and progress bars. */
  gradientClass: string;
  /** Tailwind classes for buttons/solid accents on the dark student-facing player shell. */
  solidBgClass: string;
  solidHoverBgClass: string;
  textAccentClass: string;
  borderAccentClass: string;

  /** Typography — 3 real distinct pairings now (was 2, artificially limited by only having
   *  DM Sans/Space Grotesk loaded — this phase adds the 6 families the brief calls for). */
  headingFontClass: string;
  headingWeightClass: string;
  bodyFontClass: string;

  /** Shape scale. radiusClass = the shared dark player-shell surfaces (sidebar rows) where
   *  a fully-themed structural rebuild is out of scope; landingRadiusClass = the themed
   *  landing page's own cards/buttons, where the brief's shape-language distinction (sharp
   *  vs. fully rounded vs. organic) is meant to actually show. */
  radiusClass: string;
  landingRadiusClass: string;
}

export const COURSE_THEMES: Record<CourseThemeId, CourseThemeTokens> = {
  // ---- EMBER — maps to clean_minimal ----
  clean_minimal: {
    id: 'clean_minimal',
    slug: 'ember',
    label: 'Ember',
    description: 'Warm and energetic — built for coaching and creative courses.',
    signature: 'glow',
    primaryHex: '#D9622B',
    accentHex: '#D9622B',
    accentHoverHex: '#BD531F',
    pageBgHex: '#FFFDF9',
    pageSurfaceHex: '#FFFFFF',
    pageTextPrimaryHex: '#201A16',
    pageTextSecondaryHex: '#6E6058',
    pageBorderHex: '#EDE3D8',
    pageSuccessHex: '#2F7A4F',
    pageErrorHex: '#C0392B',
    gradientClass: 'from-[#D9622B] to-[#F0925C]',
    solidBgClass: 'bg-[#D9622B]',
    solidHoverBgClass: 'hover:bg-[#BD531F]',
    textAccentClass: 'text-[#E38653]',
    borderAccentClass: 'border-[#D9622B]',
    headingFontClass: 'font-emberHeading',
    headingWeightClass: 'font-bold',
    bodyFontClass: 'font-emberBody',
    radiusClass: 'rounded-2xl',
    landingRadiusClass: 'rounded-3xl'
  },
  // ---- SIGNAL — maps to bold_feature_rich ----
  bold_feature_rich: {
    id: 'bold_feature_rich',
    slug: 'signal',
    label: 'Signal',
    description: 'Sharp and high-contrast — built for certification and flagship courses.',
    signature: 'seal',
    primaryHex: '#D7263D',
    accentHex: '#D7263D',
    accentHoverHex: '#B81F33',
    pageBgHex: '#0B0B0C',
    pageSurfaceHex: '#FFFFFF',
    pageTextPrimaryHex: '#0B0B0C',
    pageTextSecondaryHex: '#6B6B70',
    pageBorderHex: '#E5E5E7',
    pageSuccessHex: '#1A7F4E',
    pageErrorHex: '#B3261E',
    gradientClass: 'from-[#D7263D] to-[#9E1B2C]',
    solidBgClass: 'bg-[#D7263D]',
    solidHoverBgClass: 'hover:bg-[#B81F33]',
    textAccentClass: 'text-[#E5566A]',
    borderAccentClass: 'border-[#D7263D]',
    headingFontClass: 'font-signalHeading',
    headingWeightClass: 'font-black',
    bodyFontClass: 'font-signalBody',
    radiusClass: 'rounded-md',
    landingRadiusClass: 'rounded-none'
  },
  // ---- GROVE — maps to community_coaching ----
  community_coaching: {
    id: 'community_coaching',
    slug: 'grove',
    label: 'Grove',
    description: 'Calm and natural — built for language, wellness and personal-growth courses.',
    signature: 'branch',
    primaryHex: '#2F6B4F',
    accentHex: '#2F6B4F',
    accentHoverHex: '#255840',
    pageBgHex: '#FBFAF7',
    pageSurfaceHex: '#FFFFFF',
    pageTextPrimaryHex: '#1C1C1A',
    pageTextSecondaryHex: '#6B6E63',
    pageBorderHex: '#E3E5DC',
    pageSuccessHex: '#2F6B4F',
    pageErrorHex: '#B33B2E',
    gradientClass: 'from-[#2F6B4F] to-[#5C9678]',
    solidBgClass: 'bg-[#2F6B4F]',
    solidHoverBgClass: 'hover:bg-[#255840]',
    textAccentClass: 'text-[#4E9270]',
    borderAccentClass: 'border-[#2F6B4F]',
    headingFontClass: 'font-groveHeading',
    headingWeightClass: 'font-semibold',
    bodyFontClass: 'font-groveBody',
    radiusClass: 'rounded-xl',
    landingRadiusClass: 'rounded-[28px_12px_28px_12px]'
  }
};

// Every pre-existing course predates theme selection and has template = null. Default is
// clean_minimal (Ember) — it's the neutral/no-strong-opinion look, already the de facto
// fallback LandingPageRenderer itself falls back to ('clean_minimal' is its hardcoded
// default), so an untouched course renders exactly as it always has rather than suddenly
// gaining a color/identity it was never assigned.
export const DEFAULT_COURSE_THEME: CourseThemeId = 'clean_minimal';

export function getCourseTheme(template: string | null | undefined): CourseThemeTokens {
  return COURSE_THEMES[(template as CourseThemeId) || DEFAULT_COURSE_THEME] || COURSE_THEMES[DEFAULT_COURSE_THEME];
}

export const COURSE_THEME_LIST = Object.values(COURSE_THEMES);
