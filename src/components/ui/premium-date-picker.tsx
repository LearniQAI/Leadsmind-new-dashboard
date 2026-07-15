'use client';

import * as React from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format, isToday, formatDistanceToNow, addDays, isAfter } from 'date-fns';

export function PremiumDatePicker({
  date,
  setDate,
  label = "ASSIGN TIMELINE",
  fieldLabel = "Deadline",
  disabled = false,
  variant = "dark"
}: {
  date?: Date,
  setDate: (date?: Date) => void,
  label?: string,
  /** Field label shown above the trigger. Only used by `variant="light"` —
   *  the dark variant keeps its existing hardcoded "DEADLINE" for every
   *  pre-existing caller so their appearance doesn't change. */
  fieldLabel?: string,
  disabled?: boolean,
  /** "light" opts into the dash-* light theme for new call sites (e.g. the
   *  Create Task modal) without altering the default dark styling every
   *  other existing consumer of this shared component still relies on. */
  variant?: "dark" | "light",
}) {
  const isLight = variant === "light";

  const getRelativeString = () => {
    if (!date) return isLight ? "Set due date" : label;
    if (isToday(date)) return isLight ? "Today" : "TODAY";

    const distance = formatDistanceToNow(date, { addSuffix: true });
    return isLight ? distance : distance.toUpperCase();
  };

  const getLabelColor = () => {
    if (!date) return isLight ? "!text-dash-textMuted" : "text-[#4a5a82]";
    if (isToday(date)) return "text-amber";
    return isLight ? "text-dash-accent" : "text-accent2";
  };

  if (isLight) {
    return (
      <div className="space-y-3">
        <label className="text-[12px] font-bold !text-dash-textMuted">{fieldLabel}</label>
        <Popover>
          <PopoverTrigger asChild disabled={disabled}>
            <button
              type="button"
              className="flex h-11 w-full items-center justify-start rounded-xl border border-dash-border bg-white px-3.5 text-left transition-colors motion-reduce:transition-none hover:border-dash-accent/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CalendarIcon className="mr-2.5 h-4 w-4 !text-dash-textMuted" />
              <div className="flex flex-col items-start leading-none gap-0.5">
                <span className={cn("text-[13px] font-semibold", date ? "!text-dash-text" : "!text-dash-textMuted")}>
                  {date ? format(date, "MMM d, yyyy") : "Set due date"}
                </span>
                {date && (
                  <span className={cn("text-[11px] font-medium", getLabelColor())}>{getRelativeString()}</span>
                )}
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-white border-dash-border shadow-xl z-[2500] rounded-2xl">
            <DayPicker
              mode="single"
              selected={date}
              onSelect={setDate}
              showOutsideDays
              className="p-3"
              classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4",
                month_caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-bold !text-dash-text",
                nav: "space-x-1 flex items-center",
                button_previous: cn(
                  buttonVariants({ variant: "ghost" }),
                  "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100 !text-dash-textMuted absolute left-1"
                ),
                button_next: cn(
                  buttonVariants({ variant: "ghost" }),
                  "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100 !text-dash-textMuted absolute right-1"
                ),
                month_grid: "w-full border-collapse space-y-1",
                weekdays: "flex",
                weekday: "!text-dash-textMuted rounded-md w-9 font-bold text-[10px] text-center",
                week: "flex w-full mt-2",
                day: cn(
                  buttonVariants({ variant: "ghost" }),
                  "h-9 w-9 p-0 font-normal aria-selected:opacity-100 !text-dash-text hover:bg-dash-accent/10 text-center rounded-lg"
                ),
                day_button: "h-9 w-9 p-0 font-normal w-full h-full",
                selected: "!bg-dash-accent !text-white hover:!bg-dash-accent focus:!bg-dash-accent",
                today: "bg-dash-accent/10 !text-dash-accent font-bold",
                outside: "day-outside !text-dash-textMuted opacity-40",
                disabled: "!text-dash-textMuted opacity-30",
                hidden: "invisible",
              }}
              components={{
                Chevron: ({ orientation }) => orientation === 'left' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />,
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="text-[10px] font-bold uppercase tracking-[0.6px] text-[#4a5a82] font-dm-sans">
        DEADLINE
      </label>
      <Popover>
        <PopoverTrigger asChild disabled={disabled}>
          <button
            className={cn(
              "flex h-12 w-full items-center justify-start rounded-xl border border-white/10 bg-[#0B132C]/95 backdrop-blur-[8px] px-4 py-2 text-left transition-all duration-300 hover:border-[#2563eb]/50 disabled:opacity-50 disabled:cursor-not-allowed",
              !date && "text-[#4a5a82]"
            )}
          >
            <CalendarIcon className="mr-3 h-3.5 w-3.5 text-[#2563eb]" />
            <div className="flex flex-col items-start leading-none">
              <span className={cn("text-[9px] font-black tracking-widest uppercase", getLabelColor())}>
                {getRelativeString()}
              </span>
              {date && (
                <span className="text-xs font-bold text-white font-space-grotesk mt-0.5">
                  {format(date, "MMM dd, yyyy")}
                </span>
              )}
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-[#0B132C] border-white/10 backdrop-blur-2xl shadow-2xl z-[2500] rounded-2xl">
          <DayPicker
            mode="single"
            selected={date}
            onSelect={setDate}
            showOutsideDays
            className="p-3 font-dm-sans"
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-4",
              month_caption: "flex justify-center pt-1 relative items-center",
              caption_label: "text-sm font-black uppercase tracking-widest text-white/90",
              nav: "space-x-1 flex items-center",
              button_previous: cn(
                buttonVariants({ variant: "ghost" }),
                "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-white absolute left-1"
              ),
              button_next: cn(
                buttonVariants({ variant: "ghost" }),
                "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-white absolute right-1"
              ),
              month_grid: "w-full border-collapse space-y-1",
              weekdays: "flex",
              weekday: "text-[#4a5a82] rounded-md w-9 font-black uppercase text-[10px] tracking-widest text-center",
              week: "flex w-full mt-2",
              day: cn(
                buttonVariants({ variant: "ghost" }),
                "h-9 w-9 p-0 font-normal aria-selected:opacity-100 text-white/60 hover:bg-[#2563eb]/20 hover:text-white text-center rounded-lg"
              ),
              day_button: "h-9 w-9 p-0 font-normal w-full h-full font-space-grotesk",
              selected: "bg-[#2563eb] text-white hover:bg-[#2563eb] hover:text-white focus:bg-[#2563eb] focus:text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]",
              today: "bg-white/10 text-[#2563eb] font-black",
              outside: "day-outside text-white/10 opacity-50 aria-selected:bg-white/5 aria-selected:text-white/20 aria-selected:opacity-30",
              disabled: "text-white/10 opacity-50",
              hidden: "invisible",
            }}
            components={{
              Chevron: ({ orientation }) => orientation === 'left' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />,
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
