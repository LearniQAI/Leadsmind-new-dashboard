import React from 'react';

// Skip ±10s glyphs drawn as ONE svg (arc + arrowhead + numeral), matching lucide's geometry and
// stroke conventions (24px grid, 2px stroke, round caps/joins) so they sit naturally next to the
// lucide play/pause/chevron icons used elsewhere in the player. Replaces the old rotate-arrow +
// separately-positioned 8px "10" overlay, which didn't scale with the icon and read as generic.

interface SkipIconProps {
  size?: number;
  className?: string;
}

function SkipGlyph({ direction, size = 22, className = '' }: SkipIconProps & { direction: 'back' | 'forward' }) {
  const flip = direction === 'forward' ? 'matrix(-1 0 0 1 24 0)' : undefined;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <g transform={flip}>
        <path d="M3 12a9 9 0 1 0 2.64-6.36" />
        <path d="M3 3.5v4.64h4.64" />
      </g>
      <text
        x="12"
        y="15.2"
        textAnchor="middle"
        fontSize="8.5"
        fontWeight="700"
        fill="currentColor"
        stroke="none"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        10
      </text>
    </svg>
  );
}

export function SkipBackIcon(props: SkipIconProps) {
  return <SkipGlyph direction="back" {...props} />;
}

export function SkipForwardIcon(props: SkipIconProps) {
  return <SkipGlyph direction="forward" {...props} />;
}
