import { LogicRule } from './LogicEngine';

export type FieldType = 'text' | 'email' | 'phone' | 'textarea' | 'dropdown' | 'checkbox' | 'upload' | 'signature' | 'payment';

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  width: 'full' | 'half';
  helpText?: string;
  options?: string[];
  stepId: string;
}

export interface FormStep {
  id: string;
  title: string;
  description?: string;
  type: 'standard' | 'conditional' | 'completion';
}

export interface BuilderState {
  formId: string;
  formName: string;
  fields: FormField[];
  steps: FormStep[];
  logicRules: LogicRule[];
  progressBarType: 'percentage' | 'numbered' | 'minimal';
  selectedFieldId: string | null;
  mode: 'builder' | 'preview';
  previewDevice: 'desktop' | 'mobile';
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  config: Record<string, any>;
}

export type BuilderAction =
  | { type: 'INITIALIZE'; formId: string; formName: string; fields: FormField[]; steps: FormStep[]; logicRules: LogicRule[]; progressBarType: BuilderState['progressBarType']; lastSaved: Date | null; config: Record<string, any> }
  | { type: 'ADD_FIELD'; field: FormField; index?: number }
  | { type: 'UPDATE_FIELD'; id: string; updates: Partial<FormField> }
  | { type: 'REMOVE_FIELD'; id: string }
  | { type: 'SELECT_FIELD'; id: string | null }
  | { type: 'REORDER_FIELDS'; startIndex: number; endIndex: number }
  | { type: 'SET_SAVING'; isSaving: boolean }
  | { type: 'SAVE_SUCCESS'; lastSaved: Date }
  | { type: 'UPDATE_FORM_NAME'; name: string }
  | { type: 'SET_MODE'; mode: 'builder' | 'preview' }
  | { type: 'SET_PREVIEW_DEVICE'; device: 'desktop' | 'mobile' }
  | { type: 'ADD_STEP'; step: FormStep }
  | { type: 'UPDATE_STEP'; id: string; updates: Partial<FormStep> }
  | { type: 'REMOVE_STEP'; id: string }
  | { type: 'REORDER_STEPS'; startIndex: number; endIndex: number }
  | { type: 'ADD_LOGIC_RULE'; rule: LogicRule }
  | { type: 'UPDATE_LOGIC_RULE'; id: string; updates: Partial<LogicRule> }
  | { type: 'REMOVE_LOGIC_RULE'; id: string }
  | { type: 'SET_PROGRESS_BAR_TYPE'; barType: BuilderState['progressBarType'] }
  | { type: 'UPDATE_CONFIG'; config: Record<string, any> };

export const initialState: BuilderState = {
  formId: '',
  formName: '',
  fields: [],
  steps: [],
  logicRules: [],
  progressBarType: 'percentage',
  selectedFieldId: null,
  mode: 'builder',
  previewDevice: 'desktop',
  hasUnsavedChanges: false,
  isSaving: false,
  lastSaved: null,
  config: {},
};
