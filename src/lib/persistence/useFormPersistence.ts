'use client';

import { useState, useEffect, useRef } from 'react';
import { SessionPersistence } from './SessionPersistence';
import { PartialSubmissionStore } from './PartialSubmissionStore';
import { PersistenceEngine, SaveState } from './PersistenceEngine';
import { toast } from 'sonner';

interface UseFormPersistenceProps {
  formId: string;
  autoSaveEnabled: boolean;
  steps: { id: string; title: string }[];
  values: Record<string, any>;
  setValues: (vals: Record<string, any> | ((prev: Record<string, any>) => Record<string, any>)) => void;
  stepIndex: number;
  setStepIndex: (idx: number | ((prev: number) => number)) => void;
  progressPercent: number;
}

export function useFormPersistence({
  formId,
  autoSaveEnabled,
  steps,
  values,
  setValues,
  stepIndex,
  setStepIndex,
  progressPercent,
}: UseFormPersistenceProps) {
  const [sessionId, setSessionId] = useState<string>('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [resumeModalOpen, setResumeModalOpen] = useState(false);
  const [recoverableData, setRecoverableData] = useState<any>(null);
  
  const engineRef = useRef<PersistenceEngine | null>(null);
  const isInitializedRef = useRef(false);

  // 1. Resolve Session ID (session-scoped UUID)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sessionKey = `lm_form_sid_${formId}`;
    let sid = window.sessionStorage.getItem(sessionKey);
    if (!sid) {
      sid = crypto.randomUUID();
      window.sessionStorage.setItem(sessionKey, sid);
    }
    setSessionId(sid);
  }, [formId]);

  // 2. Hydration/Recovery check on mount
  useEffect(() => {
    if (!formId || !sessionId) return;

    const checkRecovery = async () => {
      // Avoid checking multiple times
      if (isInitializedRef.current) return;

      const searchParams = new URLSearchParams(window.location.search);
      const token = searchParams.get('lm_recovery_token');
      
      let dbData: any = null;
      if (token) {
        toast.info('Validating recovery link...');
        dbData = await PartialSubmissionStore.loadPartialByToken(token);
      }

      // Check local storage fallback if no token recovery or if local is newer
      const localData = SessionPersistence.loadLocal(formId);

      let targetData: any = null;
      if (dbData) {
        targetData = {
          values: dbData.field_values,
          stepId: dbData.current_step_id,
          timestamp: new Date(dbData.updated_at).getTime(),
          completionPercentage: dbData.completion_percentage,
          isFromDb: true,
        };
      } else if (localData && Object.keys(localData.values).length > 0) {
        targetData = {
          values: localData.values,
          stepId: localData.stepId,
          timestamp: localData.timestamp,
          completionPercentage: progressPercent,
          isFromDb: false,
        };
      }

      if (targetData && Object.keys(targetData.values).length > 0) {
        setRecoverableData(targetData);
        setResumeModalOpen(true);
      } else {
        isInitializedRef.current = true;
      }
    };

    checkRecovery();
  }, [formId, sessionId]);

  // 3. Initialize save engine
  useEffect(() => {
    if (!formId || !sessionId || !isInitializedRef.current) return;

    const engine = new PersistenceEngine({
      formId,
      sessionId,
      autoSaveEnabled,
      onStateChange: setSaveState,
    });
    engineRef.current = engine;

    return () => {
      engine.destroy();
    };
  }, [formId, sessionId, autoSaveEnabled]);

  // 4. Auto-save triggers on state changes
  useEffect(() => {
    if (!engineRef.current || !isInitializedRef.current) return;

    // Detect user email for CRM attribution pre-fill
    let userEmail = '';
    for (const [k, v] of Object.entries(values)) {
      if (k.toLowerCase().includes('email') && typeof v === 'string' && v.includes('@')) {
        userEmail = v.trim();
        break;
      }
    }

    engineRef.current.trackChange(
      steps[stepIndex]?.id || 'default',
      values,
      progressPercent,
      userEmail
    );
  }, [values, stepIndex, progressPercent, steps]);

  const onConfirmResume = () => {
    if (!recoverableData) return;
    
    setValues(recoverableData.values);
    
    // Find target step index
    const targetIdx = steps.findIndex(s => s.id === recoverableData.stepId);
    if (targetIdx !== -1) {
      setStepIndex(targetIdx);
    }
    
    setResumeModalOpen(false);
    isInitializedRef.current = true;
    toast.success('Your progress has been restored!');
  };

  const onDiscardResume = () => {
    SessionPersistence.clearLocal(formId);
    if (sessionId) {
      PartialSubmissionStore.deletePartial(formId, sessionId);
    }
    setResumeModalOpen(false);
    isInitializedRef.current = true;
    toast.info('Starting a fresh submission.');
  };

  const requestRecoveryEmail = async (email: string): Promise<boolean> => {
    if (!email || !sessionId) return false;
    try {
      setSaveState('saving');
      const res = await fetch(`/api/public/forms/${formId}/recovery-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, sessionId }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveState('saved');
        toast.success('Recovery link sent to your email!');
        return true;
      } else {
        setSaveState('error');
        toast.error(data.error || 'Failed to send recovery email');
        return false;
      }
    } catch {
      setSaveState('error');
      toast.error('Failed to connect to recovery service');
      return false;
    }
  };

  const clearPersistence = () => {
    SessionPersistence.clearLocal(formId);
    if (sessionId) {
      PartialSubmissionStore.deletePartial(formId, sessionId);
    }
  };

  return {
    saveState,
    resumeModalOpen,
    recoverableData,
    onConfirmResume,
    onDiscardResume,
    requestRecoveryEmail,
    clearPersistence,
    sessionId,
  };
}
