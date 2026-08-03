import {
  UserPlus, CheckCircle, ShoppingCart, CreditCard, TrendingUp, TrendingDown,
  Info, Video, Radio, FormInput, type LucideIcon
} from 'lucide-react';

export type StepType =
  | 'opt_in'
  | 'opt_in_thank_you'
  | 'sales_page'
  | 'order_form'
  | 'upsell'
  | 'downsell'
  | 'thank_you'
  | 'info_page'
  | 'webinar_registration'
  | 'webinar_thank_you'
  | 'inline_popup_form';

export type BusinessGoal = 'Sales' | 'Opt-in' | 'Webinar' | 'Info';

export interface StepTypeMeta {
  businessGoal: BusinessGoal;
  label: string;
  icon: LucideIcon;
  defaultTemplateId: string;
}

// Single source of truth for step-type -> business-goal grouping (per the
// signed-off design: this is a code lookup, not a DB column, so the
// grouping can never drift out of sync with step_type).
export const STEP_TYPE_META: Record<StepType, StepTypeMeta> = {
  opt_in: { businessGoal: 'Opt-in', label: 'Opt-in Page', icon: UserPlus, defaultTemplateId: 'lead-capture-accelerator' },
  opt_in_thank_you: { businessGoal: 'Opt-in', label: 'Opt-in Thank-you', icon: CheckCircle, defaultTemplateId: 'blank-slate' },
  sales_page: { businessGoal: 'Sales', label: 'Sales Page', icon: ShoppingCart, defaultTemplateId: 'ai-saas-premium' },
  order_form: { businessGoal: 'Sales', label: 'Order Form', icon: CreditCard, defaultTemplateId: 'order-form-basic' },
  upsell: { businessGoal: 'Sales', label: 'Upsell', icon: TrendingUp, defaultTemplateId: 'upsell-basic' },
  downsell: { businessGoal: 'Sales', label: 'Downsell', icon: TrendingDown, defaultTemplateId: 'downsell-basic' },
  thank_you: { businessGoal: 'Sales', label: 'Thank-you Page', icon: CheckCircle, defaultTemplateId: 'thank-you-basic' },
  info_page: { businessGoal: 'Info', label: 'Info / Contact Page', icon: Info, defaultTemplateId: 'blank-slate' },
  webinar_registration: { businessGoal: 'Webinar', label: 'Webinar Registration', icon: Video, defaultTemplateId: 'blank-slate' },
  webinar_thank_you: { businessGoal: 'Webinar', label: 'Webinar Thank-you / Broadcast', icon: Radio, defaultTemplateId: 'blank-slate' },
  inline_popup_form: { businessGoal: 'Info', label: 'Inline / Popup Form', icon: FormInput, defaultTemplateId: 'blank-slate' },
};

export const BUSINESS_GOAL_ORDER: BusinessGoal[] = ['Sales', 'Opt-in', 'Webinar', 'Info'];

export function getStepTypesByBusinessGoal(): Record<BusinessGoal, StepType[]> {
  const grouped: Record<BusinessGoal, StepType[]> = { Sales: [], 'Opt-in': [], Webinar: [], Info: [] };
  (Object.keys(STEP_TYPE_META) as StepType[]).forEach((type) => {
    grouped[STEP_TYPE_META[type].businessGoal].push(type);
  });
  return grouped;
}
