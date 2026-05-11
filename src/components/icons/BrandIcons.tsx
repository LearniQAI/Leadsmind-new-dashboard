import React from 'react';

export const Facebook = (props: React.SVGProps<SVGSVGElement>) => (
 <svg
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="2"
  strokeLinecap="round"
  strokeLinejoin="round"
  {...props}
 >
  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
 </svg>
);

export const Instagram = (props: React.SVGProps<SVGSVGElement>) => (
 <svg
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="2"
  strokeLinecap="round"
  strokeLinejoin="round"
  {...props}
 >
  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
 </svg>
);

export const Twitter = (props: React.SVGProps<SVGSVGElement>) => (
 <svg
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="2"
  strokeLinecap="round"
  strokeLinejoin="round"
  {...props}
 >
  <path d="M22 4s-1 2.17-2.09 3.42a8.18 8.18 0 0 1 0 9.06C21 17.83 22 20 22 20s-2.17-.5-3.42-1.09a8.18 8.18 0 0 1-9.06 0C8.17 21 6 22 6 22s.5-2.17 1.09-3.42a8.18 8.18 0 0 1 0-9.06C6 8.17 4 6 4 6s2.17.5 3.42 1.09a8.18 8.18 0 0 1 9.06 0C17.83 4 20 2 20 2z" />
 </svg>
);

export const Linkedin = (props: React.SVGProps<SVGSVGElement>) => (
 <svg
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="2"
  strokeLinecap="round"
  strokeLinejoin="round"
  {...props}
 >
  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
  <rect x="2" y="9" width="4" height="12" />
  <circle cx="4" cy="4" r="2" />
 </svg>
);
