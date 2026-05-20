'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { TriggerEngine, TriggerConfig } from './TriggerEngine';
import { canDisplayCampaign, recordCampaignDismissal, FrequencyConfig } from './FrequencyController';
import { evaluateDisplayRules, DisplayRule } from './DisplayRuleEvaluator';
import { PopupRenderer } from './PopupRenderer';
import { SlideInRenderer } from './SlideInRenderer';
import { StickyBarRenderer } from './StickyBarRenderer';
import { PublicRuntimeRenderer } from '../forms/[id]/PublicRuntimeRenderer';

export type CampaignType = 'embed' | 'popup' | 'slide-in' | 'sticky-bar';
export type CampaignPosition = 'center' | 'fullscreen' | 'minimal' | 'bottom-right' | 'bottom-left' | 'side-panel' | 'top' | 'bottom';

export interface CampaignConfig {
  type: CampaignType;
  position?: CampaignPosition;
  triggers: TriggerConfig[];
  frequency: FrequencyConfig;
  targeting: DisplayRule[];
}

interface Props {
  schema: any;
  workspaceId: string | null;
  formId: string;
}

export function CampaignManager({ schema, workspaceId, formId }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const config: CampaignConfig = useMemo(() => {
    return schema?.config?.campaign || {
      type: 'embed',
      triggers: [],
      frequency: { type: 'always' },
      targeting: [],
    };
  }, [schema]);

  // Ensure targeting and frequency allow display
  const canDisplay = useMemo(() => {
    if (typeof window === 'undefined') return false;
    if (config.type === 'embed') return true; // Inline embeds always show
    
    const rulesPass = evaluateDisplayRules(config.targeting || []);
    const frequencyPass = canDisplayCampaign(formId, config.frequency);
    
    return rulesPass && frequencyPass;
  }, [formId, config]);

  useEffect(() => {
    if (!canDisplay || config.type === 'embed') return;

    // Build trigger engine
    const engine = new TriggerEngine(config.triggers || [], () => {
      setIsOpen(true);
      // Notify host page SDK to show the iframe wrapper if embedded
      if (typeof window !== 'undefined' && window.parent) {
        window.parent.postMessage({ type: 'lm_campaign_open', campaignType: config.type, position: config.position }, '*');
      }
    });

    engine.init();

    return () => {
      engine.destroy();
    };
  }, [canDisplay, config]);

  const handleClose = () => {
    setIsOpen(false);
    recordCampaignDismissal(formId, config.frequency);
    // Notify host page SDK to hide the iframe wrapper if embedded
    if (typeof window !== 'undefined' && window.parent) {
      window.parent.postMessage({ type: 'lm_campaign_close' }, '*');
    }
  };

  const Renderer = <PublicRuntimeRenderer schema={schema} workspaceId={workspaceId} formId={formId} isEmbedFrame={false} />;

  if (config.type === 'embed') {
    return <>{Renderer}</>;
  }

  if (config.type === 'popup') {
    return (
      <PopupRenderer isOpen={isOpen} onClose={handleClose} popupType={(config.position as 'center' | 'fullscreen' | 'minimal') || 'center'}>
        {Renderer}
      </PopupRenderer>
    );
  }

  if (config.type === 'slide-in') {
    return (
      <SlideInRenderer isOpen={isOpen} onClose={handleClose} position={(config.position as 'bottom-right' | 'bottom-left' | 'side-panel') || 'bottom-right'}>
        {Renderer}
      </SlideInRenderer>
    );
  }

  if (config.type === 'sticky-bar') {
    return (
      <StickyBarRenderer isOpen={isOpen} onClose={handleClose} position={(config.position as 'top' | 'bottom') || 'bottom'}>
        {Renderer}
      </StickyBarRenderer>
    );
  }

  return null;
}
