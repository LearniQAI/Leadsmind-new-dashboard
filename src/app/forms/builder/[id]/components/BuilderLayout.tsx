'use client';

import React from 'react';
import { BuilderSidebar } from './BuilderSidebar';
import { BuilderCanvas } from './BuilderCanvas';
import { BuilderSettings } from './BuilderSettings';
import { BuilderTopbar } from './BuilderTopbar';
import { useFormBuilder } from './FormBuilderContext';
import { RuntimeProvider } from './RuntimeStore';
import { RuntimeRenderer } from './RuntimeRenderer';
import { AIAssistantSidebar } from '@/app/forms/[id]/ai/components/AIAssistantSidebar';
import { CollabPresenceList } from '@/app/forms/[id]/realtime/components/CollabPresenceList';
import { ConflictWarnings } from '@/app/forms/[id]/realtime/components/ConflictWarnings';
import { RealtimeNotificationHandler } from '@/app/forms/[id]/realtime/components/RealtimeNotificationHandler';
import { toast } from 'sonner';

export function BuilderLayout() {
  const { state, dispatch } = useFormBuilder();

  if (state.mode === 'preview') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--n900)' }}>
        {/* Preview Header Control Bar */}
        <div 
          className="app__header__area" 
          style={{ 
            height: 56, 
            padding: '0 24px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            borderBottom: '1px solid var(--bdr)', 
            background: 'var(--n800)' 
          }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => dispatch({ type: 'SET_MODE', mode: 'builder' })}
              className="builder-action-btn text-[10px] font-black uppercase tracking-wider"
              style={{ 
                padding: '8px 16px', 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid var(--bdr)', 
                borderRadius: 'var(--r8)', 
                color: 'var(--t1)' 
              }}
            >
              ← Back to Editor
            </button>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">
              Interactive Form Preview
            </span>
          </div>

          <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl">
            <button
              onClick={() => dispatch({ type: 'SET_PREVIEW_DEVICE', device: 'desktop' })}
              className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
                state.previewDevice === 'desktop' 
                  ? 'bg-primary text-white shadow-md' 
                  : 'text-white/40 hover:text-white'
              }`}
            >
              Desktop View
            </button>
            <button
              onClick={() => dispatch({ type: 'SET_PREVIEW_DEVICE', device: 'mobile' })}
              className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
                state.previewDevice === 'mobile' 
                  ? 'bg-primary text-white shadow-md' 
                  : 'text-white/40 hover:text-white'
              }`}
            >
              Mobile View
            </button>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 24, background: '#040819' }}>
          {state.previewDevice === 'mobile' ? (
            <div 
              style={{ 
                width: 375, 
                height: '100%', 
                maxHeight: 700, 
                background: '#040819', 
                border: '12px solid #161e38', 
                borderRadius: 40, 
                overflow: 'hidden', 
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{ height: 32, background: '#161e38', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 'bold' }}>
                <span>9:41</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <span>📶</span>
                  <span>🔋</span>
                </div>
              </div>
              
              <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                <RuntimeProvider fields={state.fields} steps={state.steps} logicRules={state.logicRules}>
                  <RuntimeRenderer progressBarType={state.progressBarType} />
                </RuntimeProvider>
              </div>
            </div>
          ) : (
            <div className="custom-scrollbar" style={{ width: '100%', maxWidth: 680, maxHeight: '90%', overflowY: 'auto' }}>
              <RuntimeProvider fields={state.fields} steps={state.steps} logicRules={state.logicRules}>
                <RuntimeRenderer progressBarType={state.progressBarType} />
              </RuntimeProvider>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--n900)' }}>
      <BuilderTopbar />
      
      {state.formId && (
        <div 
          className="flex justify-between items-center gap-4 z-40 bg-[#070b1e]"
          style={{ 
            padding: '10px 24px', 
            borderBottom: '1px solid rgba(255,255,255,0.05)'
          }}
        >
          <ConflictWarnings
            formId={state.formId}
            localLastSaved={state.lastSaved}
            currentUserEmail="admin@leadsmind.com"
            onRefreshTriggered={() => window.location.reload()}
          />
          <CollabPresenceList
            formId={state.formId}
            currentUserEmail="admin@leadsmind.com"
            currentClientId="client-editor-1"
            isEditor={true}
            editingSection={state.selectedFieldId}
          />
          <RealtimeNotificationHandler
            formId={state.formId}
            currentUserEmail="admin@leadsmind.com"
          />
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <BuilderSidebar />
        <BuilderCanvas />
        <BuilderSettings />
      </div>
      <AIAssistantSidebar
        formId={state.formId}
        floatingOffsetClass="right-[320px]"
        onApplyFormSchema={(schema) => {
          dispatch({
            type: 'INITIALIZE',
            formId: state.formId,
            formName: schema.name,
            fields: schema.fields.map((f: any) => ({
              id: f.id,
              type: f.type === 'select' ? 'dropdown' : f.type,
              label: f.label,
              placeholder: f.placeholder,
              required: !!f.required,
              width: 'full',
              stepId: f.stepId,
            })),
            steps: schema.steps.map((s: any) => ({
              id: s.id,
              title: s.title,
              type: s.type,
            })),
            logicRules: [],
            progressBarType: 'percentage',
            lastSaved: null,
            config: { ...state.config, autoSaveEnabled: true }
          });
        }}
        onApplyWorkflowSuggestion={async (wf) => {
          try {
            const supabase = (await import('@/lib/supabase/client')).createClient();
            const { data: form } = await supabase
              .from('forms')
              .select('workspace_id')
              .eq('id', state.formId)
              .single();

            const { error } = await supabase
              .from('workflows')
              .insert({
                form_id: state.formId,
                workspace_id: form?.workspace_id || null,
                name: wf.name,
                trigger_type: wf.trigger_type,
                description: wf.description,
                steps: wf.steps,
                is_active: true
              });
            if (error) throw error;
            toast.success(`Successfully saved and activated CRM automation: "${wf.name}"!`);
          } catch (err: any) {
            console.error('Failed to apply workflow suggestion:', err);
            toast.error(`Failed to activate automation: ${err.message || err}`);
          }
        }}
      />
    </div>
  );
}
