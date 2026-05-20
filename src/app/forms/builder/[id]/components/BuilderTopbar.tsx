'use client';

import React, { useState, useEffect } from 'react';
import { useFormBuilder } from './FormBuilderContext';
import { ArrowLeft, Loader2, Play, Check, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function BuilderTopbar() {
  const router = useRouter();
  const { state, dispatch, saveForm } = useFormBuilder();
  const [relativeSavedTime, setRelativeSavedTime] = useState('All changes saved');

  // Relative saved time calculator
  useEffect(() => {
    if (!state.lastSaved) {
      setRelativeSavedTime('Unsaved draft');
      return;
    }

    const updateTime = () => {
      if (state.hasUnsavedChanges) {
        setRelativeSavedTime('Unsaved changes');
        return;
      }
      const diffSec = Math.floor((Date.now() - state.lastSaved!.getTime()) / 1000);
      if (diffSec < 5) {
        setRelativeSavedTime('All changes saved');
      } else if (diffSec < 60) {
        setRelativeSavedTime(`Saved ${diffSec}s ago`);
      } else {
        const diffMin = Math.floor(diffSec / 60);
        setRelativeSavedTime(`Saved ${diffMin}m ago`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 3000);
    return () => clearInterval(interval);
  }, [state.lastSaved, state.hasUnsavedChanges]);

  return (
    <div 
      className="app__header__area" 
      style={{ 
        position: 'relative', 
        zIndex: 10, 
        flexShrink: 0, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '0 24px',
        height: 64,
        background: 'var(--n800)',
        borderBottom: '1px solid var(--bdr)'
      }}
    >
      
      {/* Left Side: Navigation & Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={() => router.push('/forms')}
          className="builder-action-btn"
          style={{ 
            padding: '8px', 
            background: 'rgba(255,255,255,0.03)', 
            border: '1px solid var(--bdr)', 
            borderRadius: 'var(--r8)',
            color: 'var(--t1)'
          }}
          title="Back to Forms"
        >
          <ArrowLeft size={16} />
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <input
            type="text"
            value={state.formName}
            onChange={(e) => dispatch({ type: 'UPDATE_FORM_NAME', name: e.target.value })}
            className="bg-transparent border-none text-white text-sm font-black uppercase tracking-tight focus:outline-none focus:ring-0 placeholder-white/30 p-0 h-6"
            style={{ fontFamily: 'Space Grotesk, sans-serif', width: 220 }}
            placeholder="Name your form..."
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {state.hasUnsavedChanges ? (
              <AlertCircle size={10} className="text-amber-500 animate-pulse" />
            ) : (
              <Check size={10} className="text-emerald-500" />
            )}
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
              {relativeSavedTime}
            </span>
          </div>
        </div>
      </div>

      {/* Right Side: Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button 
          onClick={() => dispatch({ type: 'SET_MODE', mode: 'preview' })}
          disabled={state.fields.length === 0}
          className="builder-action-btn flex items-center gap-2"
          style={{
            padding: '8px 16px',
            fontSize: 11,
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            borderRadius: 'var(--r8)',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--bdr)',
            color: 'var(--t1)',
            opacity: state.fields.length === 0 ? 0.5 : 1,
            cursor: state.fields.length === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          <Play size={12} /> Preview
        </button>

        <button 
          onClick={saveForm}
          disabled={state.isSaving || !state.hasUnsavedChanges}
          className="builder-action-btn flex items-center gap-2"
          style={{
            padding: '8px 16px',
            fontSize: 11,
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            borderRadius: 'var(--r8)',
            background: state.hasUnsavedChanges ? 'rgba(37,99,235,0.1)' : 'rgba(255,255,255,0.01)',
            border: state.hasUnsavedChanges ? '1px solid rgba(37,99,235,0.3)' : '1px solid var(--bdr)',
            color: state.hasUnsavedChanges ? '#60a5fa' : 'var(--t3)',
            cursor: (!state.hasUnsavedChanges || state.isSaving) ? 'not-allowed' : 'pointer'
          }}
        >
          {state.isSaving ? (
            <>
              <Loader2 size={12} className="animate-spin" /> Saving...
            </>
          ) : (
            'Save Draft'
          )}
        </button>

        <button 
          onClick={() => {
            if (state.formId) {
              router.push(`/forms/${state.formId}/governance`);
            }
          }}
          disabled={!state.formId}
          className="builder-action-btn flex items-center gap-2" 
          style={{
            padding: '8px 16px',
            fontSize: 11,
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            borderRadius: 'var(--r8)',
            background: 'var(--primary)',
            border: 'none',
            color: 'white',
            cursor: !state.formId ? 'not-allowed' : 'pointer',
            opacity: !state.formId ? 0.4 : 1
          }}
        >
          Publish
        </button>
      </div>
    </div>
  );
}
