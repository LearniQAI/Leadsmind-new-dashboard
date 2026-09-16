# Builder component footguns — a recurring bug family

Three separate, unrelated-looking bugs found while building the Velocity/Mentor/Ascent
templates this cycle turned out to be the same underlying shape: **a shared/base component has
a hardcoded style, an unset-prop fallback, or a default variant that silently wins over what a
template explicitly configured for that node**, with nothing in the template's own JSON/JSX
showing anything is wrong. Each one shipped live and was only caught by rendering the actual
page, not by reading the template source or running `tsc`.

Known instances so far:

1. **Container: structured props vs. hand-typed `className`.** `Container.tsx` has two
   parallel, equal-priority ways to control flex/grid layout — a free-text `className` and
   structured props (`display`, `flexDirection`, `justifyContent`, `alignItems`) that get
   compiled into a real injected `<style>` rule. Authoring a flex/grid Tailwind class without the
   matching structured prop lets `Container.craft.props`' defaults (`display: 'block'`, etc.)
   silently collapse the intended layout. Guarded by
   `scripts/validate-container-flex-props.js` (`npm run validate:templates`).

2. **Heading: a hardcoded `w-full` on the wrapper element.** `Heading.tsx` unconditionally
   appends `w-full` to its wrapper `<div>`'s className, which can silently win over a
   width-constraining class a template author added to the same element, depending on Tailwind's
   generated CSS order — not something visible from the template's own source.

3. **Button: shadcn's unset-`variant` fallback.** `components/ui/button.tsx`'s `<Button>`
   falls back to its `default` variant (Tailwind class `bg-primary`) whenever no `variant` prop
   is passed. `BrandingProvider` (`app/layout.tsx`) injects a global
   `.bg-primary { background-color: ...; !important }` rule for white-label branding, which then
   silently overrides any inline `backgroundColor`/`color` a builder component set for itself —
   invisible in any test that isn't authenticated with real workspace branding data. Shipped in
   `UserButton`, `PricingTable`, `Form`, `WebinarRegistration`, `WebinarThankYou`, `OrderForm`,
   and `OfferWidgetBase` simultaneously. Guarded by `scripts/validate-button-variant.js`
   (`npm run validate:buttons`).

## The pattern to watch for

When wiring a new template node (or a new shared `builder/user/*.tsx` component) against
another component that:
- has its own `.craft.props` defaults,
- hardcodes a class/style unconditionally, or
- silently falls back to *something* when a prop is left unset (a variant, a size, a color),

check whether the template's own explicit value for that same visual property can actually lose
to that fallback — and specifically check it **live**, in the real rendered page, not just by
reading the JSON/JSX side by side. A template and a component can each look correct in isolation
and still produce the wrong render together.

If a new instance of this pattern turns up, prefer the same response used for the three above:
fix the shared component (or the call site) once, and add a small grep/lint-style check under
`scripts/` (flag-only, not auto-fixing) so the next template build catches it before a live
audit has to.
