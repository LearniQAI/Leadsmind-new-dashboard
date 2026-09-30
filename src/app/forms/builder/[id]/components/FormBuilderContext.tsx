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
  requestImmediateFlush: () => void;
  addField: (type: FieldType, index?: number, labelOverride?: string) => void;
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
  const didInitialize = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingImmediateFlushRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Initialize state from server prop. Hydrates the local draft exactly
  // once, on mount — after that, the client is the source of truth for the
  // in-progress edit (autosave persists it). This must NOT re-run if the
  // `initialForm` prop reference changes later (e.g. a background
  // router.refresh() elsewhere on the page re-executing the server
  // component): confirmed live that re-running this reset state.config to
  // the stale pre-edit snapshot mid-session, silently discarding whatever
  // the user had just changed (e.g. a newly selected/created tagOnSubmit)
  // and cancelling the pending debounced autosave in the same stroke.
  useEffect(() => {
    if (didInitialize.current) return;
    if (initialForm) {
      didInitialize.current = true;
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

  const addField = (type: FieldType, index?: number, labelOverride?: string) => {
    const defaultLabel = labelOverride || {
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

    const defaultPlaceholder = labelOverride ? `Enter ${labelOverride.toLowerCase()}...` : {
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
      // Content-only save — must never touch `status`. Publishing/
      // unpublishing is a deliberate act taken through the governance
      // flow (PublishManager.publishDraft) or the forms-list toggle;
      // autosaving an edit here previously downgraded an already-live
      // form straight to 'draft', silently taking real public
      // submissions offline until someone noticed and re-published.
      const payload = {
        name: currentState.formName,
        fields: currentState.fields,
        config: {
          ...currentState.config,
          steps: currentState.steps,
          logicRules: currentState.logicRules,
          progressBarType: currentState.progressBarType,
        },
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
      const message = err instanceof Error ? err.message : 'Auto-save failed unexpectedly.';
      toast.error(`Auto-save failed: ${message}`);
      dispatch({ type: 'SET_SAVING', isSaving: false });
    }
  };

  // Cancels any pending debounced save and saves right now, from whatever
  // is in stateRef at the moment it's called. Safe to call from
  // beforeunload/unmount handlers (state has already settled by then) but
  // NOT safe to call synchronously right after dispatch() in the same
  // event handler — stateRef.current only gets synced to the new state by
  // an effect that hasn't run yet at that point, so it would flush the
  // pre-dispatch snapshot. Use requestImmediateFlush() for that case.
  const flushSave = async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    await handleSave();
  };

  // Marks the next debounce-effect run (which fires after the dispatch that
  // triggered it has committed and stateRef is synced) to save with zero
  // delay instead of waiting 5s. Logic-rule add/edit/delete call this right
  // after dispatch — a rule the user just changed must not sit exposed to
  // the debounce window, where a refresh or navigation-away would silently
  // lose it.
  const requestImmediateFlush = () => {
    pendingImmediateFlushRef.current = true;
  };

  // Auto-save debouncer (5 seconds, or 0 when requestImmediateFlush() was
  // called since the last run).
  useEffect(() => {
    if (!state.hasUnsavedChanges || !state.formId) return;

    const immediate = pendingImmediateFlushRef.current;
    pendingImmediateFlushRef.current = false;

    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      handleSave();
    }, immediate ? 0 : 5000);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [state.fields, state.steps, state.logicRules, state.progressBarType, state.formName, state.hasUnsavedChanges]);

  // Unsaved changes window listener. Firing flushSave here is best-effort —
  // a full page unload can cut the request off before it lands — but it's
  // strictly better than doing nothing, and the confirm dialog's own delay
  // often gives it enough time to complete.
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.hasUnsavedChanges) {
        flushSave();
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.hasUnsavedChanges]);

  // Route-change flush: client-side (SPA) navigation away from the builder
  // unmounts this provider without a full page unload, so the in-flight
  // fetch survives — unlike beforeunload, this one isn't best-effort.
  useEffect(() => {
    return () => {
      if (stateRef.current.hasUnsavedChanges) {
        flushSave();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <BuilderContext.Provider value={{ state, dispatch, saveForm: handleSave, requestImmediateFlush, addField }}>
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
