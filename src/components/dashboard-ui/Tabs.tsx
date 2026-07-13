"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

/**
 * Dashboard-styled tabs — underline style, extends the existing Radix Tabs
 * root/content from @/components/ui/tabs (re-exported unstyled since they
 * need no restyle) rather than duplicating Radix logic.
 */
export const DashTabs = TabsPrimitive.Root;

export const DashTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn("h-auto bg-transparent p-0 gap-6 border-b border-dash-border rounded-none inline-flex", className)}
    {...props}
  />
));
DashTabsList.displayName = "DashTabsList";

export const DashTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 text-sm font-bold !text-dash-textMuted shadow-none transition-colors motion-reduce:transition-none data-[state=active]:border-dash-accent data-[state=active]:!text-dash-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
));
DashTabsTrigger.displayName = "DashTabsTrigger";

export const DashTabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent", className)}
    {...props}
  />
));
DashTabsContent.displayName = "DashTabsContent";
