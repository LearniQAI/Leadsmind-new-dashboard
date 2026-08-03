"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { OfferWidgetBase, OfferWidgetProps } from './OfferWidgetBase';
import { OfferWidgetSettings } from './OfferWidgetSettings';

export const Downsell = (allProps: OfferWidgetProps & any) => {
  const { dragRef, ...props } = allProps;
  const { connectors: { connect, drag } } = useNode();
  return <OfferWidgetBase props={props} connect={connect} drag={drag} dragRef={dragRef} />;
};

Downsell.craft = {
  displayName: 'Downsell',
  props: {
    productName: 'Wait — Here’s a Better Deal',
    description: 'Since that wasn’t quite right for you, here’s a smaller version at a lower price, just this once.',
    price: 99,
    currency: 'ZAR',
    acceptButtonText: 'Yes, add this instead',
    declineButtonText: 'No thanks, continue',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    labelColor: '#111827',
    descriptionColor: '#4b5563',
    buttonBg: '#f59e0b',
    buttonTextColor: '#ffffff',
  },
  related: {
    settings: OfferWidgetSettings,
  },
  rules: {
    canDrag: () => true,
  },
};
