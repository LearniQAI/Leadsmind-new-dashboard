/**
 * Canonical design tokens for dashboard/landing-page visual parity.
 *
 * Every value below was read out of real landing-page source, not guessed:
 *   - src/app/(marketing)/landing/Hero.tsx
 *   - src/app/(marketing)/landing/Pricing.tsx
 *   - src/app/(marketing)/landing/FinalCTA.tsx
 *   - src/app/(marketing)/landing/motion.tsx
 *   - src/app/(marketing)/landing/landing.css
 *   - src/app/(marketing)/solutions/_components/ModulePageTemplate.tsx
 *   - src/components/pagesUI/apps/home/HomeDashboardClient.tsx (the one dashboard
 *     surface that already independently converged on this language, via its
 *     local CARD / SectionHeader / EmptyState — used here as the proof that these
 *     values work in a dashboard chrome, not just on marketing pages)
 *   - tailwind.config.js, src/app/globals.css
 *
 * Where the landing page itself was inconsistent, this file picks ONE canonical
 * value and says so inline — see the "CONFLICT" notes. Phase 1+ components must
 * import from here, not re-derive similar-looking classes.
 *
 * Explicitly NOT reused: the marketing dark gradient band
 * `linear-gradient(160deg, #0F172A 0%, #1a1060 40%, #0F172A 100%)` (FinalCTA,
 * Pricing's "Pro" card) is a marketing-only signature per prior decision. The
 * dashboard borrows typography/spacing/motion/card-and-button quality — not the
 * dark palette.
 */

