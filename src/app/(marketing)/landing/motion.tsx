'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import React from 'react';

/** Soft fade + upward drift — use once per section so content reveals together. */
export const sectionRevealProps = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.12 },
  transition: { duration: 0.55, ease: [0.25, 0.1, 0.25, 1] },
} as const;

export function SectionReveal({
  children,
  className,
  ...props
}: HTMLMotionProps<'div'> & { children: React.ReactNode }) {
  return (
    <motion.div {...sectionRevealProps} className={className} {...props}>
      {children}
    </motion.div>
  );
}
