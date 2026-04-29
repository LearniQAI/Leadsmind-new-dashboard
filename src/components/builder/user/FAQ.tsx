"use client";

import React, { useState } from 'react';
import { useNode } from '@craftjs/core';
import { Plus, Minus, ChevronDown } from 'lucide-react';

export interface FAQProps {
  items: { question: string, answer: string }[];
  itemBg: string;
  borderColor: string;
  questionColor: string;
  answerColor: string;
  iconColor: string;
  borderRadius: number;
  gap: number;
  padding: number;
}

export const FAQ = (allProps: FAQProps & any) => {
    const { 
        items, 
        itemBg, 
        borderColor, 
        questionColor, 
        answerColor, 
        iconColor, 
        borderRadius, 
        gap,
        padding,
        // Style Props (Catch these so they don't leak to DOM)
        maxWidth,
        custom,
        hidden,
        // Craft Props
        dragRef,
        ...props 
    } = allProps;
  const { connectors: { connect, drag } } = useNode();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div
      {...props}
      ref={(ref) => {
        if (ref) {
            connect(ref);
            drag(ref);
            if (dragRef) {
                if (typeof dragRef === 'function') dragRef(ref);
                else dragRef.current = ref;
            }
        }
      }}
      className="max-w-4xl mx-auto transition-all outline-dashed outline-1 outline-transparent hover:outline-blue-500/50"
      style={{ padding: `${padding}px`, display: 'flex', flexDirection: 'column', gap: `${gap}px` }}
    >
      {items.map((item: any, i: number) => (
        <div 
            key={i} 
            className="transition-all shadow-sm hover:shadow-md"
            style={{ 
                backgroundColor: itemBg, 
                border: `1px solid ${borderColor}`,
                borderRadius: `${borderRadius}px`,
                overflow: 'hidden'
            }}
        >
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between px-8 py-5 text-left transition-colors hover:brightness-95"
            style={{ backgroundColor: 'transparent' }}
          >
            <span className="font-bold text-lg tracking-tight" style={{ color: questionColor }}>{item.question}</span>
            <div 
                className={`transition-transform duration-500 p-2 rounded-full`}
                style={{ 
                    transform: openIndex === i ? 'rotate(180deg)' : 'rotate(0deg)',
                    backgroundColor: `${iconColor}15`
                }}
            >
                <ChevronDown className="w-5 h-5" style={{ color: iconColor }} />
            </div>
          </button>
          
          <div 
            className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${openIndex === i ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}
          >
            <div 
                className="px-8 pb-8 pt-2 text-base leading-relaxed opacity-90"
                style={{ color: answerColor, borderTop: `1px solid ${borderColor}50` }}
            >
                {item.answer}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

import { FAQSettings } from './FAQSettings';

FAQ.craft = {
  displayName: 'FAQ Accordion',
  props: {
    items: [
      { question: 'What is Leadsmind?', answer: 'Leadsmind is an all-in-one platform for sales automation, funnel building, and contact management.' },
      { question: 'How long does setup take?', answer: 'You can be up and running in less than 10 minutes with our pre-built templates and visual editor.' },
      { question: 'Can I cancel anytime?', answer: 'Yes, we offer a flexible month-to-month subscription with no long-term contracts required.' },
    ],
    itemBg: '#ffffff',
    borderColor: '#e5e7eb',
    questionColor: '#111827',
    answerColor: '#4b5563',
    iconColor: '#6c47ff',
    borderRadius: 24,
    gap: 16,
    padding: 32,
  },
  related: {
    settings: FAQSettings,
  },
  rules: {
    canDrag: () => true,
  },
};
