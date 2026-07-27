"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { SliderWithInput } from '../inspector/primitives';

export const SpacerSettings = () => {
  const { actions: { setProp }, height } = useNode((node) => ({
    height: node.data.props.height,
  }));

  return (
    <div className="space-y-4">
      <SliderWithInput
        label="Spacer height"
        value={height || 32}
        onChange={(val) => setProp((props: any) => props.height = val)}
        min={0}
        max={500}
        step={8}
        numeric
      />
    </div>
  );
};
