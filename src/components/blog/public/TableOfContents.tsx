'use client';

import React, { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';

interface Heading {
  text: string;
  id: string;
}

interface TableOfContentsProps {
  headings: Heading[];
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({ headings }) => {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries.find((entry) => entry.isIntersecting);
        if (visibleEntry) {
          setActiveId(visibleEntry.target.id);
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0.1 }
    );

    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <div className="hidden lg:block sticky top-28 w-60 h-fit space-y-4 self-start bg-[#080f28]/60 border border-white/5 p-5 rounded-2xl backdrop-blur-md">
      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
        <BookOpen className="w-4 h-4 text-primary" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-white">Table of Contents</span>
      </div>
      <nav className="space-y-2.5">
        {headings.map((h) => (
          <a
            key={h.id}
            href={`#${h.id}`}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`block text-[11px] font-semibold leading-relaxed transition-all duration-300 border-l-2 pl-3 ${
              activeId === h.id
                ? 'border-primary text-primary translate-x-1'
                : 'border-transparent text-white/40 hover:text-white/70'
            }`}
          >
            {h.text}
          </a>
        ))}
      </nav>
    </div>
  );
};
export default TableOfContents;
