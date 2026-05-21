'use client';

import React from 'react';
import { useFormBuilder } from './FormBuilderContext';
import { Settings2, Plus, Trash2, LayoutTemplate, Clock, Target, EyeOff } from 'lucide-react';

export function CampaignBuilder() {
  const { state, dispatch } = useFormBuilder();

  const campaign = state.config.campaign || {
    type: 'embed',
    position: 'center',
    triggers: [],
    frequency: { type: 'always' },
    targeting: []
  };

  const updateCampaign = (updates: any) => {
    dispatch({ 
      type: 'UPDATE_CONFIG', 
      config: { campaign: { ...campaign, ...updates } } 
    });
  };

  const addTrigger = (type: string, value?: number) => {
    const val = value ?? (type === 'time-delay' ? 5 : type === 'scroll' ? 50 : undefined);
    const newTrigger: any = { type };
    if (val !== undefined) newTrigger.value = val;
    updateCampaign({ triggers: [...(campaign.triggers || []), newTrigger] });
  };

  const removeTrigger = (index: number) => {
    const newTriggers = [...(campaign.triggers || [])];
    newTriggers.splice(index, 1);
    updateCampaign({ triggers: newTriggers });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      {/* Campaign Type Selection */}
      <div>
        <p className="builder-section-label" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LayoutTemplate size={12} className="text-[#2563eb]" />
          Campaign Display Format
        </p>
        
        <select
          value={campaign.type}
          onChange={(e) => updateCampaign({ type: e.target.value })}
          className="w-full h-9 px-3 bg-[#0b132c] border border-white/10 rounded-lg text-white text-[11px] font-dm-sans outline-none focus:border-primary mb-3"
        >
          <option value="embed">Standard Inline Embed</option>
          <option value="popup">Center/Fullscreen Popup</option>
          <option value="slide-in">Corner Slide-In</option>
          <option value="sticky-bar">Top/Bottom Sticky Bar</option>
        </select>

        {campaign.type === 'popup' && (
          <select
            value={campaign.position}
            onChange={(e) => updateCampaign({ position: e.target.value })}
            className="w-full h-9 px-3 bg-[#0b132c] border border-white/5 rounded-lg text-white text-[11px] font-dm-sans outline-none focus:border-primary"
          >
            <option value="center">Center Modal</option>
            <option value="fullscreen">Fullscreen Overlay</option>
            <option value="minimal">Minimal Popup</option>
          </select>
        )}

        {campaign.type === 'slide-in' && (
          <select
            value={campaign.position}
            onChange={(e) => updateCampaign({ position: e.target.value })}
            className="w-full h-9 px-3 bg-[#0b132c] border border-white/5 rounded-lg text-white text-[11px] font-dm-sans outline-none focus:border-primary"
          >
            <option value="bottom-right">Bottom Right</option>
            <option value="bottom-left">Bottom Left</option>
            <option value="side-panel">Side Panel Drawer</option>
          </select>
        )}

        {campaign.type === 'sticky-bar' && (
          <select
            value={campaign.position}
            onChange={(e) => updateCampaign({ position: e.target.value })}
            className="w-full h-9 px-3 bg-[#0b132c] border border-white/5 rounded-lg text-white text-[11px] font-dm-sans outline-none focus:border-primary"
          >
            <option value="top">Top Bar</option>
            <option value="bottom">Bottom Bar</option>
          </select>
        )}
      </div>

      {campaign.type !== 'embed' && (
        <>
          {/* Triggers */}
          <div style={{ paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p className="builder-section-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={12} className="text-[#2563eb]" />
                Display Triggers
              </p>
              <select 
                onChange={(e) => { if(e.target.value) addTrigger(e.target.value); e.target.value = ''; }}
                className="bg-transparent border-none text-[9px] font-black uppercase tracking-wider text-primary outline-none cursor-pointer"
              >
                <option value="">+ ADD</option>
                <option value="page-load">On Page Load</option>
                <option value="time-delay">After N Seconds</option>
                <option value="scroll">At Scroll %</option>
                <option value="exit-intent">On Exit Intent</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(!campaign.triggers || campaign.triggers.length === 0) && (
                <div className="text-center py-6 bg-white/2 rounded-xl border border-white/5 border-dashed">
                  <p className="text-[10px] text-white/30 font-dm-sans mb-3">No automatic triggers set. Try adding one:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      { type: 'page-load', label: 'On Page Load', desc: 'Show immediately' },
                      { type: 'time-delay', value: 5, label: 'After 5s', desc: 'Timed delay' },
                      { type: 'scroll', value: 50, label: 'At 50% scroll', desc: 'Scroll trigger' },
                    ].map((s) => (
                      <button
                        key={s.type + (s.value || '')}
                        onClick={() => addTrigger(s.type, s.value)}
                        className="px-3 py-2 bg-white/5 border border-white/10 hover:border-[#2563eb]/20 rounded-lg text-[9px] text-white/50 hover:text-white font-dm-sans transition-all text-left"
                      >
                        <span className="block font-bold text-[10px] text-white/70">{s.label}</span>
                        <span className="block text-[8px] text-[#4a5a82] mt-0.5">{s.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {campaign.triggers?.map((trigger: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl group relative">
                  <div>
                    <p className="text-[10px] font-bold text-white uppercase tracking-wider mb-1">{trigger.type.replace('-', ' ')}</p>
                    {trigger.type === 'page-load' && <p className="text-[9px] text-[#4a5a82] m-0">Shows immediately on page load</p>}
                    {trigger.type === 'time-delay' && <p className="text-[9px] text-[#4a5a82] m-0">Shows after {trigger.value} seconds</p>}
                    {trigger.type === 'scroll' && <p className="text-[9px] text-[#4a5a82] m-0">Shows at {trigger.value}% scroll</p>}
                    {trigger.type === 'exit-intent' && <p className="text-[9px] text-[#4a5a82] m-0">Shows on mouse leave</p>}
                  </div>
                  <button onClick={() => removeTrigger(i)} className="text-rose-500/50 hover:text-rose-500 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Frequency & Targeting */}
          <div style={{ paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="builder-section-label" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <EyeOff size={12} className="text-[#2563eb]" />
              Frequency & Dismissal
            </p>
            <select
              value={campaign.frequency?.type || 'always'}
              onChange={(e) => updateCampaign({ frequency: { type: e.target.value, cooldownDays: e.target.value === 'cooldown' ? 7 : undefined } })}
              className="w-full h-9 px-3 bg-[#0b132c] border border-white/10 rounded-lg text-white text-[11px] font-dm-sans outline-none focus:border-primary"
            >
              <option value="always">Show every time</option>
              <option value="once-session">Once per session</option>
              <option value="once-user">Once per user ever</option>
              <option value="cooldown">Cooldown period</option>
            </select>
          </div>
        </>
      )}
    </div>
  );
}
