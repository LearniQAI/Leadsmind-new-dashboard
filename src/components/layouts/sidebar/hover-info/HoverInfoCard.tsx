"use client";
import React from "react";
import Link from "next/link";
import { Plus, FileText, Send, Calendar, Zap, Kanban, PenSquare, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashCard } from "@/components/dashboard-ui";
import { askLena } from "@/lib/lena/askLena";
import { HoverQuickAction } from "@/data/sidebar-hover-content";

const ACTION_ICONS = { Plus, FileText, Send, Calendar, Zap, Kanban, PenSquare } as const;

export interface HoverInfoCardProps {
  level: 1 | 2;
  /** FontAwesome/icomoon class string, same as the sidebar's own NavItem.icon. */
  icon: string;
  title: string;
  description: string;
  quickActions?: HoverQuickAction[];
  lenaQuestion: string;
  /** Shown as a small close (X) button — only rendered for the tap-to-pin (touch) case. */
  onRequestClose?: () => void;
}

const HoverInfoCard: React.FC<HoverInfoCardProps> = ({
  level,
  icon,
  title,
  description,
  quickActions,
  lenaQuestion,
  onRequestClose,
}) => {
  return (
    <DashCard
      interactive={false}
      className={cn("overflow-hidden", level === 1 ? "w-[290px]" : "w-[260px]")}
      style={{ boxShadow: "0 16px 40px rgba(15, 23, 42, 0.18)" }}
    >
      <div className="flex items-start gap-3 px-4 pt-4 pb-1.5">
        <div
          className={cn(
            "flex items-center justify-center rounded-lg shrink-0",
            level === 1 ? "w-9 h-9 bg-dash-accent/10 text-dash-accent" : "w-7 h-7 bg-dash-surface !text-dash-textMuted"
          )}
        >
          <i className={cn(icon, level === 1 ? "text-[15px]" : "text-[12px]")} />
        </div>
        <h4
          className={cn(
            "min-w-0 flex-1 font-bold !text-dash-text pt-0.5 truncate",
            level === 1 ? "text-[13.5px]" : "text-[12.5px]"
          )}
        >
          {title}
        </h4>
        {onRequestClose && (
          <button
            type="button"
            onClick={onRequestClose}
            aria-label="Close"
            className="-mr-1 -mt-1 w-6 h-6 flex items-center justify-center !text-dash-textMuted/60 hover:!text-dash-text rounded-md shrink-0"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <p
        className={cn(
          "px-4 pb-3 leading-relaxed !text-dash-textMuted",
          level === 1 ? "text-[12px]" : "text-[11.5px]"
        )}
      >
        {description}
      </p>

      {level === 1 && quickActions && quickActions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-3.5">
          {quickActions.map((action) => {
            const Icon = ACTION_ICONS[action.icon];
            return (
              <Link
                key={action.href}
                href={action.href}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-dash-accent bg-dash-accent/10 hover:bg-dash-accent/15 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <Icon size={11} />
                {action.label}
              </Link>
            );
          })}
        </div>
      )}

      <div className="border-t border-dash-border" />
      <button
        type="button"
        onClick={() => askLena(lenaQuestion)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-[11.5px] font-semibold text-dash-accent hover:bg-dash-accent/5 transition-colors"
      >
        <Sparkles size={13} />
        Ask LENA about this
      </button>
    </DashCard>
  );
};

export default HoverInfoCard;
