import React, { useState, useEffect, useMemo } from 'react';
import { PublicFieldSchema, validatePublicStep } from './PublicValidationEngine';
import { submitSmartForm } from './SmartSubmissionHandler';
import { evaluateLogicRules, LogicRule } from '@/app/forms/builder/[id]/components/LogicEngine';
import { fetchPrefillData } from './PrefillEngine';
import { captureAttribution, injectUrlHiddenFields, AttributionData } from './AttributionCapture';
import { useFormPersistence } from '@/lib/persistence/useFormPersistence';
import { sendTriggerEvent } from './TriggerClient';

export interface PublicFormStep {
  id: string;
  title: string;
  description?: string;
  type: 'standard' | 'conditional' | 'completion';
}

export interface FormSchema {
  id: string;
  name: string;
  fields: PublicFieldSchema[];
  config: {
    steps?: PublicFormStep[];
    logicRules?: LogicRule[];
    progressBarType?: 'percentage' | 'numbered' | 'minimal';
    hiddenFields?: any[];
    autoSaveEnabled?: boolean;
    recoveryEmailEnabled?: boolean;
    sessionExpirationDays?: number;
    partialSubmissionBehavior?: string;
  };
}

export function usePublicForm(
  schema: FormSchema | null,
  workspaceId: string | null,
  formId: string,
  isEmbedFrame?: boolean
) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [navHistory, setNavHistory] = useState<number[]>([]);
  const [hiddenFieldIds, setHiddenFieldIds] = useState<Set<string>>(new Set());
  const [skipStepIds, setSkipStepIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [attribution, setAttribution] = useState<AttributionData>({});
  const [returningContact, setReturningContact] = useState<{ id: string; name: string } | null>(null);
  const [loadingPrefill, setLoadingPrefill] = useState(true);
  const [prefilledFields, setPrefilledFields] = useState<Set<string>>(new Set());
  const [hiddenData, setHiddenData] = useState<Record<string, any>>({});

  const steps: PublicFormStep[] = useMemo(() => {
    return schema?.config?.steps?.length
      ? schema.config.steps
      : [{ id: 'default', title: schema?.name || 'Form', type: 'standard' }];
  }, [schema]);

  const logicRules: LogicRule[] = schema?.config?.logicRules || [];
  const progressBarType = schema?.config?.progressBarType || 'percentage';
  const allFields: PublicFieldSchema[] = schema?.fields || [];
  const progressPercent = steps.length > 1 ? Math.round((stepIndex / (steps.length - 1)) * 100) : 0;

  // Persistence and Auto-save hook
  const persistence = useFormPersistence({
    formId,
    autoSaveEnabled: schema?.config?.autoSaveEnabled ?? true,
    steps,
    values,
    setValues,
    stepIndex,
    setStepIndex,
    progressPercent,
  });

  // Evaluate conditional logic on value changes
  useEffect(() => {
    const { hiddenFieldIds: newHidden, overriddenValues, skipStepIds: newSkip } = evaluateLogicRules(logicRules, values);
    setHiddenFieldIds(newHidden);
    setSkipStepIds(newSkip);

    let hasOverrides = false;
    const next = { ...values };
    for (const [k, v] of Object.entries(overriddenValues)) {
      if (next[k] !== v) {
        next[k] = v;
        hasOverrides = true;
      }
    }
    if (hasOverrides) setValues(next);
  }, [values, logicRules, steps]);

  // Analytics Tracking Integration
  const tracker = useMemo(() => {
    if (!formId || !workspaceId) return null;
    return new (require('@/lib/analytics/AnalyticsTracker').AnalyticsTracker)(formId, workspaceId);
  }, [formId, workspaceId]);

  // Initialization: fetch prefill, capture attribution, and evaluate hidden fields
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const init = async () => {
      const attr = captureAttribution();
      setAttribution(attr);

      if (schema?.config?.hiddenFields) {
        setHiddenData(injectUrlHiddenFields(schema.config.hiddenFields, attr));
      }

      const { prefillValues, returningContact: retContact } = await fetchPrefillData(formId);
      
      if (retContact) {
        setReturningContact(retContact);
      }

      if (Object.keys(prefillValues).length > 0) {
        setValues(prev => ({ ...prev, ...prefillValues }));
        setPrefilledFields(new Set(Object.keys(prefillValues)));
      }

      setLoadingPrefill(false);
      
      const searchParams = new URLSearchParams(window.location.search);
      const isRecovery = searchParams.has('lm_recovery_token');
      sendTriggerEvent(formId, workspaceId, isRecovery ? 'recovery_link_opened' : 'form_viewed', {
        values: prefillValues,
        progressPercent: 0,
        attribution: attr,
        isReturningContact: !!retContact,
      });

      if (tracker) {
        tracker.trackView();
        if (steps.length > 0) {
          tracker.trackStepStart(steps[0].id);
        }
      }
    };

    init();
  }, [formId, schema, tracker, steps]);

  // Track step changes
  useEffect(() => {
    if (tracker && steps[stepIndex]) {
      tracker.trackStepStart(steps[stepIndex].id);
    }
  }, [stepIndex, tracker, steps]);

  // Track abandonment
  useEffect(() => {
    if (typeof window !== 'undefined' && tracker) {
      const handleBeforeUnload = () => {
        if (!completed) {
          tracker.trackAbandonment(steps[stepIndex]?.id);
          sendTriggerEvent(formId, workspaceId, 'partial_abandoned', {
            values,
            progressPercent,
            attribution,
            isReturningContact: !!returningContact,
          });
        }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [tracker, completed, stepIndex, steps, values, progressPercent, attribution, returningContact]);

  // Notify parent iframe about height changes
  useEffect(() => {
    if (isEmbedFrame && typeof window !== 'undefined') {
      const height = document.body.scrollHeight;
      window.parent.postMessage({ type: 'lm_resize', height }, '*');
    }
  });

  const currentStep = steps[stepIndex];
  const stepFields = allFields.filter(f => f.stepId === currentStep?.id || (steps.length === 1 && !f.stepId));

  const updateValue = (fieldId: string, val: any) => {
    setValues(prev => ({ ...prev, [fieldId]: val }));
    if (errors[fieldId]) {
      setErrors(prev => {
        const n = { ...prev };
        delete n[fieldId];
        return n;
      });
    }
  };

  const handleNext = () => {
    const stepErrors = validatePublicStep(stepFields, values, hiddenFieldIds);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});

    if (tracker) tracker.trackStepComplete(steps[stepIndex]?.id);

    sendTriggerEvent(formId, workspaceId, 'step_completed', {
      values,
      progressPercent,
      attribution,
      isReturningContact: !!returningContact,
    });

    const { jumpToStepId, skipStepIds: newSkip } = evaluateLogicRules(logicRules, values);
    if (jumpToStepId) {
      const jumpIdx = steps.findIndex(s => s.id === jumpToStepId);
      if (jumpIdx !== -1 && jumpIdx > stepIndex) {
        let finalIdx = jumpIdx;
        while (finalIdx < steps.length && newSkip.has(steps[finalIdx].id)) {
          finalIdx++;
        }
        setNavHistory(p => [...p, stepIndex]);
        setStepIndex(finalIdx >= steps.length ? jumpIdx : finalIdx);
        return;
      }
    }
    // Apply skip_step: find next non-skipped step
    let nextIdx = stepIndex + 1;
    while (nextIdx < steps.length && newSkip.has(steps[nextIdx].id)) {
      nextIdx++;
    }
    setNavHistory(p => [...p, stepIndex]);
    setStepIndex(nextIdx >= steps.length ? stepIndex + 1 : nextIdx);
  };

  const handleBack = () => {
    if (navHistory.length === 0) return;
    setStepIndex(navHistory[navHistory.length - 1]);
    setNavHistory(p => p.slice(0, -1));
    setErrors({});
  };

  const handleSubmit = async () => {
    const stepErrors = validatePublicStep(stepFields, values, hiddenFieldIds);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    if (tracker) tracker.trackStepComplete(steps[stepIndex]?.id);

    setSubmitting(true);
    setSubmitError(null);

    const finalData = { ...hiddenData, ...values };
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();

    const result = await submitSmartForm({
      formId,
      workspaceId: workspaceId || '',
      data: finalData,
      stepsCompleted: steps.length,
      attribution,
      isReturningContact: !!returningContact,
      contactToken: searchParams.get('lm_token')
    });

    setSubmitting(false);

    if (result.success) {
      if (tracker) tracker.trackSubmit();
      persistence.clearPersistence();
      setCompleted(true);
    } else {
      setSubmitError(result.error || 'Submission failed. Please try again.');
    }
  };

  return {
    values,
    errors,
    stepIndex,
    navHistory,
    hiddenFieldIds,
    skipStepIds,
    submitting,
    completed,
    submitError,
    attribution,
    returningContact,
    loadingPrefill,
    prefilledFields,
    steps,
    currentStep,
    stepFields,
    progressPercent,
    progressBarType,
    isFirstStep: navHistory.length === 0,
    isLastStep: stepIndex === steps.length - 1,
    updateValue,
    handleNext,
    handleBack,
    handleSubmit,
    tracker,
    // Persistence additions
    saveState: persistence.saveState,
    resumeModalOpen: persistence.resumeModalOpen,
    recoverableData: persistence.recoverableData,
    onConfirmResume: persistence.onConfirmResume,
    onDiscardResume: persistence.onDiscardResume,
    requestRecoveryEmail: persistence.requestRecoveryEmail,
    sessionId: persistence.sessionId,
  };
}
