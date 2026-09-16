import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Global premium button system (Systeme.io-parity pass). Real bug fixes folded in while
// touching this file, same undefined-token family diagnosed in dropdown-menu.tsx/select.tsx/
// tooltip.tsx: `ring-ring`, `ring-offset-background`, `border-input`, `bg-background`,
// `bg-destructive`, `text-destructive-foreground`, and `bg-accent`/`text-accent-foreground`
// (on this admin-light component specifically — `accent` resolves to the dark-shell blue,
// wrong context here) were never defined anywhere in tailwind.config.js — those classes
// compiled to nothing, so `outline`/`destructive` were partially unstyled and, worse, there
// was NO real keyboard focus ring anywhere a plain `<Button>` was used. Fixed to real,
// already-defined tokens (dash-* for the light admin surfaces this component is mostly used
// on, `red` for destructive, matching the rest of the app's real design tokens).
const buttonVariants = cva(
 "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all motion-reduce:transition-none whitespace-nowrap [&_svg]:pointer-events-none [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]",
 {
  variants: {
   // WARNING: any component that renders <Button> with its OWN inline backgroundColor/color
   // style (a template-configured color, not this design system's) MUST pass an explicit
   // `variant="unstyled"` (see that variant's comment below) — omitting `variant` silently falls
   // back to `default`'s `bg-primary` class below, which BrandingProvider's global
   // `.bg-primary { ... !important }` white-label rule can then hijack, overriding the inline
   // style regardless of specificity. This shipped live in Velocity/Mentor/Ascent's buttons,
   // Mentor's pricing-table CTAs, and every form's submit button before being caught and fixed —
   // `npm run validate:buttons` (scripts/validate-button-variant.js) now flags any new <Button>
   // usage in builder/user/*.tsx with no explicit `variant`, but it can't judge which variant is
   // *correct*, only that one must be chosen on purpose.
   variant: {
    default: "bg-primary text-white hover:bg-primary/90 shadow-sm hover:shadow-md",
    destructive: "bg-red text-white hover:bg-red/90 shadow-sm hover:shadow-md",
    outline: "border border-dash-border bg-white !text-dash-text hover:bg-dash-surface",
    secondary: "bg-secondary text-white hover:bg-secondary/90 shadow-sm hover:shadow-md",
    ghost: "!text-dash-textMuted hover:bg-dash-surface hover:!text-dash-text",
    link: "text-primary underline-offset-4 hover:underline",
    gradient: "bg-gradientPrimary text-white hover:opacity-90 transition-opacity",
    gradientAccent: "bg-gradientAccent text-white hover:opacity-90 transition-opacity",
    // No bg-*/text-* classes at all — for callers (site/funnel builder's UserButton) that fully
    // own background/text/border color themselves via inline `style`. Every other variant above
    // carries a themed Tailwind class (bg-primary, bg-red, !text-dash-text, ...) that a global
    // `!important` rule can target — BrandingProvider injects `.bg-primary { ... !important }`
    // site-wide for white-label branding, which then silently overrides any inline
    // background-color a caller set, no matter how specific, because `!important` in an author
    // stylesheet always beats a plain inline style. Keeping this variant's class list empty
    // means there's never a themed class in the DOM for such a rule to latch onto.
    unstyled: "",
   },
   size: {
    // "Default" and "small" — a primary action and a row-level trigger don't share a type
    // scale. Icon sized via [&_svg] so a leading Lucide icon scales with the button, not
    // just the label text.
    default: "h-11 px-6 text-[13px] [&_svg]:size-4",
    sm: "h-9 px-4 text-[11px] [&_svg]:size-3.5",
    lg: "h-12 px-8 text-sm [&_svg]:size-[18px]",
    icon: "h-10 w-10 p-0 [&_svg]:size-4",
    "icon-sm": "h-8 w-8 p-0 [&_svg]:size-3.5",
   },
  },
  defaultVariants: {
   variant: "default",
   size: "default",
  },
 }
)

export interface ButtonProps
 extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
 asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
 ({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
   <Comp
    className={cn(buttonVariants({ variant, size, className }))}
    ref={ref}
    {...props}
   />
  )
 }
)
Button.displayName = "Button"

export { Button, buttonVariants }
