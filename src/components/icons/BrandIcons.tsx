import React from 'react';

/**
 * Real third-party brand marks — fixed brand colors baked in (not
 * `currentColor`-driven), because these are recognizable, standardized
 * logos, not theme-able icons. Previously this file held generic
 * lucide-style outline glyphs standing in for these brands, which read as
 * placeholders rather than the real marks. `props` still passes through
 * (width/height/className) so call sites can size these like any icon.
 */

export const Facebook = (props: React.SVGProps<SVGSVGElement>) => (
 <svg viewBox="0 0 24 24" {...props}>
  <path
   fill="#1877F2"
   d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
  />
 </svg>
);

// Messenger's mark, as a rounded-square badge: gradient background fill
// (matching WhatsApp/Instagram's own filled-square badge treatment, so all
// three platform badges wrap cleanly inside a ring overlay with no
// transparent corners peeking through) with the white bubble+lightning-bolt
// glyph centered on top.
export const Messenger = (props: React.SVGProps<SVGSVGElement>) => {
 const gradientId = React.useId();
 return (
  <svg viewBox="0 0 24 24" {...props}>
   <defs>
    <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
     <stop offset="0%" stopColor="#0099FF" />
     <stop offset="60%" stopColor="#A033FF" />
     <stop offset="100%" stopColor="#FF5280" />
    </linearGradient>
   </defs>
   <rect width="24" height="24" rx="6" fill={`url(#${gradientId})`} />
   <g transform="translate(12 12) scale(0.58) translate(-12 -12)">
    <path
     fill="#fff"
     d="M12 2C6.477 2 2 6.145 2 11.243c0 2.905 1.446 5.498 3.71 7.19V22l3.39-1.86c.905.25 1.865.385 2.9.385 5.523 0 10-4.145 10-9.282C22 6.145 17.523 2 12 2Z"
    />
    <path
     fill={`url(#${gradientId})`}
     d="m6.5 13.86 3.44-3.646 3.06 2.6 3.5-3.646-3.44 3.646-3.06-2.6z"
    />
   </g>
  </svg>
 );
};

// WhatsApp's rounded-square badge with the white speech-bubble/handset glyph.
export const WhatsApp = (props: React.SVGProps<SVGSVGElement>) => (
 <svg viewBox="0 0 24 24" {...props}>
  <rect width="24" height="24" rx="6" fill="#25D366" />
  <path
   fill="#fff"
   d="M12.02 5.5c-3.6 0-6.52 2.9-6.52 6.48 0 1.14.3 2.26.87 3.24L5.5 18.5l3.36-.87a6.55 6.55 0 0 0 3.16.81h.003c3.6 0 6.52-2.9 6.52-6.47 0-1.73-.68-3.35-1.92-4.58a6.54 6.54 0 0 0-4.6-1.9Zm0 11.85h-.003a5.42 5.42 0 0 1-2.76-.75l-.2-.12-2 .51.53-1.93-.13-.2a5.34 5.34 0 0 1-.83-2.88c0-2.96 2.42-5.37 5.4-5.37 1.44 0 2.8.56 3.82 1.57a5.31 5.31 0 0 1 1.58 3.8c0 2.96-2.42 5.37-5.4 5.37Zm2.96-4.02c-.16-.08-.96-.47-1.11-.53-.15-.05-.26-.08-.37.08-.11.16-.42.53-.52.64-.1.11-.19.12-.35.04-.16-.08-.68-.25-1.3-.8a4.86 4.86 0 0 1-.9-1.11c-.09-.16-.01-.25.07-.33.08-.07.16-.19.24-.28.08-.1.11-.16.16-.27.05-.11.03-.2-.01-.28-.04-.08-.37-.88-.5-1.2-.13-.32-.27-.27-.37-.27h-.32c-.11 0-.28.04-.43.2-.15.16-.56.55-.56 1.33 0 .78.57 1.54.65 1.65.08.11 1.12 1.71 2.72 2.4.38.16.68.26.91.33.38.12.73.1 1-.06.31-.18.96-.39 1.09-.77.13-.38.13-.7.09-.77-.04-.06-.14-.1-.3-.18Z"
  />
 </svg>
);

