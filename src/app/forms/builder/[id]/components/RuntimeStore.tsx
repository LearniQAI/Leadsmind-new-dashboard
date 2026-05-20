'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { FormField, FormStep } from './FormBuilderContext';
import { LogicRule, evaluateLogicRules } from './LogicEngine';
import { validateStep, validateField } from './ValidationEngine';

interface RuntimeState {
  values: Record<string, any>;
  errors: Record<string, string>;
  currentStepIndex: number;
  navHistory: number[];
  completed: boolean;
  hiddenFieldIds: Set<string>;
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

  // Evaluate conditional logic whenever values change
  useEffect(() => {
    const { hiddenFieldIds: newHidden, overriddenValues } = evaluateLogicRules(logicRules, values);
    setHiddenFieldIds(newHidden);

    // Apply overridden values silently if needed
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

  const updateValue = (fieldId: string, val: any) => {
    setValues(prev => ({ ...prev, [fieldId]: val }));

    // Dynamic field validation on value change
    const field = fields.find(f => f.id === fieldId);
    if (field) {
      const err = validateField(field, val);
      if (err) {
        setErrors(prev => ({ ...prev, [fieldId]: err }));
      } else {
        setErrors(prev => {
          const next = { ...prev };
          delete next[fieldId];
          return next;
        });
      }
    }
  };

  const nextStep = () => {
    const currentStep = steps[currentStepIndex];
    if (!currentStep) return false;

    // Get active fields for current step
    const currentStepFields = fields.filter(f => f.stepId === currentStep.id);
    const stepErrors = validateStep(currentStepFields, values, hiddenFieldIds);

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return false;
    }

    setErrors({});

    // Jump Logic Checks
    const { jumpToStepId } = evaluateLogicRules(logicRules, values);
    if (jumpToStepId) {
      const jumpIndex = steps.findIndex(s => s.id === jumpToStepId);
      if (jumpIndex !== -1 && jumpIndex > currentStepIndex) {
        setNavHistory(prev => [...prev, currentStepIndex]);
        setCurrentStepIndex(jumpIndex);
        return true;
      }
    }

    // Default progression
    if (currentStepIndex < steps.length - 1) {
      setNavHistory(prev => [...prev, currentStepIndex]);
      setCurrentStepIndex(prev => prev + 1);
      return true;
    }

    return true;
  };

  const prevStep = () => {
    if (navHistory.length === 0) return;
    const prevIndex = navHistory[navHistory.length - 1];
    setNavHistory(prev => prev.slice(0, -1));
    setCurrentStepIndex(prevIndex);
    setErrors({});
  };

  const submitForm = () => {
    // Validate final step
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
  };

  return (
    <RuntimeContext.Provider
      value={{
        state: { values, errors, currentStepIndex, navHistory, completed, hiddenFieldIds },
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
