"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Star } from 'lucide-react';
import { StarRatingSettings } from './StarRatingSettings';

export interface StarRatingProps {
  rating: number;
  size: number;
  color: string;
  count: number;
  alignment: 'left' | 'center' | 'right';
  showLabel: boolean;
  labelText: string;
}

export const StarRating = ({
  rating,
  size,
  color,
  count,
  alignment,
  showLabel,
  labelText,
  dragRef,
  ...props
}: StarRatingProps & any) => {
  const { connectors: { connect, drag } } = useNode();

  const alignmentMap = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  return (
    <div
      {...props}
      ref={(ref) => {
        if (ref) {
          connect(drag(ref));
          if (dragRef) {
            if (typeof dragRef === 'function') dragRef(ref);
            else dragRef.current = ref;
          }
        }
      }}
      className={`w-full py-4 flex flex-col gap-2 transition-all outline-dashed outline-1 outline-transparent hover:outline-blue-500/50 ${alignmentMap[alignment as keyof typeof alignmentMap]}`}
    >
      <div className={`flex items-center gap-1 ${alignmentMap[alignment as keyof typeof alignmentMap]}`}>
        {[...Array(count)].map((_, i) => (
          <Star
            key={i}
            size={size}
            fill={i < Math.floor(rating) ? color : 'transparent'}
            color={i < Math.floor(rating) ? color : '#e5e7eb'}
            className="transition-all hover:scale-110"
          />
        ))}
      </div>
      {showLabel && (
        <span
          className={`text-sm font-bold tracking-tight uppercase opacity-80 ${alignment === 'center' ? 'text-center' : alignment === 'right' ? 'text-right' : 'text-left'}`}
          style={{ color: color }}
        >
          {labelText}
        </span>
      )}
    </div>
  );
};

StarRating.craft = {
  displayName: 'Star Rating',
  props: {
    rating: 5,
    size: 24,
    color: '#fbbf24',
    count: 5,
    alignment: 'center',
    showLabel: true,
    labelText: '5/5 Based on 1,200+ Reviews',
  },
  related: {
    settings: StarRatingSettings,
  },
};
