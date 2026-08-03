"use client";

import React, { useState, useEffect } from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { X } from 'lucide-react';
import { TriggerEngine, TriggerConfig } from '@/app/public/campaigns/TriggerEngine';
import { PopupFormSettings } from './PopupFormSettings';

export interface PopupFormProps {
  displayMode: 'inline' | 'popup';
  triggerType: 'page-load' | 'time-delay' | 'exit-intent' | 'scroll';
  triggerValue: number;
  overlayColor: string;
  showCloseButton: boolean;
  children?: React.ReactNode;
}

// Single widget covering both "Inline" and "Popup" — the funnel doc groups
// them as one step type (inline_popup_form), so one widget with a mode
// toggle in the inspector is more coherent than two separate ones. Trigger
// logic reuses TriggerEngine.ts verbatim (confirmed generic/dependency-free
// in the Phase 3 audit — no campaigns-specific coupling).
export const PopupForm = (allProps: PopupFormProps & any) => {
  const {
    displayMode, triggerType, triggerValue, overlayColor, showCloseButton,
    children, dragRef, ...props
  } = allProps;

  const { id, connectors: { connect, drag } } = useNode();
  const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }));
  const [isOpen, setIsOpen] = useState(false);

  // In the editor, always render inline (regardless of displayMode) so the
  // form stays editable via the normal canvas — the trigger/modal behavior
  // only applies on the live public page.
  useEffect(() => {
    if (enabled || displayMode !== 'popup') return;
    const trigger: TriggerConfig = { type: triggerType === 'exit-intent' ? 'exit-intent' : triggerType, value: triggerValue };
    const engine = new TriggerEngine([trigger], () => setIsOpen(true));
    engine.init();
    return () => engine.destroy();
  }, [enabled, displayMode, triggerType, triggerValue]);

  const content = (
    <div
      {...props}
      ref={(el: HTMLDivElement | null) => {
        if (el) {
          connect(el);
          drag(el);
          if (dragRef) {
            if (typeof dragRef === 'function') dragRef(el);
            else dragRef.current = el;
          }
        }
      }}
      className="relative"
    >
      {React.Children.count(children) === 0 ? (
        <div className="w-full min-h-[80px] bg-slate-900/5 border border-dashed border-slate-900/10 flex items-center justify-center rounded-xl p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pointer-events-none">Drop a Form widget here</span>
        </div>
      ) : children}
    </div>
  );

  if (enabled || displayMode === 'inline') {
    return content;
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300"
      style={{ backgroundColor: overlayColor }}
      onClick={(e) => { if (e.target === e.currentTarget && showCloseButton) setIsOpen(false); }}
    >
      <div className="relative max-w-lg w-full animate-in zoom-in-95 duration-300">
        {showCloseButton && (
          <button
            onClick={() => setIsOpen(false)}
            className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center text-slate-500 hover:text-slate-900 z-10"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {content}
      </div>
    </div>
  );
};

PopupForm.craft = {
  displayName: 'Popup Form',
  props: {
    displayMode: 'inline',
    triggerType: 'time-delay',
    triggerValue: 5,
    overlayColor: 'rgba(15, 23, 42, 0.6)',
    showCloseButton: true,
  },
  isCanvas: true,
  related: {
    settings: PopupFormSettings,
  },
  rules: {
    canDrag: () => true,
  },
};