// ---------------------------------------------------------------------------
// Type scale
// ---------------------------------------------------------------------------
// Landing uses `font-sans` (DM Sans) for body copy and lets `h1..h6` fall back
// to `font-space` (Space Grotesk) via a global `@layer base` rule
// (landing.css:58-60) rather than tagging every heading with a class. Sizes
// are set ad hoc per section with `clamp()` for hero/section headlines and
// fixed px/Tailwind steps for card-level type. There is no single shared
// scale object on the landing side — this table normalizes what's actually
// used across Hero/Pricing/FinalCTA/ModulePageTemplate into one scale.
export const type = {
  display: {
    // Hero.tsx:65 — page hero H1
    fontFamily: 'display', // Space Grotesk
    fontSize: 'text-4xl sm:text-5xl md:text-7xl', // 36px -> 48px -> 72px
    fontWeight: 'font-bold',
    lineHeight: 'leading-[1.05]',
    tracking: 'tracking-tight',
  },
  h1: {
    // ModulePageTemplate.tsx:91 / FinalCTA.tsx:93 — section-level H1/H2 headline
    fontFamily: 'display',
    fontSize: 'clamp(32px,5vw,60px)', // FinalCTA; ModulePageTemplate hero uses clamp(34px,5vw,56px) — treat as the same step, use 32/5vw/60 as canonical
    fontWeight: 'font-extrabold', // CONFLICT: Hero uses font-bold, Pricing/ModulePageTemplate use font-extrabold — extrabold picked as canonical for headlines, bold reserved for the animated hero word only
    lineHeight: 'leading-tight',
    tracking: 'tracking-[-0.02em]',
  },
  h2: {
    // Pricing.tsx:64, ModulePageTemplate.tsx:154/197 — section headline
    fontFamily: 'display',
    fontSize: 'clamp(26px,3.6vw,38px)',
    fontWeight: 'font-extrabold',
    lineHeight: 'leading-tight',
  },
  h3: {
    // Pricing.tsx:133, ModulePageTemplate.tsx:211 — card title
    fontFamily: 'display',
    fontSize: 'text-xl', // 20px; ModulePageTemplate feature-group card title uses 15px — that's h4/label weight, not h3, see below
    fontWeight: 'font-extrabold',
  },
  h4: {
    // ModulePageTemplate.tsx:172/211 — card-level subhead
    fontFamily: 'display',
    fontSize: 'text-[15px]',
    fontWeight: 'font-bold',
  },
  body: {
    // Hero.tsx:71, Pricing.tsx / ModulePageTemplate paragraph copy
    fontFamily: 'body', // DM Sans
    fontSize: 'text-lg', // 18px for lede paragraphs; 14-15px (text-sm) for card body copy
    lineHeight: 'leading-relaxed',
    color: '#64748B', // slate-500, always applied as !text-[#64748B]
  },
  bodySm: {
    fontFamily: 'body',
    fontSize: 'text-sm', // 14px — card descriptions, feature list items
    lineHeight: 'leading-relaxed',
    color: '#64748B',
  },
  caption: {
    // eyebrows: "Simple Pricing" (Pricing.tsx:61), module eyebrows (ModulePageTemplate.tsx:85/149)
    fontFamily: 'body',
    fontSize: 'text-xs', // 12px
    fontWeight: 'font-bold', // CONFLICT: Pricing pill uses font-bold, ModulePageTemplate eyebrow uses font-bold too but no pill — semantic-bold text, all-caps, wide tracking
    tracking: 'tracking-[0.2em]', // CONFLICT: Pricing pill uses tracking-[0.1em], ModulePageTemplate eyebrows use tracking-[0.2em] — 0.2em picked as canonical since it's used 3x vs 1x
    transform: 'uppercase',
  },
} as const;

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------
// CONFLICT flagged: landing has at least three different card shadow/radius
// combinations in play simultaneously:
//   1. Pricing "standard" tier card: rounded-[24px], border-[#E2E8F0], shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 (Pricing.tsx:119)
//   2. ModulePageTemplate pain/feature cards: rounded-2xl (16px), border-[#E2E8F0], bg-white, p-6, no shadow at all (ModulePageTemplate.tsx:170/210)
//   3. HomeDashboardClient CARD (the dashboard's own already-converged version): rounded-2xl (16px), border-dash-border, shadow-sm hover:shadow-md (HomeDashboardClient.tsx:63)
// Canonical pick: (3), i.e. the dashboard home page's existing CARD — it's the
// lightest-weight of the three (flat by default, shadow only strengthens on
// hover), which suits dense dashboard UI (many cards on screen at once) far
// better than Pricing's heavier marketing-card shadow, and it's already proven
// in a dashboard chrome. 24px radius and Pricing's stronger shadow stay
// marketing-only (hero pricing cards, not reused here).
export const card = {
  radius: 'rounded-2xl', // 16px
  border: '1px solid', // border border-dash-border
  borderColor: 'dash-border', // #E2E8F0
  background: 'bg-white',
  shadow: 'shadow-sm',
  shadowHover: 'hover:shadow-md',
  transition: 'transition-shadow duration-200 motion-reduce:transition-none',
  padding: {
    default: 'p-6', // standalone/marketing-style card body
    header: 'px-5 py-4', // dashboard SectionHeader row, "loud" weight
    headerQuiet: 'px-4 py-3', // dashboard SectionHeader row, "quiet" weight (secondary sections)
  },
} as const;

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------
// CONFLICT flagged: there is no real shared button *system* on the landing
// side today. `src/components/ui/button.tsx` (shadcn/cva) defines generic
// variants (default/outline/secondary/ghost/link/gradient) at h-9/10/11 with
// rounded-md — but every landing usage (Hero, Pricing, FinalCTA,
// ModulePageTemplate) imports that Button and then overrides almost every
// class ad hoc: h-14, px-8, rounded-full or rounded-[14px], custom bg colors,
// custom shadows. The landing "button system" is therefore a set of
// conventions repeated by hand, not a componentized one. This is exactly the
// kind of inconsistency Phase 1 must fix by making these the *real* variants
// instead of propagating the copy-paste pattern into the dashboard too.
// Canonical values extracted from the repeated hand-written pattern:
export const button = {
  height: 'h-14', // 56px, used identically in Hero/FinalCTA/ModulePageTemplate primary CTAs
  heightCompact: 'h-[50px]', // Pricing card CTA — dashboard should standardize on h-11 (44px) for in-app density, see dashboardDesignTokens usage notes
  paddingX: 'px-8',
  radius: 'rounded-[14px]', // CONFLICT: Hero/FinalCTA marketing CTAs use rounded-full (pill), ModulePageTemplate/Pricing card CTAs use rounded-[14px] — 14px picked as canonical for the dashboard (in-app controls read as pills too easily at small sizes; pill stays a marketing-only affordance for hero CTAs)
  fontWeight: 'font-bold',
  fontSize: 'text-base', // 16px primary CTA; text-[15px] on card-embedded buttons
  transition: 'transition-all duration-200',
  variants: {
    primary: {
      background: '#1359FF', // dash accent / brand royal blue — NOT the marketing hero's #FF8D00 orange, which is a marketing-conversion-color choice, not the product's primary action color
      text: '#FFFFFF',
      hover: 'hover:-translate-y-0.5',
      shadow: 'shadow-[0_4px_16px_rgba(19,89,255,0.3)]',
      shadowHover: 'hover:shadow-[0_8px_24px_rgba(19,89,255,0.4)]',
    },
    secondary: {
      background: '#F1F5F9', // slate-100, Pricing.tsx:205
      text: '#0F172A',
      hover: 'hover:bg-[#E2E8F0]',
    },
    ghost: {
      background: 'transparent',
      border: '1px solid rgba(15,23,42,0.15)', // ModulePageTemplate.tsx:121 secondary link style
      text: '#0F172A',
      hover: 'hover:bg-[#0F172A]/5',
    },
    destructive: {
      // Not present anywhere on landing (no destructive action there) — derived
      // from the dashboard's existing `danger` token (#FF3A29, tailwind.config.js:109)
      // applied with the same shape rules as primary.
      background: '#FF3A29',
      text: '#FFFFFF',
      hover: 'hover:bg-[#FF3A29]/90',
    },
  },
} as const;

