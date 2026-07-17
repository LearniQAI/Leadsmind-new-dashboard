'use server';

import { requireWorkspaceAccess } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger';
import { toClientError } from '@/shared/errors/AppError';

// Both functions below do no DB read/write today (pure templating) — this
// fix is a lightweight consistency/future-proofing measure, not a response
// to a currently-exploitable gap, confirmed still true before making this change.
async function executeAction<T>(action: (supabase: any, workspaceId: string) => Promise<T>) {
  try {
    const supabase = await createServerClient();
    const { workspaceId } = await requireWorkspaceAccess();

    const data = await action(supabase, workspaceId);
    return { success: true, ...data as any };
  } catch (err: any) {
    logger.error({ err }, 'builder_ai.action.failed');
    const clientError = toClientError(err);
    return { success: false, error: clientError.error };
  }
}

/**
 * --- SPRINT 29: AI COPYWRITER HELPER WIDGET ---
 */
export async function generateAICopySuggestions(prompt: string, context: string) {
  return executeAction(async (supabase, workspaceId) => {
    // Determine tone and category based on context
    const cleanContext = context.toLowerCase();
    
    // Simulate generation with fallback variants
    // Future: Integrate direct OpenAI / Anthropic chat completion endpoint using workspace token keys
    const suggestions = [
      {
        heading: `Boost Your Conversions Instantly`,
        subheading: `Connect with your target audience using LeadsMind's intelligent marketing capture funnels.`,
        cta: `Get Started Free`
      },
      {
        heading: `Scale Your Leads Without Limits`,
        subheading: `Automate user capture, verification, and CRM pipelines inside one cohesive web platform.`,
        cta: `Claim Your Free Trial`
      },
      {
        heading: `The Premium Marketing Portal`,
        subheading: `Launch custom high-speed landing nodes and SSL proxies in under two clicks.`,
        cta: `Deploy Now`
      }
    ];

    if (prompt) {
      // Customize simulated suggestions based on prompt input
      suggestions.forEach(s => {
        if (prompt.toLowerCase().includes('pricing') || cleanContext.includes('pricing')) {
          s.heading = `Simple Pricing, Predictable Scaling`;
          s.subheading = `Select the tier that aligns with your active user pipeline. No hidden contracts.`;
          s.cta = `Unlock Access`;
        } else if (prompt.toLowerCase().includes('about') || cleanContext.includes('about')) {
          s.heading = `Designed for Forward-Thinking Builders`;
          s.subheading = `We bridge the gap between complex lead ingestion and simple marketing deployments.`;
          s.cta = `Meet the Team`;
        }
      });
    }

    return { suggestions };
  });
}

/**
 * --- SPRINT 30: AI COMPLETE LAYOUT SECTION GENERATOR ---
 */