// Real Instagram app-icon asset (public/assets/insta.jpg) rather than a
// hand-drawn approximation of the mark. The source file is a genuine JPEG
// (no alpha channel), and its "transparent" corners are actually baked-in
// checkerboard pixels — so it's rendered inside a rounded, overflow-hidden
// box with the image scaled up slightly to push those corner artifacts out
// of frame, instead of drawing the raw file edge-to-edge.
export const Instagram = (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
 const { className = '', style, width, height, ...rest } = props;
 const boxStyle: React.CSSProperties = { ...style };
 if (width !== undefined) boxStyle.width = width;
 if (height !== undefined) boxStyle.height = height;
 return (
  <span
   className={`inline-flex overflow-hidden rounded-[22%] shrink-0 ${className}`}
   style={boxStyle}
  >
   <img
    src="/assets/insta.jpg"
    alt="Instagram"
    className="w-full h-full object-cover scale-[1.22]"
    {...rest}
   />
  </span>
 );
};

// TikTok's official mark is a duotone "glitch" effect — the note glyph is drawn three times,
// offset slightly: cyan (#25F4EE) behind-left, red/pink (#FE2C55) behind-right, white on top —
// on the black background used in their standard app-icon treatment. A flat single-color note
// reads as a generic music-note glyph rather than TikTok specifically; this duotone offset is
// what actually makes it recognizable as TikTok at a glance.
export const TikTok = (props: React.SVGProps<SVGSVGElement>) => (
 <svg viewBox="0 0 24 24" {...props}>
  <rect width="24" height="24" rx="5" fill="#000000" />
  <path
   fill="#25F4EE"
   transform="translate(-0.6, 0.6)"
   d="M16.5 4c.24 1.2.94 2.28 1.93 3 .8.59 1.77.95 2.77 1.03v2.75a6.6 6.6 0 0 1-3.9-1.26v5.71c0 2.85-2.32 5.17-5.17 5.17S7 18.08 7 15.23c0-2.75 2.15-5 4.86-5.16v2.8a2.36 2.36 0 1 0 1.9 2.31V4h2.74Z"
  />
  <path
   fill="#FE2C55"
   transform="translate(0.6, -0.6)"
   d="M16.5 4c.24 1.2.94 2.28 1.93 3 .8.59 1.77.95 2.77 1.03v2.75a6.6 6.6 0 0 1-3.9-1.26v5.71c0 2.85-2.32 5.17-5.17 5.17S7 18.08 7 15.23c0-2.75 2.15-5 4.86-5.16v2.8a2.36 2.36 0 1 0 1.9 2.31V4h2.74Z"
  />
  <path
   fill="#ffffff"
   d="M16.5 4c.24 1.2.94 2.28 1.93 3 .8.59 1.77.95 2.77 1.03v2.75a6.6 6.6 0 0 1-3.9-1.26v5.71c0 2.85-2.32 5.17-5.17 5.17S7 18.08 7 15.23c0-2.75 2.15-5 4.86-5.16v2.8a2.36 2.36 0 1 0 1.9 2.31V4h2.74Z"
  />
 </svg>
);

export const YouTube = (props: React.SVGProps<SVGSVGElement>) => (
 <svg viewBox="0 0 24 24" {...props}>
  <rect width="24" height="24" rx="5" fill="#FF0000" />
  <path fill="#ffffff" d="M10 8.5v7l6-3.5-6-3.5Z" />
 </svg>
);

export const Linkedin = (props: React.SVGProps<SVGSVGElement>) => (
 <svg viewBox="0 0 24 24" {...props}>
  <rect width="24" height="24" rx="4" fill="#0A66C2" />
  <path
   fill="#ffffff"
   d="M8.34 9.5H5.67V19h2.67V9.5ZM7 8.35a1.55 1.55 0 1 0 0-3.1 1.55 1.55 0 0 0 0 3.1ZM19 19h-2.67v-5.05c0-1.2-.43-2.02-1.5-2.02-.82 0-1.31.55-1.52 1.08-.08.19-.1.46-.1.72V19h-2.67s.04-8.65 0-9.5h2.67v1.35c.35-.55 1-1.33 2.4-1.33 1.76 0 3.08 1.15 3.08 3.62V19Z"
  />
 </svg>
);
