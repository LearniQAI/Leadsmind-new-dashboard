import React from 'react';

declare global {
 var process: {
  env: {
   [key: string]: string | undefined;
  };
 };
}

declare module 'swiper';
declare module 'swiper/react';
declare module 'swiper/modules';
declare module 'lucide-react';
declare module 'sonner';
declare module 'next/navigation';
declare module 'framer-motion';
declare module 'clsx';
declare module 'tailwind-merge';
