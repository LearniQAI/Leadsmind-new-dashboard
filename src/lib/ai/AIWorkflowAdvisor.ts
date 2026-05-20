/**
 * AIWorkflowAdvisor — suggests automation structures, recovery sequences,
 * and routing templates for the form editor.
 */

import { AIService } from './AIService';
import { PromptManager } from './PromptManager';

export interface WorkflowSuggestion {
  name: string;
  trigger_type: string;
  description: string;
  steps: Array<{
    type: string;
    config: Record<string, any>;
  }>;
}

export const AIWorkflowAdvisor = {
  /**
   * Recommends automations based on form category context.
   */
  async recommendWorkflows(formContext: string): Promise<WorkflowSuggestion[]> {
    const cacheKey = `wf-advise:${formContext.trim().toLowerCase()}`;
    const prompt = PromptManager.getWorkflowAdvicePrompt(formContext);

    const res = await AIService.invokeAI(cacheKey, prompt, () => 
      this.recommendWorkflowsLocalFallback(formContext)
    );

    return res.data?.workflows || [];
  },

  /**
   * Local rules-based automation templates advisor.
   */
  recommendWorkflowsLocalFallback(formContext: string): { workflows: WorkflowSuggestion[] } {
    const lower = formContext.toLowerCase();

    // 1. Lead / Sales form automations
    if (lower.includes('lead') || lower.includes('sales') || lower.includes('real estate') || lower.includes('contact')) {
      return {
        workflows: [
          {
            name: 'Instant Lead Nurture & Task Assignment',
            trigger_type: 'form_submitted',
            description: 'Triggers immediately when a contact submits the form. Sends an introduction email, assigns tags, and opens a CRM task.',
            steps: [
              {
                type: 'apply_tags',
                config: { tags: ['New-Lead', 'Sales-Intake'] }
              },
              {
                type: 'send_email',
                config: {
                  templateType: 'confirmation',
                  subject: 'We received your inquiry!',
                  body: 'Hi {{name}},\nThanks for reaching out! One of our advisors will call you shortly.'
                }
              },
              {
                type: 'create_task',
                config: { title: 'Call new sales lead intake', priority: 'high' }
              }
            ]
          },
          {
            name: 'Abandoned Form Recovery email',
            trigger_type: 'partial_abandoned',
            description: 'Fires if a contact leaves the form half-way. Automatically emails a restoration link after a short delay.',
            steps: [
              {
                type: 'send_email',
                config: {
                  templateType: 'recovery',
                  subject: 'Complete your application',
                  body: 'Hi {{name}},\nWe noticed you didn\'t finish filling out the form. You can resume right where you left off here: {{recovery_link}}'
                }
              }
            ]
          }
        ]
      };
    }

    // 2. Onboarding / SaaS / Support form automations
    return {
      workflows: [
        {
          name: 'Customer Onboarding Sequence',
          trigger_type: 'form_submitted',
          description: 'Runs immediately after onboarding signup. Updates the workspace pipeline, tags the user, and sends welcome materials.',
          steps: [
            {
              type: 'apply_tags',
              config: { tags: ['SaaS-Onboarding', 'Pending-Verification'] }
            },
            {
              type: 'send_email',
              config: {
                templateType: 'welcome',
                subject: 'Welcome to LeadsMind Platform!',
                body: 'Hey {{name}},\nYour workspace is ready. Let\'s configure your first conversion funnel.'
              }
            },
            {
              type: 'update_pipeline',
              config: { stage: 'Onboarding-Started' }
            }
          ]
        }
      ]
    };
  }
};
