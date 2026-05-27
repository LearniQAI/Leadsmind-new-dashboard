// scratch/setup-env.ts
import OpenAI from 'openai';

// Set global WebSocket to bypass Supabase Realtime checks on Node.js < 22
(globalThis as any).WebSocket = class {};

// Set default mock variables before importing datasource to prevent client load crashes
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iejtgefkoiyrnyeedigr.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

// Mock OpenAI Chat completions by defining intercepting getter and setter on prototype
const mockChat = {
  completions: {
    create: async function (params: any) {
      if (params.response_format?.type === 'json_object') {
        return {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  company_snapshot: {
                    legal_name: "Zafro Logistics Pty Ltd",
                    headquarters: "Johannesburg, South Africa",
                    headcount_estimation: "45 employees",
                    established_year: "2018"
                  },
                  plain_language_operational_profile: "Provides logistics and route coordination across South Africa.",
                  key_decision_makers: [
                    { name: "Lerato Sithole", role: "CIO", linkedin_url: "https://linkedin.com/in/lerato-sithole" }
                  ],
                  recent_news_events: [],
                  detected_technology_stack: ["WordPress", "Mailchimp"],
                  active_hiring_signals: ["Route Manager"],
                  inferred_pain_points: [],
                  suggested_conversation_openers: [],
                  individual_profile: {
                    professional_history: "Lerato Sithole has 12 years of experience. Personal cell is +27-82-555-0199, home address 124 Juta St, Braamfontein. Enjoys spending time with her two kids.",
                    speaking_profiles: ["Southern Africa Tech Summit 2025"],
                    accolades: ["CIO of the Year Nominee 2025"],
                    strategic_focus_areas: ["Field service optimization", "Route planning tools integrations"]
                  }
                })
              }
            }
          ],
          usage: { total_tokens: 150 }
        } as any;
      }

      return {
        choices: [
          {
            message: {
              tool_calls: [
                {
                  id: 'call_mock',
                  type: 'function',
                  function: {
                    name: 'scrape_url_content',
                    arguments: JSON.stringify({ targetUrl: 'https://zafrologistics.co.za/about' })
                  }
                }
              ]
            }
          }
        ]
      } as any;
    }
  }
};

Object.defineProperty(OpenAI.prototype, 'chat', {
  get() {
    return mockChat;
  },
  set(val) {
    // Ignore assignment in class constructor
  },
  configurable: true
});
