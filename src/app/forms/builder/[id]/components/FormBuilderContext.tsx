'use client';

import React, { createContext, useContext, useReducer, ReactNode, useEffect, useRef } from 'react';
import { updateForm } from '@/app/actions/marketing';
import { toast } from 'sonner';
import { FieldType, FormField, FormStep, BuilderState, BuilderAction, initialState } from './FormBuilderTypes';
export type { FieldType, FormField, FormStep, BuilderState, BuilderAction };
import { builderReducer, normalizeSteps, normalizeFields, normalizeLogicRules } from './FormBuilderReducer';

const BuilderContext = createContext<{
  state: BuilderState;
  dispatch: React.Dispatch<BuilderAction>;
  saveForm: () => Promise<void>;
  addField: (type: FieldType, index?: number) => void;
} | undefined>(undefined);

export function FormBuilderProvider({
  children,
  initialForm,
}: {
  children: ReactNode;
  initialForm: any;
}) {
  const [state, dispatch] = useReducer(builderReducer, initialState);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Initialize state from server prop
  useEffect(() => {
    if (initialForm) {
      const config = initialForm.config || {};
      const steps = normalizeSteps(config);
      const fields = normalizeFields(initialForm.fields, steps[0]?.id || 'default_step');
      const logicRules = normalizeLogicRules(config);
      const progressBarType = config.progressBarType || 'percentage';

      dispatch({
        type: 'INITIALIZE',
        formId: initialForm.id,
        formName: initialForm.name || 'Untitled Form',
        fields,
        steps,
        logicRules,
        progressBarType,
        lastSaved: initialForm.updated_at ? new Date(initialForm.updated_at) : null,
        config,
      });

      // If URL has ?mode=preview, initialize in preview mode
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('mode') === 'preview') {
          dispatch({ type: 'SET_MODE', mode: 'preview' });
        }
      }
    }
  }, [initialForm]);

  const addField = (type: FieldType, index?: number) => {
    const defaultLabel = {
      text: 'Short Text',
      email: 'Email Address',
      phone: 'Phone Number',
      textarea: 'Long Text',
      dropdown: 'Dropdown Select',
      checkbox: 'Checkbox Label',
      upload: 'File Upload',
      signature: 'Digital Signature',
      payment: 'Payment Integration',
    }[type] || 'Field Label';

    const defaultPlaceholder = {
      text: 'Enter response...',
      email: 'Enter email...',
      phone: 'Enter phone number...',
      textarea: 'Enter long response...',
      dropdown: 'Select an option',
      checkbox: '',
      upload: 'Choose file to upload',
      signature: 'Sign here...',
      payment: '',
    }[type] || '';

    const defaultStepId = stateRef.current.steps[0]?.id || 'default_step';

    const newField: FormField = {
      id: `${type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type,
      label: defaultLabel,
      placeholder: defaultPlaceholder,
      required: false,
      width: 'full',
      helpText: '',
      options: type === 'dropdown' ? ['Option 1', 'Option 2', 'Option 3'] : [],
      stepId: defaultStepId,
    };

    dispatch({ type: 'ADD_FIELD', field: newField, index });
  };

  const handleSave = async () => {
    const currentState = stateRef.current;
    if (!currentState.formId) return;

    dispatch({ type: 'SET_SAVING', isSaving: true });
    try {
      const payload = {
        name: currentState.formName,
        fields: currentState.fields,
        config: {
          ...currentState.config,
          steps: currentState.steps,
          logicRules: currentState.logicRules,
          progressBarType: currentState.progressBarType,
        },
        status: 'draft',
      };

      const res = await updateForm(currentState.formId, payload);

      if (res.error) {
        toast.error(`Auto-save failed: ${res.error}`);
        dispatch({ type: 'SET_SAVING', isSaving: false });
      } else {
        dispatch({ type: 'SAVE_SUCCESS', lastSaved: new Date() });
      }
    } catch (err) {
      console.error('[Builder] Auto-save error:', err);
      dispatch({ type: 'SET_SAVING', isSaving: false });
    }
  };

  // Auto-save debouncer (5 seconds)
  useEffect(() => {
    if (!state.hasUnsavedChanges || !state.formId) return;

    const timer = setTimeout(() => {
      handleSave();
    }, 5000);

    return () => clearTimeout(timer);
  }, [state.fields, state.steps, state.logicRules, state.progressBarType, state.formName, state.hasUnsavedChanges]);

  // Unsaved changes window listener
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.hasUnsavedChanges]);

  return (
    <BuilderContext.Provider value={{ state, dispatch, saveForm: handleSave, addField }}>
      {children}
    </BuilderContext.Provider>
  );
}

export function useFormBuilder() {
  const context = useContext(BuilderContext);
  if (!context) {
    throw new Error('useFormBuilder must be used within a FormBuilderProvider');
  }
  return context;
}
