"use client";

import React, { useState, useEffect } from 'react';
import { CalendarCheck, Video, Loader2 } from 'lucide-react';
import { useNode, useEditor } from '@craftjs/core';
import { useSearchParams } from 'next/navigation';
import { getWebinarRegistration } from '@/app/actions/webinarRegistrations';
import { Button } from '@/components/ui/button';
import { WebinarThankYouSettings } from './WebinarThankYouSettings';

export interface WebinarThankYouProps {
  heading: string;
  message: string;
  joinButtonText: string;
  backgroundColor: string;
  borderRadius: number;
  padding: number;
  headingColor: string;
  textColor: string;
  accentColor: string;
}

// Doubles as both the immediate post-registration confirmation AND the page a
// registrant returns to and clicks through on the actual session day — the join
// link is a real, stable URL throughout, so there's no separate "is it live now"
// state to build (that would need infrastructure — host presence, chat, attendee
// count — that doesn't exist and is explicitly out of scope for this phase).
export const WebinarThankYou = (allProps: WebinarThankYouProps & any) => {
  const {
    heading, message, joinButtonText,
    backgroundColor, borderRadius, padding, headingColor, textColor, accentColor,
    dragRef, ...props
  } = allProps;

  const { connectors: { connect, drag } } = useNode();
  const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }));
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<{ sessionTitle: string; sessionDateTime: string | null; joinUrl: string | null; firstName: string | null } | null>(null);

  useEffect(() => {
    if (enabled) { setLoading(false); return; }
    const registrationId = searchParams?.get('registration');
    if (!registrationId) { setLoading(false); return; }
    getWebinarRegistration(registrationId).then((res) => {
      if (res.success) {
        setSession({
          sessionTitle: res.sessionTitle || 'Webinar Session',
          sessionDateTime: res.sessionDateTime || null,
          joinUrl: res.joinUrl || null,
          firstName: res.firstName || null,
        });
      }
      setLoading(false);
    });
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const formattedDateTime = (() => {
    if (!session?.sessionDateTime) return null;
    try {
      return new Date(session.sessionDateTime).toLocaleString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
      });
    } catch {
      return null;
    }
  })();

  return (
    <div
      {...props}
      ref={(ref) => {
        if (ref) {
          connect(ref);
          drag(ref);
          if (dragRef) {
            if (typeof dragRef === 'function') dragRef(ref);
            else dragRef.current = ref;
          }
        }
      }}
      className="transition-all outline-dashed outline-1 outline-transparent hover:outline-blue-500/50 text-center"
      style={{ backgroundColor, borderRadius: `${borderRadius}px`, padding: `${padding}px` }}
    >
      <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: `${accentColor}1a`, color: accentColor }}>
        <CalendarCheck className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-black mb-2" style={{ color: headingColor }}>
        {session?.firstName ? `You're in, ${session.firstName}!` : (heading || "You're registered!")}
      </h2>
      <p className="text-sm leading-relaxed max-w-md mx-auto mb-6" style={{ color: textColor }}>{message}</p>

      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: textColor }} />
      ) : session ? (
        <div className="max-w-sm mx-auto p-5 rounded-2xl border text-left" style={{ borderColor: `${textColor}22` }}>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-2 opacity-60" style={{ color: textColor }}>{session.sessionTitle}</div>
          {formattedDateTime && (
            <div className="text-sm font-bold mb-4" style={{ color: headingColor }}>{formattedDateTime}</div>
          )}
          {session.joinUrl && (
            <a href={session.joinUrl} target="_blank" rel="noopener noreferrer">
              <Button
                className="w-full rounded-lg h-11 font-bold shadow-lg hover:scale-[1.01] transition-all"
                style={{ backgroundColor: accentColor, color: '#ffffff' }}
              >
                <Video className="w-4 h-4 mr-1.5" />
                {joinButtonText || 'Join session'}
              </Button>
            </a>
          )}
          <p className="text-[10px] opacity-60 mt-3" style={{ color: textColor }}>
            Bookmark this page — come back and click Join when it&apos;s time.
          </p>
        </div>
      ) : null}
    </div>
  );
};

WebinarThankYou.craft = {
  displayName: 'Webinar Thank-you',
  props: {
    heading: "You're registered!",
    message: 'Save the date — we can’t wait to see you live.',
    joinButtonText: 'Join session',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 48,
    headingColor: '#111827',
    textColor: '#4b5563',
    accentColor: '#6c47ff',
  },
  related: {
    settings: WebinarThankYouSettings,
  },
  rules: {
    canDrag: () => true,
  },
};
