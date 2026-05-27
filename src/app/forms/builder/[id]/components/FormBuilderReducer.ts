import { BuilderState, BuilderAction, FormStep, FormField, FieldType } from './FormBuilderTypes';
import { LogicRule } from './LogicEngine';

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'INITIALIZE': {
      return {
        ...state,
        formId: action.formId,
        formName: action.formName,
        fields: action.fields,
        steps: action.steps,
        logicRules: action.logicRules,
        progressBarType: action.progressBarType,
        lastSaved: action.lastSaved,
        config: action.config,
        hasUnsavedChanges: false,
      };
    }
    case 'ADD_FIELD': {
      const newFields = [...state.fields];
      if (typeof action.index === 'number') {
        newFields.splice(action.index, 0, action.field);
      } else {
        newFields.push(action.field);
      }
      return {
        ...state,
        fields: newFields,
        selectedFieldId: action.field.id,
        hasUnsavedChanges: true,
      };
    }
    case 'UPDATE_FIELD': {
      return {
        ...state,
        fields: state.fields.map(f => f.id === action.id ? { ...f, ...action.updates } : f),
        hasUnsavedChanges: true,
      };
    }
    case 'REMOVE_FIELD': {
      return {
        ...state,
        fields: state.fields.filter(f => f.id !== action.id),
        selectedFieldId: state.selectedFieldId === action.id ? null : state.selectedFieldId,
        hasUnsavedChanges: true,
      };
    }
    case 'SELECT_FIELD': {
      return { ...state, selectedFieldId: action.id };
    }
    case 'REORDER_FIELDS': {
      const result = Array.from(state.fields);
      const [removed] = result.splice(action.startIndex, 1);
      result.splice(action.endIndex, 0, removed);
      return {
        ...state,
        fields: result,
        hasUnsavedChanges: true,
      };
    }
    case 'SET_SAVING': {
      return { ...state, isSaving: action.isSaving };
    }
    case 'SAVE_SUCCESS': {
      return {
        ...state,
        hasUnsavedChanges: false,
        isSaving: false,
        lastSaved: action.lastSaved,
      };
    }
    case 'UPDATE_FORM_NAME': {
      return {
        ...state,
        formName: action.name,
        hasUnsavedChanges: true,
      };
    }
    case 'SET_MODE': {
      return { ...state, mode: action.mode };
    }
    case 'SET_PREVIEW_DEVICE': {
      return { ...state, previewDevice: action.device };
    }
    case 'ADD_STEP': {
      return {
        ...state,
        steps: [...state.steps, action.step],
        hasUnsavedChanges: true,
      };
    }
    case 'UPDATE_STEP': {
      return {
        ...state,
        steps: state.steps.map(s => s.id === action.id ? { ...s, ...action.updates } : s),
        hasUnsavedChanges: true,
      };
    }
    case 'REMOVE_STEP': {
      const nextSteps = state.steps.filter(s => s.id !== action.id);
      const remainingStepId = nextSteps[0]?.id || 'default_step';
      
      const nextFields = state.fields.map(f =>
        f.stepId === action.id ? { ...f, stepId: remainingStepId } : f
      );
      
      return {
        ...state,
        steps: nextSteps.length === 0 ? [{ id: 'default_step', title: 'Step 1', type: 'standard' }] : nextSteps,
        fields: nextFields,
        hasUnsavedChanges: true,
      };
    }
    case 'REORDER_STEPS': {
      const result = Array.from(state.steps);
      const [removed] = result.splice(action.startIndex, 1);
      result.splice(action.endIndex, 0, removed);
      return {
        ...state,
        steps: result,
        hasUnsavedChanges: true,
      };
    }
    case 'ADD_LOGIC_RULE': {
      return {
        ...state,
        logicRules: [...state.logicRules, action.rule],
        hasUnsavedChanges: true,
      };
    }
    case 'UPDATE_LOGIC_RULE': {
      return {
        ...state,
        logicRules: state.logicRules.map(r => r.id === action.id ? { ...r, ...action.updates } : r),
        hasUnsavedChanges: true,
      };
    }
    case 'REMOVE_LOGIC_RULE': {
      return {
        ...state,
        logicRules: state.logicRules.filter(r => r.id !== action.id),
        hasUnsavedChanges: true,
      };
    }
    case 'SET_PROGRESS_BAR_TYPE': {
      return {
        ...state,
        progressBarType: action.barType,
        hasUnsavedChanges: true,
      };
    }
    case 'UPDATE_CONFIG': {
      return {
        ...state,
        config: { ...state.config, ...action.config },
        hasUnsavedChanges: true,
      };
    }
    default:
      return state;
  }
}

export function normalizeSteps(dbConfig: any): FormStep[] {
  if (dbConfig && Array.isArray(dbConfig.steps) && dbConfig.steps.length > 0) {
    return dbConfig.steps.map((s: any, idx: number) => ({
      id: s.id || `step_${Date.now()}_${idx}`,
      title: s.title || `Step ${idx + 1}`,
      description: s.description || '',
      type: s.type || 'standard',
    }));
  }
  return [{ id: 'default_step', title: 'Step 1', type: 'standard' }];
}

export function normalizeLogicRules(dbConfig: any): LogicRule[] {
  if (dbConfig && Array.isArray(dbConfig.logicRules)) {
    return dbConfig.logicRules;
  }
  return [];
}

export function normalizeFields(dbFields: any[], defaultStepId: string): FormField[] {
  if (!Array.isArray(dbFields)) return [];
  return dbFields.map((f, index) => ({
    id: f.id || f.name || `field_${Date.now()}_${index}`,
    type: (f.type as FieldType) || 'text',
    label: f.label || 'Field Label',
    placeholder: f.placeholder || '',
    required: !!f.required,
    width: f.width === 'half' ? 'half' : 'full',
    helpText: f.helpText || '',
    options: Array.isArray(f.options) ? f.options : [],
    stepId: f.stepId || defaultStepId,
    // POPIA Compliance: Checkboxes must never be pre-checked by default
    ...(f.type === 'checkbox' ? { defaultValue: false, checked: false, defaultChecked: false } : {}),
  }));
}
