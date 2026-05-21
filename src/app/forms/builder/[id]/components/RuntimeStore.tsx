'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { FormField, FormStep } from './FormBuilderContext';
import { LogicRule } from './LogicEngine';
import { evaluateRulesSafely } from './RuleEvaluator';
import { validateStep, validateField } from './ValidationEngine';

interface RuntimeState {
  values: Record<string, any>;
  errors: Record<string, string>;
  currentStepIndex: number;
  navHistory: number[];
  completed: boolean;
  hiddenFieldIds: Set<string>;
  skipStepIds: Set<string>;
}

const RuntimeContext = createContext<{
  state: RuntimeState;
  updateValue: (fieldId: string, val: any) => void;
  nextStep: () => boolean;
  prevStep: () => void;
  submitForm: () => void;
  steps: FormStep[];
  fields: FormField[];
} | undefined>(undefined);

export function RuntimeProvider({
  children,
  fields,
  steps,
  logicRules,
  onSubmit,
}: {
  children: ReactNode;
  fields: FormField[];
  steps: FormStep[];
  logicRules: LogicRule[];
  onSubmit?: (values: Record<string, any>) => void;
}) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [navHistory, setNavHistory] = useState<number[]>([]);
  const [completed, setCompleted] = useState(false);
  const [hiddenFieldIds, setHiddenFieldIds] = useState<Set<string>>(new Set());
  const [skipStepIds, setSkipStepIds] = useState<Set<string>>(new Set());
  const logicRulesRef = useRef(logicRules);
  logicRulesRef.current = logicRules;

  const evalOptions = { fields: fields.map(f => ({ id: f.id, stepId: f.stepId })), steps: steps.map(s => ({ id: s.id })) };

  // Evaluate conditional logic whenever values change
  useEffect(() => {
    const { hiddenFieldIds: newHidden, overriddenValues, skipStepIds: newSkip } = evaluateRulesSafely(
      logicRulesRef.current,
      values,
      evalOptions
    );
    setHiddenFieldIds(newHidden);
    setSkipStepIds(newSkip);

    let hasOverrides = false;
    const nextValues = { ...values };
    for (const [k, v] of Object.entries(overriddenValues)) {
      if (nextValues[k] !== v) {
        nextValues[k] = v;
        hasOverrides = true;
      }
    }
    if (hasOverrides) {
      setValues(nextValues);
    }
  }, [values, logicRules]);

  const updateValue = useCallback((fieldId: string, val: any) => {
    setValues(prev => ({ ...prev, [fieldId]: val }));
    setErrors(prev => {
      const field = fields.find(f => f.id === fieldId);
      if (!field) return prev;
      const err = validateField(field, val);
      const next = { ...prev };
      if (err) {
        next[fieldId] = err;
      } else {
        delete next[fieldId];
      }
      return next;
    });
  }, [fields]);

  const getNextNonSkippedIndex = useCallback((fromIndex: number, skipIds: Set<string>): number => {
    let idx = fromIndex;
    while (idx < steps.length && skipIds.has(steps[idx].id)) {
      idx++;
    }
    return idx >= steps.length ? fromIndex : idx;
  }, [steps]);

  const nextStep = useCallback(() => {
    const currentStep = steps[currentStepIndex];
    if (!currentStep) return false;

    const currentStepFields = fields.filter(f => f.stepId === currentStep.id);
    const stepErrors = validateStep(currentStepFields, values, hiddenFieldIds);

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return false;
    }

    setErrors({});

    // Check for jump_to_step rules
    const { jumpToStepId, skipStepIds: currentSkip } = evaluateRulesSafely(
      logicRulesRef.current,
      values,
      evalOptions
    );

    if (jumpToStepId) {
      const jumpIndex = steps.findIndex(s => s.id === jumpToStepId);
      if (jumpIndex !== -1 && jumpIndex > currentStepIndex) {
        const finalIndex = getNextNonSkippedIndex(jumpIndex, currentSkip);
        setNavHistory(prev => [...prev, currentStepIndex]);
        setCurrentStepIndex(finalIndex);
        return true;
      }
    }

    // Default progression with skip_step support
    const nextRawIndex = currentStepIndex + 1;
    if (nextRawIndex < steps.length) {
      const finalIndex = getNextNonSkippedIndex(nextRawIndex, currentSkip);
      setNavHistory(prev => [...prev, currentStepIndex]);
      setCurrentStepIndex(finalIndex);
      return true;
    }

    return true;
  }, [currentStepIndex, steps, fields, values, hiddenFieldIds, getNextNonSkippedIndex]);

  const prevStep = useCallback(() => {
    setNavHistory(prev => {
      if (prev.length === 0) return prev;
      const prevIndex = prev[prev.length - 1];
      setCurrentStepIndex(prevIndex);
      setErrors({});
      return prev.slice(0, -1);
    });
  }, []);

  const submitForm = useCallback(() => {
    const currentStep = steps[currentStepIndex];
    const currentStepFields = fields.filter(f => f.stepId === currentStep.id);
    const stepErrors = validateStep(currentStepFields, values, hiddenFieldIds);

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    setErrors({});
    setCompleted(true);
    if (onSubmit) {
      onSubmit(values);
    }
  }, [currentStepIndex, steps, fields, values, hiddenFieldIds, onSubmit]);

  return (
    <RuntimeContext.Provider
      value={{
        state: { values, errors, currentStepIndex, navHistory, completed, hiddenFieldIds, skipStepIds },
        updateValue,
        nextStep,
        prevStep,
        submitForm,
        steps,
        fields,
      }}
    >
      {children}
    </RuntimeContext.Provider>
  );
}

export function useRuntimeForm() {
  const ctx = useContext(RuntimeContext);
  if (!ctx) {
    throw new Error('useRuntimeForm must be used within a RuntimeProvider');
  }
  return ctx;
}
