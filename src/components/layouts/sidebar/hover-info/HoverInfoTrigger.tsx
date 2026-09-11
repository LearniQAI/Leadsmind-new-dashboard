"use client";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import HoverInfoCard, { HoverInfoCardProps } from "./HoverInfoCard";

// Matches the PRD's recommended ~300-400ms hover-open delay (PRD 6.1). The
// close delay is short — just enough that moving the pointer from the info
// icon into the card itself (e.g. to click "Ask LENA") doesn't trip a close.
const OPEN_DELAY = 350;
const CLOSE_DELAY = 180;
const VIEWPORT_MARGIN = 8;

export interface HoverInfoTriggerProps {
  content: Omit<HoverInfoCardProps, "onRequestClose">;
  /** Vertically centers the trigger against a taller row (e.g. a 70px panel header). Defaults to inline. */
  className?: string;
}

const HoverInfoTrigger: React.FC<HoverInfoTriggerProps> = ({ content, className }) => {
  const iconRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({ position: "fixed", top: -9999, left: -9999 });

  useEffect(() => setMounted(true), []);

  const clearOpenTimer = () => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  };
  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  useEffect(() => () => {
    clearOpenTimer();
    clearCloseTimer();
  }, []);

  const scheduleOpen = () => {
    clearCloseTimer();
    if (isOpen) return;
    clearOpenTimer();
    openTimer.current = setTimeout(() => setIsOpen(true), OPEN_DELAY);
  };

  const scheduleClose = () => {
    clearOpenTimer();
    if (pinned) return;
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setIsOpen(false), CLOSE_DELAY);
  };

  const cancelClose = () => clearCloseTimer();

  // Touch / click-to-pin fallback (PRD 6.1): hover doesn't exist on touch
  // devices, so tapping the same info icon opens (and pins open) the same
  // card content instead of relying on a hover that will never fire.
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPinned((prev) => {
      const next = !prev;
      setIsOpen(next);
      return next;
    });
  };

  const close = () => {
    clearOpenTimer();
    clearCloseTimer();
    setPinned(false);
    setIsOpen(false);
  };

  // Closing a pinned card on an outside tap/click — the only real "close"
  // affordance touch has, since it has no mouseleave.
  useEffect(() => {
    if (!pinned) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (iconRef.current?.contains(target)) return;
      if (cardRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinned]);

  useLayoutEffect(() => {
    if (!isOpen || !iconRef.current) return;
    const rect = iconRef.current.getBoundingClientRect();
    const cardHeight = cardRef.current?.offsetHeight ?? 0;
    const maxTop = window.innerHeight - cardHeight - VIEWPORT_MARGIN;
    const top = Math.max(VIEWPORT_MARGIN, Math.min(rect.top - 6, Math.max(VIEWPORT_MARGIN, maxTop)));
    setStyle({ position: "fixed", top, left: rect.right + 8, zIndex: 1200 });
  }, [isOpen]);

  return (
    <>
      <button
        ref={iconRef}
        type="button"
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
        onClick={handleClick}
        aria-label={`About ${content.title}`}
        className={cn(
          "shrink-0 flex items-center justify-center !text-dash-textMuted/50 hover:!text-dash-accent transition-colors rounded",
          className
        )}
      >
        <Info size={13} strokeWidth={2.25} />
      </button>
      {mounted &&
        isOpen &&
        createPortal(
          <div
            ref={cardRef}
            data-testid="sidebar-hover-info-card"
            style={style}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <HoverInfoCard {...content} onRequestClose={pinned ? close : undefined} />
          </div>,
          document.body
        )}
    </>
  );
};

export default HoverInfoTrigger;
