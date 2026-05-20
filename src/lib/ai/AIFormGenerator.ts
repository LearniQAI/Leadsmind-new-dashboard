/**
 * AIFormGenerator — handles prompt-to-schema form generation, field layouts,
 * and steps optimization. Supports local CRO fallback generation.
 */

import { AIService } from './AIService';
import { PromptManager } from './PromptManager';

export interface GeneratedFormSchema {
  name: string;
  fields: Array<{
    id: string;
    type: string;
    label: string;
    required: boolean;
    placeholder: string;
    stepId: string;
  }>;
  steps: Array<{
    id: string;
    title: string;
    type: string;
  }>;
}

export const AIFormGenerator = {
  /**
   * Generates form schemas from prompts.
   */
  async generateForm(prompt: string): Promise<GeneratedFormSchema> {
    const cacheKey = `form-gen:${prompt.trim().toLowerCase()}`;
    const instruction = PromptManager.getFormGeneratorPrompt(prompt);

    const res = await AIService.invokeAI(cacheKey, instruction, () => 
      this.generateLocalCROFallback(prompt)
    );

    return res.data;
  },

  /**
   * Deterministic local fallback generator mapping key keywords to premium layouts.
   */
  generateLocalCROFallback(prompt: string): GeneratedFormSchema {
    const lower = prompt.toLowerCase();

    // 1. Real Estate Intake Form template
    if (lower.includes('estate') || lower.includes('property') || lower.includes('housing')) {
      return {
        name: 'Real Estate Lead Intake Form',
        steps: [
          { id: 'step_1', title: 'Property Details', type: 'standard' },
          { id: 'step_2', title: 'Contact Information', type: 'standard' },
          { id: 'step_3', title: 'Intake Completed', type: 'completion' }
        ],
        fields: [
          { id: 'property_type', type: 'select', label: 'Property Type', required: true, placeholder: 'Select...', stepId: 'step_1' },
          { id: 'budget', type: 'text', label: 'Target Budget range', required: true, placeholder: 'e.g. $500,000 - $750,000', stepId: 'step_1' },
          { id: 'timeline', type: 'select', label: 'Buying Timeline', required: false, placeholder: 'e.g. Next 3 months', stepId: 'step_1' },
          { id: 'full_name', type: 'text', label: 'Full Name', required: true, placeholder: 'John Doe', stepId: 'step_2' },
          { id: 'email', type: 'email', label: 'Email Address', required: true, placeholder: 'john@example.com', stepId: 'step_2' },
          { id: 'phone', type: 'phone', label: 'Phone Number', required: true, placeholder: '(555) 000-0000', stepId: 'step_2' }
        ]
      };
    }

    // 2. SaaS/Onboarding Signup template
    if (lower.includes('saas') || lower.includes('onboarding') || lower.includes('signup') || lower.includes('app')) {
      return {
        name: 'SaaS Onboarding Application',
        steps: [
          { id: 'step_1', title: 'Company Details', type: 'standard' },
          { id: 'step_2', title: 'Personal Settings', type: 'standard' },
          { id: 'step_3', title: 'Welcome to Platform', type: 'completion' }
        ],
        fields: [
          { id: 'company_name', type: 'text', label: 'Company Name', required: true, placeholder: 'Acme Corp', stepId: 'step_1' },
          { id: 'company_size', type: 'select', label: 'Company Size', required: false, placeholder: 'e.g. 11-50 employees', stepId: 'step_1' },
          { id: 'role', type: 'text', label: 'Your Role / Job Title', required: true, placeholder: 'Product Manager', stepId: 'step_1' },
          { id: 'full_name', type: 'text', label: 'Full Name', required: true, placeholder: 'Jane Smith', stepId: 'step_2' },
          { id: 'email', type: 'email', label: 'Work Email Address', required: true, placeholder: 'jane@acme.com', stepId: 'step_2' }
        ]
      };
    }

    // 3. Default Contact/Lead capture template
    return {
      name: 'Optimized Contact & Lead Form',
      steps: [
        { id: 'step_1', title: 'Your Request', type: 'standard' },
        { id: 'step_2', title: 'Contact Details', type: 'standard' },
        { id: 'step_3', title: 'Submission Confirmed', type: 'completion' }
      ],
      fields: [
        { id: 'interest', type: 'select', label: 'What are you looking to solve?', required: true, placeholder: 'Select topic...', stepId: 'step_1' },
        { id: 'details', type: 'textarea', label: 'Request Details', required: false, placeholder: 'Provide project requirements...', stepId: 'step_1' },
        { id: 'full_name', type: 'text', label: 'Your Name', required: true, placeholder: 'Alex Johnson', stepId: 'step_2' },
        { id: 'email', type: 'email', label: 'Email Address', required: true, placeholder: 'alex@company.com', stepId: 'step_2' }
      ]
    };
  }
};
