'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

const slides = [
  { src: '/assets/dashboard.png', alt: 'LeadsMind dashboard overview' },
  { src: '/assets/crm.png', alt: 'LeadsMind CRM pipeline' },
  { src: '/assets/student_workflow.png', alt: 'LeadsMind LMS student workflow' },
  { src: '/assets/website_builder.png', alt: 'LeadsMind website builder' },
];

const DURATION_S = 30;

export default function DashboardMarquee() {
  const duplicatedSlides = [...slides, ...slides];

  return (
    <div className="w-full overflow-hidden">
      <motion.div
        className="flex gap-6 w-max"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: DURATION_S, ease: 'linear', repeat: Infinity }}
      >
        {duplicatedSlides.map((slide, i) => (
          <div
            key={`${slide.src}-${i}`}
            className="relative flex-shrink-0 w-[280px] h-[180px] sm:w-[360px] sm:h-[230px] md:w-[420px] md:h-[270px] rounded-xl overflow-hidden border border-gray-200 shadow-sm"
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              sizes="(max-width: 640px) 280px, (max-width: 768px) 360px, 420px"
              className="object-cover"
              priority={i === 0}
            />
          </div>
        ))}
      </motion.div>
    </div>
  );
}
