"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverContent = React.forwardRef<
 React.ElementRef<typeof PopoverPrimitive.Content>,
 React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
 <PopoverPrimitive.Portal>
  <PopoverPrimitive.Content
   ref={ref}
   align={align}
   sideOffset={sideOffset}
   className={cn(
    // `bg-popover`/`text-popover-foreground` are shadcn defaults for a CSS
    // variable pair (--popover/--popover-foreground) this app never defines
    // (it uses its own `dash-*` tokens, see tailwind.config.js) — those
    // classes compile to nothing, so any caller that doesn't override them
    // renders a fully transparent, borderless panel with the page bleeding
    // through it. Several callers (AssigneePicker, ColorPicker) already
    // work around this by passing explicit `bg-white` in their own
    // className; this makes that the real default instead of an opt-in fix.
    "z-[1100] w-72 rounded-xl border border-dash-border bg-white p-4 !text-dash-text shadow-xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
    className
   )}
   {...props}
  />
 </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent }
