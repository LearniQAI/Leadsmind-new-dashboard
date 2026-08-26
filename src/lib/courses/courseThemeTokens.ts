// Phase F: the single canonical definition of what a course "theme" controls, keyed by the
// 3 real template values already live on courses.landing_page_settings.template
// (clean_minimal, bold_feature_rich, community_coaching). Every surface that needs to look
// like the course's theme — the sales/landing page, the student player, the admin course
// card — imports from here. No component may define its own copy of these colors.
//
// Grounded in the REAL colors the landing page templates already use (found via audit, not
// invented): TemplateBoldFeatureRich.tsx uses the project's existing `accent`/`accent2`
// Tailwind tokens (#2563eb/#3b82f6); TemplateCommunityCoaching.tsx hardcodes #8b5cf6 (the
// `purple` token) and its hover state #7c3aed repeatedly inline; TemplateCleanMinimal.tsx has
// no strong accent at all — it's a neutral slate/gray look. Those three templates are
// refactored in this phase to read from this file instead of their own inline literals.
//
// Font pairing and radius are a genuinely new dimension (no prior per-template distinction
// existed for either) — built from the two font families already loaded project-wide (DM
// Sans, Space Grotesk; see tailwind.config.js `fontFamily`), not a new web-font dependency.
// With only two real families to draw from, true 3-way font-family differentiation isn't
// possible without adding a typeface — differentiated instead by family+weight pairing
// (clean_minimal stays single-voice DM Sans; the other two both pair Space Grotesk headings
// with DM Sans body, differing by weight/tracking) — flagged here rather than silently
// invented as if 3 distinct type families existed.
//
// Structural layout differences (the landing page's 3 templates are structurally distinct
// components) are explicitly OUT of scope for the student player / sidebar — this phase only
// threads color + typography + radius tokens through those surfaces, not a full rebuild.

export type CourseThemeId = 'clean_minimal' | 'bold_feature_rich' | 'community_coaching';

export interface CourseThemeTokens {
  id: CourseThemeId;
  label: string;
  description: string;
  /** Real hex, safe for inline style={{}} usage (progress bars, SVG strokes, etc.) */
  primaryHex: string;
  accentHex: string;
  /** Tailwind gradient utility classes (from/via/to) for swatches and progress bars. */
  gradientClass: string;
  /** Tailwind classes for buttons/solid accents on the dark student-facing shell. */
  solidBgClass: string;
  solidHoverBgClass: string;
  textAccentClass: string;
  borderAccentClass: string;
  /** Typography pairing — see file header for why only 2 real combinations exist. */
  headingFontClass: string;
  headingWeightClass: string;
  /** Card/corner-radius token, used consistently across themed surfaces. */
  radiusClass: string;
}

export const COURSE_THEMES: Record<CourseThemeId, CourseThemeTokens> = {
  clean_minimal: {
    id: 'clean_minimal',
    label: 'Clean / Minimal',
    description: 'A calm, text-first layout for straightforward course pages.',
    primaryHex: '#475569', // slate-600 — the real neutral look TemplateCleanMinimal already has
    accentHex: '#64748b', // slate-500
    gradientClass: 'from-slate-400 to-slate-600',
    solidBgClass: 'bg-slate-600',
    solidHoverBgClass: 'hover:bg-slate-700',
    textAccentClass: 'text-slate-400',
    borderAccentClass: 'border-slate-500',
    headingFontClass: 'font-body',
    headingWeightClass: 'font-semibold',
    radiusClass: 'rounded-lg'
  },
  bold_feature_rich: {
    id: 'bold_feature_rich',
    label: 'Bold / Gradient',
    description: 'High-contrast hero and feature blocks for flagship launches.',
    primaryHex: '#2563eb', // real `accent` token — matches TemplateBoldFeatureRich's actual buttons
    accentHex: '#3b82f6', // real `accent2` token
    gradientClass: 'from-accent to-accent2',
    solidBgClass: 'bg-accent',
    solidHoverBgClass: 'hover:bg-accent2',
    textAccentClass: 'text-accent2',
    borderAccentClass: 'border-accent',
    headingFontClass: 'font-display',
    headingWeightClass: 'font-black',
    radiusClass: 'rounded-2xl'
  },
  community_coaching: {
    id: 'community_coaching',
    label: 'Cohort / Coaching',
    description: 'Community-forward layout built for cohort-based programs.',
    primaryHex: '#8b5cf6', // real `purple` token — matches TemplateCommunityCoaching's literal #8b5cf6
    accentHex: '#7c3aed', // matches its real hover:bg-[#7c3aed]
    gradientClass: 'from-purple to-[#7c3aed]',
    solidBgClass: 'bg-purple',
    solidHoverBgClass: 'hover:bg-[#7c3aed]',
    textAccentClass: 'text-purple',
    borderAccentClass: 'border-purple',
    headingFontClass: 'font-display',
    headingWeightClass: 'font-semibold',
    radiusClass: 'rounded-xl'
  }
};

// Every pre-existing course predates theme selection and has template = null. Default is
// clean_minimal — it's the neutral/no-strong-opinion look, already the de facto fallback
// LandingPageRenderer itself falls back to ('clean_minimal' is its hardcoded default), so an
// untouched course renders exactly as it always has rather than suddenly gaining a color it
// was never assigned.
export const DEFAULT_COURSE_THEME: CourseThemeId = 'clean_minimal';

export function getCourseTheme(template: string | null | undefined): CourseThemeTokens {
  return COURSE_THEMES[(template as CourseThemeId) || DEFAULT_COURSE_THEME] || COURSE_THEMES[DEFAULT_COURSE_THEME];
}

export const COURSE_THEME_LIST = Object.values(COURSE_THEMES);
