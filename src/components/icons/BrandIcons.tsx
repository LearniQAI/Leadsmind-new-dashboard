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

export const Instagram = (props: React.SVGProps<SVGSVGElement>) => {
 const gradientId = React.useId();
 return (
  <svg viewBox="0 0 24 24" {...props}>
   <defs>
    <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
     <stop offset="0%" stopColor="#FFDC80" />
     <stop offset="25%" stopColor="#FCAF45" />
     <stop offset="50%" stopColor="#F77737" />
     <stop offset="75%" stopColor="#F56040" />
     <stop offset="100%" stopColor="#C13584" />
    </linearGradient>
   </defs>
   <rect width="24" height="24" rx="6" fill={`url(#${gradientId})`} />
   <rect x="6.5" y="6.5" width="11" height="11" rx="3.5" fill="none" stroke="#fff" strokeWidth="1.5" />
   <circle cx="12" cy="12" r="3" fill="none" stroke="#fff" strokeWidth="1.5" />
   <circle cx="17" cy="7" r="1" fill="#fff" />
  </svg>
 );
};

/** Renders the current X (formerly Twitter) mark — kept the `Twitter`
 *  export name so call sites don't need to change, since that's the
 *  platform's real, current brand identity. */
export const Twitter = (props: React.SVGProps<SVGSVGElement>) => (
 <svg viewBox="0 0 24 24" {...props}>
  <rect width="24" height="24" rx="5" fill="#000000" />
  <path
   fill="#ffffff"
   d="M13.795 10.533 20.68 2.5h-1.63l-5.977 6.951L8.29 2.5H2.5l7.223 10.51L2.5 21.5h1.63l6.318-7.342 5.048 7.342h5.79l-7.492-10.967Zm-2.238 2.6-.732-1.047L4.98 3.75h2.505l4.716 6.745.733 1.047 6.128 8.77h-2.505l-5.001-7.179Z"
  />
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