export async function generateAISectionLayout(prompt: string) {
  return executeAction(async (supabase, workspaceId) => {
    const pLower = prompt.toLowerCase();
    let content: any = {};

    if (pLower.includes('pricing') || pLower.includes('pricing-table')) {
      // Render Pricing layout block
      content = {
        ROOT: {
          type: { resolvedName: 'Container' },
          isCanvas: true,
          props: { className: 'py-16 bg-slate-900 border border-white/5 rounded-3xl', padding: 24 },
          nodes: ['heading', 'pricingTable']
        },
        heading: {
          type: { resolvedName: 'Heading' },
          isCanvas: false,
          props: { text: 'Flexible Plans for Any Scale', level: 'h2', textAlign: 'center', color: '#ffffff', fontSize: 36, fontWeight: 'black' },
          parent: 'ROOT'
        },
        pricingTable: {
          type: { resolvedName: 'PricingTable' },
          isCanvas: false,
          props: {
            plans: [
              { name: 'Starter', price: '$29/mo', features: ['3 Pages', '1,000 Submissions', 'Standard Analytics'], buttonText: 'Choose Starter', highlight: false },
              { name: 'Growth Pro', price: '$79/mo', features: ['Unlimited Pages', '10,000 Submissions', 'Custom Domain SSL', 'Webhook Integrations'], buttonText: 'Upgrade to Pro', highlight: true }
            ]
          },
          parent: 'ROOT'
        }
      };
    } else if (pLower.includes('hero') || pLower.includes('header')) {
      // Render Hero block
      content = {
        ROOT: {
          type: { resolvedName: 'Container' },
          isCanvas: true,
          props: { className: 'py-24 px-8 bg-slate-950 border border-white/5 rounded-3xl flex flex-col items-center text-center gap-6', padding: 48 },
          nodes: ['heroHeading', 'heroPara', 'heroCta']
        },
        heroHeading: {
          type: { resolvedName: 'Heading' },
          isCanvas: false,
          props: { text: 'Automate Lead Ingestion Instantly', level: 'h1', textAlign: 'center', color: '#ffffff', fontSize: 48, fontWeight: 'black' },
          parent: 'ROOT'
        },
        heroPara: {
          type: { resolvedName: 'Paragraph' },
          isCanvas: false,
          props: { text: 'Design stunning landing layouts, deploy them to edge nodes, configure custom domains, and forward lead submission payloads to Zapier webhooks.', fontSize: 18, color: '#94a3b8', textAlign: 'center' },
          parent: 'ROOT'
        },
        heroCta: {
          type: { resolvedName: 'Button' },
          isCanvas: false,
          props: { text: 'Claim Your Free Access', variant: 'primary', color: '#6c47ff', textColor: '#ffffff', borderRadius: 12, size: 'lg' },
          parent: 'ROOT'
        }
      };
    } else if (pLower.includes('feature') || pLower.includes('grid')) {
      // Render Bento/Features grid block
      content = {
        ROOT: {
          type: { resolvedName: 'Container' },
          isCanvas: true,
          props: { className: 'py-16 bg-slate-900 border border-white/5 rounded-3xl', padding: 32 },
          nodes: ['featHeader', 'featGrid']
        },
        featHeader: {
          type: { resolvedName: 'Heading' },
          isCanvas: false,
          props: { text: 'Everything You Need to Convert', level: 'h2', textAlign: 'center', color: '#ffffff', fontSize: 32, fontWeight: 'black' },
          parent: 'ROOT'
        },
        featGrid: {
          type: { resolvedName: 'Columns' },
          isCanvas: true,
          props: { layout: '3', gap: 24, padding: 16 },
          nodes: ['col1', 'col2', 'col3'],
          parent: 'ROOT'
        },
        col1: {
          type: { resolvedName: 'Container' },
          isCanvas: true,
          props: { className: 'bg-slate-950/40 p-6 rounded-2xl border border-white/5' },
          nodes: ['col1Head', 'col1Para'],
          parent: 'featGrid'
        },
        col1Head: {
          type: { resolvedName: 'Heading' },
          isCanvas: false,
          props: { text: 'SSL Custom Domains', level: 'h4', color: '#ffffff', fontSize: 18 },
          parent: 'col1'
        },
        col1Para: {
          type: { resolvedName: 'Paragraph' },
          isCanvas: false,
          props: { text: 'Automated SSL proxy configuration and verification hooks.', fontSize: 14, color: '#94a3b8' },
          parent: 'col1'
        },
        col2: {
          type: { resolvedName: 'Container' },
          isCanvas: true,
          props: { className: 'bg-slate-950/40 p-6 rounded-2xl border border-white/5' },
          nodes: ['col2Head', 'col2Para'],
          parent: 'featGrid'
        },
        col2Head: {
          type: { resolvedName: 'Heading' },
          isCanvas: false,
          props: { text: 'Webhooks Integration', level: 'h4', color: '#ffffff', fontSize: 18 },
          parent: 'col2'
        },
        col2Para: {
          type: { resolvedName: 'Paragraph' },
          isCanvas: false,
          props: { text: 'Instantly push lead data over to Mailchimp or Zapier lists.', fontSize: 14, color: '#94a3b8' },
          parent: 'col2'
        },
        col3: {
          type: { resolvedName: 'Container' },
          isCanvas: true,
          props: { className: 'bg-slate-950/40 p-6 rounded-2xl border border-white/5' },
          nodes: ['col3Head', 'col3Para'],
          parent: 'featGrid'
        },
        col3Head: {
          type: { resolvedName: 'Heading' },
          isCanvas: false,
          props: { text: 'Revision Snapshots', level: 'h4', color: '#ffffff', fontSize: 18 },
          parent: 'col3'
        },
        col3Para: {
          type: { resolvedName: 'Paragraph' },
          isCanvas: false,
          props: { text: 'Roll back structural layouts instantly in one simple click.', fontSize: 14, color: '#94a3b8' },
          parent: 'col3'
        }
      };
    } else {
      // Default standard layout block
      content = {
        ROOT: {
          type: { resolvedName: 'Container' },
          isCanvas: true,
          props: { className: 'py-16 bg-slate-900 border border-white/5 rounded-3xl flex flex-col gap-4', padding: 24 },
          nodes: ['headingNode', 'paraNode']
        },
        headingNode: {
          type: { resolvedName: 'Heading' },
          isCanvas: false,
          props: { text: prompt || 'AI Generated Block', level: 'h2', color: '#ffffff', fontSize: 28, fontWeight: 'bold' },
          parent: 'ROOT'
        },
        paraNode: {
          type: { resolvedName: 'Paragraph' },
          isCanvas: false,
          props: { text: 'This layout was dynamically constructed using visual block ingestion algorithms.', fontSize: 16, color: '#94a3b8' },
          parent: 'ROOT'
        }
      };
    }

    return { nodeTree: content };
  });
}
