"use client";


import React from 'react';
import { useNode } from '@craftjs/core';
import { LogoStripSettings } from './LogoStripSettings';
export interface LogoStripProps {
  logos: { src: string, alt: string }[];
  backgroundColor: string;
  grayscale: boolean;
  opacity: number;
  gap: number;
  height: number;
  padding: number;
}

export const LogoStrip = ({
  logos,
  backgroundColor,
  grayscale,
  opacity,
  gap,
  height,
  padding,
  dragRef,
  ...props
}: LogoStripProps & any) => {
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
      style={{ backgroundColor, padding: `${padding}px` }}
    >
      <div
        className="max-w-7xl mx-auto flex flex-wrap items-center justify-center"
        style={{ gap: `${gap}px` }}
      >
        {logos.map((logo: { src: string, alt: string }, i: number) => (
          <img
            key={i}
            src={logo.src}
            alt={logo.alt}
            className={`transition-all hover:grayscale-0 hover:opacity-100 object-contain`}
            style={{
              height: `${height}px`,
              filter: grayscale ? 'grayscale(100%)' : 'none',
              opacity: opacity / 100
            }}
          />
        ))}
      </div>
    </div>
  );
};



LogoStrip.craft = {
  displayName: 'Logo Cloud',
  props: {
    logos: [],
    backgroundColor: 'transparent',
    grayscale: true,
    opacity: 50,
    gap: 64,
    height: 32,
    padding: 48,
  },
  related: {
    settings: LogoStripSettings,
  },
};
