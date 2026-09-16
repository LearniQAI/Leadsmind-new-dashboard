# Builder component footguns — a recurring bug family

Several separate, unrelated-looking bugs found while building the Velocity/Mentor/Ascent/
Archiste templates this cycle turned out to be the same underlying shape: **a shared/base
component has a hardcoded style, an unset-prop fallback, or a default variant that silently wins
over what a template explicitly configured for that node**, with nothing in the template's own
JSON/JSX showing anything is wrong. Each one shipped live and was only caught by rendering the
actual page, not by reading the template source or running `tsc`.

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

4. **Container: `backgroundColor` prop default vs. hand-typed `bg-*` className.** The same
   mechanism as #1 above, but for background color specifically, which
   `validate-container-flex-props.js` didn't check until this was found: `Container.craft.props`
   defaults `backgroundColor` to `'transparent'`, Craft merges that default in for any node that
   doesn't set the prop explicitly, and `getResponsiveStyles()` turns it into a real
   `.node-<id> { background-color: transparent }` rule that wins over an equivalent `bg-white`/
   `bg-slate-100`/`bg-[#...]` class by DOM source order. Found live in Archiste (a hero card
   rendering fully transparent instead of white) and then confirmed already shipping,
   camouflaged by similar-toned surrounding colors, in Ascent (`hero-badge`, `role-card`,
   `road-1/2/3`, `domain-2/3`), `education-lms` (`feat-col-1/2/3`), and Mentor (`hero-badge`,
   `feat-col-1/2/3-iconbox`) — all fixed the same day this was found. Now guarded by the same
   `validate-container-flex-props.js` script (a new `backgroundColor` rule).

   Side finding from a later coverage review of this same rule: the validator only ever scanned
   `src/lib/builder/templates/*.ts` — Blank Slate's `BLANK_PAGE` constant lives one directory up,
   inline in `src/lib/builder/templates.ts`, so it was never actually scanned by rule #1 or #4
   despite being a real, shipped template. (Its one node is a plain ROOT container, exempt from
   the backgroundColor rule anyway, so this wasn't live-exploitable — but the scan gap itself was
   real.) The script now loads and checks `BLANK_PAGE` explicitly as a separate step, verified by
   temporarily injecting a fake violation into it and confirming the script caught it, then
   reverting. Worth remembering if a future validator is added the same way: check where a
   template's `content` actually lives before assuming a single directory glob covers all of
   them — `BUILDER_TEMPLATES` is `[inline blank-slate entry, ...ALL_TEMPLATES]`, not
   one-file-per-template all the way down.

## RenderNode's per-node wrapper vs. cross-node absolute positioning (editor-only)

Not the same bug shape as the four above (nothing here silently loses to a component default —
it's a structural side effect of how the editor renders), but a real limitation worth knowing
before designing a template section around absolute positioning: `RenderNode.tsx` wraps *every*
canvas node in its own `<div class="relative group">` whenever the editor is enabled
(`enabled=true`), which creates a new CSS positioning context between every parent/child pair. A
node that's `position: absolute` and expects to resolve against a *specific ancestor's* box
(e.g. a full-bleed hero image with an absolutely-positioned text overlay, both as separate Craft
nodes) instead resolves against its own immediate RenderNode wrapper — collapsing the intended
overlay while editing. RenderNode skips that wrapper entirely when `!isEnabled`, so the real
published page (and any test rendered with `enabled={false}`) is unaffected — confirmed live on
Archiste's hero (background image + giant wordmark) via both a real narrow viewport and full
desktop width. Same accepted-limitation category as `Viewport.tsx`'s Desktop/Tablet/Mobile
fake-narrow-preview note: not fixable per-template, and a real fix means reworking RenderNode's
wrapping strategy for every template at once, not something to attempt while building one.

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

If a new instance of this pattern turns up, prefer the same response used for the instances
above: fix the shared component (or the call site) once, and add a small grep/lint-style check
under `scripts/` (flag-only, not auto-fixing) so the next template build catches it before a live
audit has to.
