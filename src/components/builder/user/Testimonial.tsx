"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { TestimonialSettings } from './TestimonialSettings';

export interface TestimonialProps {
  quote: string;
  author: string;
  title: string;
  image: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  borderRadius: number;
  padding: number;
  textAlign: 'left' | 'center';
  borderOpacity: number;
}

export const UserTestimonial = ({
  quote,
  author,
  title,
  image,
  backgroundColor,
  textColor,
  accentColor,
  borderRadius,
  padding,
  textAlign,
  borderOpacity,
  dragRef,
  ...props
}: TestimonialProps & any) => {
  const { connectors: { connect, drag } } = useNode();

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
      className="w-full flex transition-all outline-dashed outline-1 outline-transparent hover:outline-blue-500/50"
    >
      <div
        className={`w-full shadow-2xl flex flex-col ${textAlign === 'center' ? 'items-center text-center' : 'items-start text-left'}`}
        style={{
          backgroundColor,
          borderRadius: `${borderRadius}px`,
          padding: `${padding}px`,
          border: `1px solid rgba(255,255,255,${borderOpacity / 100})`
        }}
      >
        <div className="mb-6 relative">
          <div className="absolute inset-0 rounded-full blur-xl opacity-20" style={{ backgroundColor: accentColor }}></div>
          <img
            src={image}
            alt={author}
            className="w-20 h-20 rounded-full object-cover relative z-10 border-2"
            style={{ borderColor: accentColor }}
          />
        </div>

        <blockquote className="mb-6 italic text-lg leading-relaxed font-medium" style={{ color: textColor }}>
          "{quote}"
        </blockquote>

        <div className="space-y-1">
          <h4 className="font-black uppercase tracking-tighter text-base" style={{ color: textColor }}>{author}</h4>
          <p className="text-xs font-bold uppercase tracking-widest opacity-60" style={{ color: accentColor }}>{title}</p>
        </div>
      </div>
    </div>
  );
};


UserTestimonial.craft = {
  displayName: 'Testimonial Card',
  props: {
    quote: "Leadsmind has completely transformed how we handle our inbound sales. We've seen a 40% increase in conversion within the first month.",
    author: 'Sarah Jenkins',
    title: 'Marketing Director at TechFlow',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=2564&auto=format&fit=crop',
    backgroundColor: 'rgba(255,255,255,1)',
    textColor: '#111827',
    accentColor: '#6c47ff',
    borderRadius: 32,
    padding: 48,
    textAlign: 'center',
    borderOpacity: 10,
  },
  related: {
    settings: TestimonialSettings,
  },
};
