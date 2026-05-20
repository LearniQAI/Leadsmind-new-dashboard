'use client';

import React from 'react';
import { usePublicForm, FormSchema } from './usePublicForm';
import { PublicRuntimeField } from './PublicRuntimeField';
import { containerStyle, cardStyle, headingStyle, primaryBtnStyle, secondaryBtnStyle } from './PublicRuntimeStyles';
import { SaveStateIndicator } from '@/lib/persistence/SaveStateIndicator';
import { ResumeRuntime } from '@/lib/persistence/ResumeRuntime';

interface Props {
  schema: FormSchema | null;
  workspaceId: string | null;
  formId: string;
  isEmbedFrame?: boolean;
}

export function PublicRuntimeRenderer({ schema, workspaceId, formId, isEmbedFrame }: Props) {
  const {
    values,
    errors,
    stepIndex,
    hiddenFieldIds,
    submitting,
    completed,
    submitError,
    returningContact,
    loadingPrefill,
    prefilledFields,
    steps,
    currentStep,
    stepFields,
    progressPercent,
    progressBarType,
    isFirstStep,
    isLastStep,
    updateValue,
    handleNext,
    handleBack,
    handleSubmit,
    tracker,
    // Persistence additions
    saveState,
    resumeModalOpen,
    recoverableData,
    onConfirmResume,
    onDiscardResume,
  } = usePublicForm(schema, workspaceId, formId, isEmbedFrame);

  if (!schema) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <p style={{ color: '#ef4444', fontFamily: 'DM Sans, sans-serif', fontSize: 13, textAlign: 'center' }}>
            This form is not available or has not been published.
          </p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div style={containerStyle}>
        <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 24 }}>✓</div>
          <h3 style={{ ...headingStyle, fontSize: 20, marginBottom: 8 }}>Submission Received</h3>
          <p style={{ color: '#94a3c8', fontFamily: 'DM Sans, sans-serif', fontSize: 13, margin: 0 }}>
            Thank you for your response. Your submission has been captured.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Returning contact welcome */}
        {returningContact && isFirstStep && (
          <div style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14 }}>
              {returningContact.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#60a5fa', fontFamily: 'Space Grotesk, sans-serif' }}>Welcome Back</p>
              <p style={{ margin: 0, fontSize: 13, color: '#eef2ff' }}>{returningContact.name}</p>
            </div>
          </div>
        )}

        {/* Step header */}
        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={headingStyle}>{currentStep?.title || schema.name}</h2>
            {currentStep?.description && (
              <p style={{ color: '#94a3c8', fontFamily: 'DM Sans, sans-serif', fontSize: 13, margin: '6px 0 0' }}>
                {currentStep.description}
              </p>
            )}
          </div>
          <SaveStateIndicator state={saveState} />
        </div>

        {/* Progress bar */}
        {steps.length > 1 && progressBarType !== 'minimal' && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3c8', fontFamily: 'Space Grotesk, sans-serif' }}>
                Step {stepIndex + 1} of {steps.length}
              </span>
              {progressBarType === 'percentage' && (
                <span style={{ fontSize: 10, fontWeight: 900, color: '#94a3c8', fontFamily: 'Space Grotesk, sans-serif' }}>{progressPercent}%</span>
              )}
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 99 }}>
              <div style={{ height: '100%', width: `${progressPercent}%`, background: '#2563eb', borderRadius: 99, transition: 'width 0.4s ease' }} />
            </div>
          </div>
        )}

        {steps.length > 1 && progressBarType === 'minimal' && (
          <div style={{ height: 2, background: 'rgba(255,255,255,0.03)', marginBottom: 24 }}>
            <div style={{ height: '100%', width: `${progressPercent}%`, background: 'rgba(255,255,255,0.15)', transition: 'width 0.4s ease' }} />
          </div>
        )}

        {/* Field grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, opacity: loadingPrefill ? 0.5 : 1, transition: 'opacity 0.3s ease' }}>
          {stepFields.filter(f => !hiddenFieldIds.has(f.id)).map(field => (
            <div key={field.id} style={{ 
              gridColumn: field.width === 'half' ? 'span 1' : 'span 2',
              transition: 'all 0.3s ease',
              transform: prefilledFields.has(field.id) ? 'translateY(0)' : 'none',
              animation: prefilledFields.has(field.id) ? 'highlight 2s ease-out' : 'none'
            }}>
              <style>{`@keyframes highlight { 0% { background: rgba(37,99,235,0.2); } 100% { background: transparent; } }`}</style>
              <PublicRuntimeField
                field={field}
                value={values[field.id]}
                error={errors[field.id]}
                onChange={(val) => updateValue(field.id, val)}
                onFocus={(id) => tracker?.trackFieldFocus(id)}
                onBlur={(id) => tracker?.trackFieldComplete(id)}
              />
            </div>
          ))}
        </div>

        {stepFields.length === 0 && (
          <p style={{ color: '#4a5a82', fontSize: 13, textAlign: 'center', padding: '24px 0', fontFamily: 'DM Sans, sans-serif' }}>
            This step has no fields configured.
          </p>
        )}

        {submitError && (
          <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#ef4444', fontSize: 12, fontFamily: 'DM Sans, sans-serif' }}>
            {submitError}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {!isFirstStep ? (
            <button onClick={handleBack} style={secondaryBtnStyle}>← Back</button>
          ) : <div />}

          {isLastStep ? (
            <button onClick={handleSubmit} disabled={submitting} style={primaryBtnStyle}>
              {submitting ? 'Submitting...' : 'Submit Form'}
            </button>
          ) : (
            <button onClick={handleNext} style={primaryBtnStyle}>Next →</button>
          )}
        </div>
      </div>

      {/* Session resume dialog */}
      {recoverableData && (
        <ResumeRuntime
          isOpen={resumeModalOpen}
          onClose={() => {}}
          onConfirm={onConfirmResume}
          onDiscard={onDiscardResume}
          savedTimestamp={recoverableData.timestamp}
          completionPercentage={recoverableData.completionPercentage}
          stepName={steps.find(s => s.id === recoverableData.stepId)?.title || recoverableData.stepId}
        />
      )}
    </div>
  );
}
