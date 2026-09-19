// Shared visual foundation for the funnel-step utility templates (see funnelStepLayout.ts for
// the structural shell). One place for the values that used to drift per-template: accent
// colour, card padding, page-title style, brand strip, and the picker category.

export const FUNNEL_STEP_CATEGORY = 'Funnel Steps';

// The set's single accent (deep indigo, #4338CA). One fixed value so a funnel assembled from several of
// these steps reads as one brand; every button, badge and icon accent reads it from here. The placeholder
// SVGs in public/web-templates/funnel-steps/ hardcode the same hue, so update them together.
export const FUNNEL_STEP_ACCENT = '#4338ca';

// Card padding for every widget card in the set (was 32 on form/offer cards, 48 on thank-you cards).
export const FUNNEL_STEP_CARD_PADDING = 40;

// Page title above a card. Weight matches the in-card headings of ThankYou/WebinarThankYou
// (font-black); size sits just above their fixed 24px because those components can't be changed here.
export const FUNNEL_STEP_HEADING_PROPS = {
  level: 'h1',
  fontSize: 28,
  fontWeight: 'black',
  textAlign: 'center',
  color: '#111827',
} as const;

export const FUNNEL_STEP_BRAND_STRIP_ID = 'funnel-brand';

// Text wordmark only - no links, no Navbar: a nav would give visitors a way out of a
// single-action step. Edit the text (or swap in an image) per funnel.
export function funnelStepBrandStrip(): Record<string, any> {
  return {
    [FUNNEL_STEP_BRAND_STRIP_ID]: {
      type: { resolvedName: 'Paragraph' },
      props: {
        text: 'YOUR BRAND',
        fontSize: 13,
        fontWeight: 'black',
        textAlign: 'center',
        color: FUNNEL_STEP_ACCENT,
        letterSpacing: 3,
      },
      parent: 'ROOT',
    },
  };
}
