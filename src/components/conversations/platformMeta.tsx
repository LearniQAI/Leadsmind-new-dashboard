import React from 'react';
import { Mail, MessageSquareText } from 'lucide-react';
import { Facebook, Instagram, Messenger, WhatsApp, YouTube } from '@/components/icons/BrandIcons';

/**
 * Single source of truth for how each platform is represented visually
 * (brand mark + brand color) across both the Conversations Hub (DMs) and
 * the Social Inbox (comments) — same badges, same icon components, so the
 * two surfaces read as one product. `label` here is the DM-context name
 * (e.g. "Messenger" for the `facebook` DM channel); call sites that need a
 * different label for the same platform in another context (e.g. "Facebook"
 * for Facebook Page comments) supply their own — only the icon/color are
 * meant to be shared verbatim.
 */
export type ConversationPlatform = 'facebook' | 'instagram' | 'whatsapp' | 'email' | 'sms' | 'youtube';

interface PlatformMeta {
  label: string;
  Icon: React.ComponentType<{ className?: string; width?: number | string; height?: number | string }>;
  color: string;
  soft: string;
  border: string;
}

// Email/SMS have no standardized third-party mark, so they get a self-contained
// filled rounded-square glyph — matching the visual weight of the real brand
// icons (Messenger/Instagram/WhatsApp) rather than a bare outline icon.
function makeGlyphIcon(bg: string, GlyphComp: React.ComponentType<any>) {
  return function GlyphIcon({ className, width, height }: { className?: string; width?: number | string; height?: number | string }) {
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 rounded-[22%] ${className || ''}`}
        style={{ width, height, background: bg }}
      >
        <GlyphComp className="w-[62%] h-[62%]" color="#fff" strokeWidth={2.25} />
      </span>
    );
  };
}

const EmailIcon = makeGlyphIcon('#1359FF', Mail);
const SmsIcon = makeGlyphIcon('#475569', MessageSquareText);

const PLATFORM_META: Record<string, PlatformMeta> = {
  facebook: { label: 'Messenger', Icon: Messenger, color: '#0099FF', soft: 'rgba(0,153,255,0.1)', border: 'rgba(0,153,255,0.25)' },
  // Distinct from `facebook` above: that key is the Messenger DM channel
  // (Conversations Hub). This one is the Facebook Page itself, used by the
  // Social Inbox for comments on posts — a different real-world identity
  // that needs the classic "f" mark, not the Messenger bubble.
  facebook_page: { label: 'Facebook', Icon: Facebook, color: '#1877F2', soft: 'rgba(24,119,242,0.1)', border: 'rgba(24,119,242,0.25)' },
  instagram: { label: 'Instagram', Icon: Instagram, color: '#C13584', soft: 'rgba(193,53,132,0.1)', border: 'rgba(193,53,132,0.25)' },
  whatsapp: { label: 'WhatsApp', Icon: WhatsApp, color: '#25D366', soft: 'rgba(37,211,102,0.1)', border: 'rgba(37,211,102,0.25)' },
  email: { label: 'Email', Icon: EmailIcon, color: '#1359FF', soft: 'rgba(19,89,255,0.1)', border: 'rgba(19,89,255,0.25)' },
  sms: { label: 'SMS', Icon: SmsIcon, color: '#475569', soft: 'rgba(71,85,105,0.1)', border: 'rgba(71,85,105,0.25)' },
  youtube: { label: 'YouTube', Icon: YouTube, color: '#FF0000', soft: 'rgba(255,0,0,0.1)', border: 'rgba(255,0,0,0.25)' },
};

export function getPlatformMeta(platform?: string | null): PlatformMeta {
  return PLATFORM_META[platform || ''] || {
    label: platform || 'Message',
    Icon: EmailIcon,
    color: '#1359FF',
    soft: 'rgba(19,89,255,0.1)',
    border: 'rgba(19,89,255,0.25)',
  };
}

/** Small badge with the platform's real brand mark — each icon already draws
 * its own filled rounded-square, so this just sizes it and lets call sites
 * add a ring/offset via className for overlaying on an avatar. */
export function PlatformBadge({ platform, size = 20, className }: { platform?: string | null; size?: number; className?: string }) {
  const meta = getPlatformMeta(platform);
  return <meta.Icon width={size} height={size} className={className} />;
}