// ---------------------------------------------------------------------------
// Spacing rhythm
// ---------------------------------------------------------------------------
// Read directly from Tailwind classes in section wrappers, not eyeballed.
export const spacing = {
  sectionPaddingY: 'py-20 md:py-24', // ModulePageTemplate pain/feature-group sections; Pricing uses py-28 for its single hero-weight section — treat py-28 as the "hero section" exception, py-20/24 as the default rhythm
  sectionPaddingYCompact: 'py-20', // ModulePageTemplate "connective" band (no md: bump — it's a single-paragraph band, not a card grid)
  containerPaddingX: 'px-6', // universal, every section
  cardGridGap: 'gap-5', // ModulePageTemplate pain/feature grids; Pricing uses gap-6 for its 3-card pricing grid — treat gap-5 as canonical for dense in-app grids, gap-6 as the marketing-card exception
  headerToContentGap: 'mb-14', // eyebrow+headline block to grid below, ModulePageTemplate.tsx:145/188
  cardInternalStack: 'space-y-2.5', // list items inside a feature card, ModulePageTemplate.tsx:212
} as const;

// ---------------------------------------------------------------------------
// Motion — reuse these constants verbatim, do not invent new durations/eases
// ---------------------------------------------------------------------------
// Source of truth: src/app/(marketing)/landing/motion.tsx (sectionRevealProps /
// SectionReveal) plus the stagger-container patterns repeated in Pricing.tsx
// and ModulePageTemplate.tsx.
export const motion = {
  sectionReveal: {
    initial: { opacity: 0, y: 14 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.12 },
    transition: { duration: 0.55, ease: [0.25, 0.1, 0.25, 1] },
  },
  cardPop: {
    // Pricing.tsx cardPop — used for pricing-tier cards popping in
    hidden: { opacity: 0, y: 48, scale: 0.92 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
  },
  cardItem: {
    // ModulePageTemplate.tsx cardItem — used for grid cards (lighter than cardPop, no scale)
    hidden: { opacity: 0, y: 28 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  },
  staggerContainer: {
    // CONFLICT: stagger timing varies per section — Pricing cards: 0.14s, ModulePageTemplate hero text: 0.12s, ModulePageTemplate section headers: 0.1s, ModulePageTemplate card grids: 0.1s.
    // Canonical pick: 0.1s for dashboard grids/lists (matches the two most common landing values and reads snappier for data-dense UI), 0.14s reserved for hero-weight marketing moments only.
    staggerChildren: 0.1,
    delayChildren: 0.05,
  },
  reducedMotion: 'motion-reduce:transition-none', // already the convention in HomeDashboardClient's CARD — every animated dashboard component must respect prefers-reduced-motion the same way
} as const;

// ---------------------------------------------------------------------------
// Color
// ---------------------------------------------------------------------------
// Dashboard-scoped tokens already exist in tailwind.config.js under `dash.*`
// and are the ones every new component should use (NOT `primary.*`, which
// BrandingProvider recolors per-workspace for white-label branding).
export const color = {
  bg: 'dash-bg', // #FFFFFF
  surface: 'dash-surface', // #F8F9FC — used for icon-tint circles, EmptyState backgrounds
  border: 'dash-border', // #E2E8F0
  text: 'dash-text', // #0F172A
  textMuted: 'dash-textMuted', // #475569 (slate-600, ~7.6:1 on white)
  accent: 'dash-accent', // #1359FF
  success: '#10b981', // green token, tailwind.config.js n/a alias `green`
  danger: '#FF3A29',
  warning: '#FF8A00',
} as const;

// ---------------------------------------------------------------------------
// Iconography
// ---------------------------------------------------------------------------
// Landing is 100% lucide-react (Hero, Pricing, FinalCTA, ModulePageTemplate
// all import from 'lucide-react'; ModulePageTemplate module icons also come
// from the `mod.icon` data source, itself a lucide component). No Font
// Awesome / icomoon usage anywhere on landing, despite both being registered
// as Tailwind font families and despite the OLD dashboard EmptyState
// (src/components/common/EmptyState.tsx) still using `fa-solid` classes —
// that FA usage is exactly the kind of admin-template leftover this whole
// effort is meant to replace. Every new/updated dashboard component must use
// lucide-react exclusively, default stroke width (2), sized via `size={n}` in
// the 12-16px range for inline/label icons and 18-24px for standalone icons.
export const icons = {
  library: 'lucide-react',
  strokeWidth: 2,
  sizeInline: 14, // section header icons, HomeDashboardClient SectionHeader
  sizeStandalone: 20,
} as const;
