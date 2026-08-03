"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { OfferWidgetBase, OfferWidgetProps } from './OfferWidgetBase';
import { OfferWidgetSettings } from './OfferWidgetSettings';

export const Upsell = (allProps: OfferWidgetProps & any) => {
  const { dragRef, ...props } = allProps;
  const { connectors: { connect, drag } } = useNode();
  return <OfferWidgetBase props={props} connect={connect} drag={drag} dragRef={dragRef} />;
};

Upsell.craft = {
  displayName: 'Upsell',
  props: {
    productName: 'Upgrade Your Order',
    description: 'Add this to your order right now at a special one-time price — you won’t see this offer again.',
    price: 199,
    currency: 'ZAR',
    acceptButtonText: 'Yes, add this to my order',
    declineButtonText: 'No thanks, continue',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    labelColor: '#111827',
    descriptionColor: '#4b5563',
    buttonBg: '#10b981',
    buttonTextColor: '#ffffff',
  },
  related: {
    settings: OfferWidgetSettings,
  },
  rules: {
    canDrag: () => true,
  },
};
