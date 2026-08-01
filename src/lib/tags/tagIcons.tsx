import {
  Tag,
  Star,
  Flame,
  Briefcase,
  TrendingUp,
  Target,
  DollarSign,
  GraduationCap,
  LifeBuoy,
  Megaphone,
  Handshake,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/**
 * Curated Lucide icon set for the tag icon picker — replaces the earlier
 * emoji picker (emoji render inconsistently across platforms and read as
 * informal for a B2B tool). Reuses lucide-react since that's the icon set
 * already used everywhere else in the dashboard (sidebar nav, buttons,
 * EntityPickers, etc.), not a second icon system.
 */
export const TAG_ICON_OPTIONS: { name: string; Icon: LucideIcon }[] = [
  { name: 'Tag', Icon: Tag },
  { name: 'Star', Icon: Star },
  { name: 'Flame', Icon: Flame },
  { name: 'Briefcase', Icon: Briefcase },
  { name: 'TrendingUp', Icon: TrendingUp },
  { name: 'Target', Icon: Target },
  { name: 'DollarSign', Icon: DollarSign },
  { name: 'GraduationCap', Icon: GraduationCap },
  { name: 'LifeBuoy', Icon: LifeBuoy },
  { name: 'Megaphone', Icon: Megaphone },
  { name: 'Handshake', Icon: Handshake },
  { name: 'Zap', Icon: Zap },
];

const TAG_ICON_MAP = new Map(TAG_ICON_OPTIONS.map((o) => [o.name, o.Icon]));

/**
 * Renders a tag's stored `icon` value. A known Lucide icon name (saved by
 * this picker) renders the real icon; anything else — e.g. a legacy emoji
 * character saved before this picker existed — renders as-is, so existing
 * tags don't break.
 */
export function TagIconGlyph({
  icon,
  size = 14,
  className,
}: {
  icon: string | null | undefined;
  size?: number;
  className?: string;
}) {
  if (!icon) return null;
  const Icon = TAG_ICON_MAP.get(icon);
  if (Icon) return <Icon size={size} className={className} />;
  return <span className={className}>{icon}</span>;
}
