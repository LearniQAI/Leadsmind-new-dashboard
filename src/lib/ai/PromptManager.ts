/**
 * PromptManager — holds system instructions, tone definitions, 
 * and structural templates for the LeadsMind AI Engine.
 */

export const PromptManager = {
  getSystemInstruction(): string {
    return `You are LeadsMind AI, an expert conversion rate optimization (CRO) assistant.
All outputs must be structured JSON, strictly complying with the requested schemas.
Do not include markdown blocks or extra explanations outside the JSON structure.`;
  },

  getFormGeneratorPrompt(userPrompt: string): string {
    return `Generate a professional, conversion-focused form schema based on this prompt: "${userPrompt}".
Return a JSON object matching this schema:
{
  "name": "String (form name)",
  "fields": [
    {
      "id": "String (lowercase uuid or unique identifier)",
      "type": "text | email | phone | textarea | select | upload | signature",
      "label": "String (field label)",
      "required": boolean,
      "placeholder": "String",
      "stepId": "String (e.g. step_1)"
    }
  ],
  "steps": [
    {
      "id": "String",
      "title": "String",
      "type": "standard | completion"
    }
  ]
}`;
  },

  getCopyOptimizationPrompt(text: string, tone: string): string {
    return `Optimize the following form copy for high conversions:
Input Text: "${text}"
Tone: "${tone}"

Provide 3 variations. Return JSON object of structure:
{
  "suggestions": [
    {
      "headline": "String",
      "cta": "String",
      "helperText": "String",
      "description": "String"
    }
  ]
}`;
  },

  getAnalyticsInsightPrompt(stats: Record<string, any>): string {
    return `Analyze the following form analytics metrics:
${JSON.stringify(stats, null, 2)}

Provide conversion performance insights. Return a JSON object with structure:
{
  "insights": [
    {
      "type": "abandonment | friction | timing | mobile",
      "severity": "high | medium | low",
      "explanation": "Plain-language description of the issue.",
      "recommendation": "Actionable CRO recommendation to solve it.",
      "priority": 1
    }
  ]
}`;
  },

  getWorkflowAdvicePrompt(formContext: string): string {
    return `Suggest relevant automation workflows for this form context: "${formContext}".
Return a JSON object of structure:
{
  "workflows": [
    {
      "name": "String (workflow name)",
      "trigger_type": "form_submitted | partial_abandoned | payment_failed",
      "description": "String",
      "steps": [
        {
          "type": "send_email | create_task | apply_tags",
          "config": {}
        }
      ]
    }
  ]
}`;
  }
};
