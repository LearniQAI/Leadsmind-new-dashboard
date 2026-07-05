'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId, getUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { logger } from '@/shared/logger';
import { NotFoundError, ValidationError, toClientError } from '@/shared/errors/AppError';

const OPENAI_KEY = process.env.OPENAI_API_KEY;

// Helper to generate OpenAI text-embedding-3-small vector payload
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    if (!OPENAI_KEY) return null;
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: text.replace(/\n/g, ' '),
        model: 'text-embedding-3-small'
      })
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.data[0].embedding;
  } catch (err) {
    logger.error({ err }, 'help.embedding.generate.failed');
    return null;
  }
}

function getEditDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1  // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

const STOP_WORDS = new Set(['how', 'to', 'a', 'the', 'for', 'with', 'and', 'is', 'in', 'on', 'at', 'by', 'of', 'an', 'this', 'that', 'it', 'you', 'your', 'my']);

function fuzzySearch(articles: any[], query: string): any[] {
  const cleanQuery = query.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
  if (!cleanQuery) return [];

  const queryWords = cleanQuery.split(/\s+/).filter(w => w.length > 1 && !STOP_WORDS.has(w));
  if (queryWords.length === 0) return [];

  const scored = articles.map(art => {
    let score = 0;
    const titleLower = (art.title || '').toLowerCase();
    const categoryLower = (art.category || '').toLowerCase();
    const bodyLower = (art.body_plain || '').toLowerCase();
    const slugLower = (art.slug || '').toLowerCase().replace(/-/g, ' ');
    const contentStr = art.content_json ? JSON.stringify(art.content_json).toLowerCase() : '';
    const faqStr = art.faq_json ? JSON.stringify(art.faq_json).toLowerCase() : '';

    // Exact matches
    if (titleLower === cleanQuery) score += 100;
    if (categoryLower === cleanQuery) score += 80;

    let matchedWordsCount = 0;

    queryWords.forEach(word => {
      const qWord = (word.endsWith('s') && word.length > 3) ? word.slice(0, -1) : word;
      let wordMatched = false;

      // 1. Title match
      if (titleLower.includes(qWord) || titleLower.includes(word)) {
        score += 20;
        wordMatched = true;
        if (titleLower.startsWith(qWord) || titleLower.startsWith(word)) score += 10;
      }
      // 2. Category match
      if (categoryLower.includes(qWord) || categoryLower.includes(word)) {
        score += 30;
        wordMatched = true;
      }
      // 3. Slug match
      if (slugLower.includes(qWord) || slugLower.includes(word)) {
        score += 15;
        wordMatched = true;
      }
      // 4. Body match
      if (bodyLower.includes(qWord) || bodyLower.includes(word)) {
        score += 5;
        wordMatched = true;
      }
      // 5. Content match
      if (contentStr.includes(qWord) || contentStr.includes(word)) {
        score += 10;
        wordMatched = true;
      }
      // 6. FAQ match
      if (faqStr.includes(qWord) || faqStr.includes(word)) {
        score += 10;
        wordMatched = true;
      }

      // 7. Typo tolerance (edit distance <= 1 for words of length >= 4)
      if (qWord.length >= 4) {
        const titleWords = titleLower.split(/\s+/).filter(w => w.length >= 4);
        const categoryWords = categoryLower.split(/\s+/).filter(w => w.length >= 4);
        const slugWords = slugLower.split(/\s+/).filter(w => w.length >= 4);

        let typoMatched = false;
        const checkTypo = (targetWords: string[], weight: number) => {
          for (const tWord of targetWords) {
            if (getEditDistance(qWord, tWord) <= 1 || getEditDistance(word, tWord) <= 1) {
              score += weight;
              typoMatched = true;
              break;
            }
          }
        };

        checkTypo(titleWords, 15);
        checkTypo(categoryWords, 20);
        checkTypo(slugWords, 10);

        if (typoMatched) wordMatched = true;
      }

      if (wordMatched) {
        matchedWordsCount++;
      }
    });

    // Normalize score by query coverage ratio
    if (queryWords.length > 0) {
      const coverageRatio = matchedWordsCount / queryWords.length;
      score = score * coverageRatio;
    }

    return { ...art, score };
  });

  return scored
    .filter(art => art.score >= 15)
    .sort((a, b) => b.score - a.score);
}

// 1. Vector Cosine Similarity Search Engine & Highlight Extractor
export async function searchHelpArticles(query: string) {
  try {
    const wsId = await getCurrentWorkspaceId();
    const user = await getUser();
    const cleanQuery = query.trim();
    if (!cleanQuery) return { data: [], searchLogId: null };

    const supabase = await createServerClient();
    let results: any[] = [];
    const embedding = await generateEmbedding(cleanQuery);

    if (embedding) {
      // Call Supabase RPC matching HNSW index cosine distance
      const { data, error } = await supabase.rpc('match_help_articles', {
        query_embedding: embedding,
        match_threshold: 0.15,
        match_count: 6
      });
      if (error) throw error;
      results = data || [];
    } else {
      // Advanced fuzzy client-side fallback text match
      const { data, error } = await supabase
        .from('help_articles')
        .select('id, slug, title, body_plain, category, content_json, video_url, video_chapters_json, faq_json, helpful_yes, helpful_no, last_reviewed_at');
      if (error) throw error;
      const matched = fuzzySearch(data || [], cleanQuery);
      results = matched.map(art => ({
        ...art,
        similarity: Math.min(0.99, art.score / 100)
      })).slice(0, 6);
    }

    // Dynamic Excerpt Highlight Pipeline
    const processedResults = results.map(item => {
      const text = item.body_plain || '';
      const queryLower = cleanQuery.toLowerCase();
      const sentenceRegex = /[^.!?]*[.!?]/g;
      const sentences = text.match(sentenceRegex) || [text];
      
      let excerpt = '';
      for (const sentence of sentences) {
        if (sentence.toLowerCase().includes(queryLower)) {
          excerpt = sentence.trim();
          break;
        }
      }
      
      if (!excerpt) {
        excerpt = text.substring(0, 140).trim() + (text.length > 140 ? '...' : '');
      } else {
        excerpt = `... ${excerpt} ...`;
      }

      return {
        ...item,
        excerpt,
        keyword_focus: cleanQuery
      };
    });

    // Logging search event to help_search_log
    const { data: logRecord } = await supabase.from('help_search_log').insert({
      workspace_id: wsId || null,
      user_id: user?.id || null,
      search_query: cleanQuery,
      results_count: processedResults.length
    }).select('id').single();

    return { 
      data: processedResults, 
      searchLogId: logRecord?.id || null,
      embeddings_active: !!embedding
    };

  } catch (error: any) {
    logger.error({ err: error, query }, 'help.articles.search.failed');
    return { error: 'Search failed. Please try again.', data: [], searchLogId: null };
  }
}

// 2. Click Telemetry logger
export async function logSearchClick(logId: string, articleId: string) {
  try {
    const supabase = await createServerClient();
    const wsId = await getCurrentWorkspaceId();
    const { error } = await supabase
      .from('help_search_log')
      .update({ selected_article_id: articleId, clicked_at: new Date().toISOString() })
      .eq("id", logId).eq("workspace_id", wsId);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    logger.error({ err: error, logId, articleId }, 'help.search_click.log.failed');
    return { error: 'Failed to log click.' };
  }
}

// 3. Feedback Mutator
export async function submitHelpFeedback(articleId: string, isHelpful: boolean) {
  try {
    const supabase = await createServerClient();
    const wsId = await getCurrentWorkspaceId();
    const { data: current } = await supabase.from('help_articles').select('helpful_yes, helpful_no').eq("id", articleId).eq("workspace_id", wsId).eq('workspace_id', wsId).single();
    if (!current) throw new NotFoundError('Help article');

    const updates = isHelpful 
      ? { helpful_yes: (current.helpful_yes || 0) + 1 }
      : { helpful_no: (current.helpful_no || 0) + 1 };

    const { error } = await supabase.from('help_articles').update(updates).eq("id", articleId).eq("workspace_id", wsId);
    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    logger.error({ err: error, articleId }, 'help.feedback.submit.failed');
    const clientError = toClientError(error);
    return { error: clientError.error };
  }
}

// 4. Retrieve single article by slug
export async function getHelpArticle(slug: string) {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('help_articles')
      .select('*')
      .eq('slug', slug)
      .single();
    if (error) throw error;
    return { data };
  } catch (error: any) {
    logger.error({ err: error, slug }, 'help.article.fetch.failed');
    return { error: 'Failed to fetch article.' };
  }
}

// 5. Seed Help Articles list (Phase 1: 30 guides)
export async function seedHelpArticles() {
  try {
    const supabase = await createServerClient();
    
    // Check if seeded already
    const { count } = await supabase.from('help_articles').select('*', { count: 'exact', head: true });
    if (count && count >= 120) {
      return { success: true, message: 'Articles library is already fully seeded.', count };
    }

    // Getting Started Category Guides (12 Articles)
    const gettingStarted: any[] = [
      {
        slug: 'workspace-configurations',
        category: 'Getting Started',
        title: 'Workspace Configurations and Parameters',
        body_plain: 'Configure and parameterise your LeadsMind account dashboard context. Update business titles, billing currency, operational local hours, and timezones to adjust campaign analytics dashboards.',
        content_json: [
          { step: 1, title: 'Navigate to Admin Parameters', description: 'Log in and click the settings gear inside the sidebar left panel.' },
          { step: 2, title: 'Input Core Branding Parameters', description: 'Set business name, tax identification headers, and support email channels.' },
          { step: 3, title: 'Save Configurations', description: 'Press the save button on the dashboard header to update cached metadata.' }
        ],
        faq_json: [
          { q: 'Can I create multiple workspaces?', a: 'Yes. LeadsMind supports multi-workspace operations scoped isolated by cookies.' },
          { q: 'Where are workspace settings saved?', a: 'Stored natively inside the workspaces Supabase relational table.' }
        ]
      },
      {
        slug: 'setup-tracking-matrices',
        category: 'Getting Started',
        title: 'Setup Tracking Matrices & Converters',
        body_plain: 'Setup tracking metrics to register incoming client lead footprints. Enable analytics tags, configure custom domain parameters, and establish visual session trackers.',
        content_json: [
          { step: 1, title: 'Open Tracking Canvas', description: 'Click Analytics inside the sidebar menu navigation structure.' },
          { step: 2, title: 'Embed Google/Facebook Tags', description: 'Copy pixel IDs into input fields to fire tracking events.' }
        ],
        faq_json: [{ q: 'Does this track scroll depth?', a: 'Yes, page metrics log scroll percentages and reading time.' }]
      },
      {
        slug: 'bank-feed-fnb',
        category: 'Getting Started',
        title: 'Connecting FNB Bank Feeds',
        body_plain: 'Connect FNB banking feeds into billing accounting ledger. Map bank deposits to invoices automatically using matching transaction references.',
        content_json: [
          { step: 1, title: 'Access Bank Integrations', description: 'Go to Billings panel and select Add Bank Connection.' },
          { step: 2, title: 'FNB Authenticate Screen', description: 'Authenticate using corporate credentials secure redirect.' }
        ],
        faq_json: [{ q: 'Are bank details encrypted?', a: 'All credentials are encrypted using bank-grade secure layers.' }]
      },
      {
        slug: 'bank-feed-absa',
        category: 'Getting Started',
        title: 'Connecting Absa Bank Feeds',
        body_plain: 'Link Absa transactional bank statements with financial ledger templates. Reconcile invoices automatically on incoming client funds.',
        content_json: [
          { step: 1, title: 'Select Absa Bank Link', description: 'Open Billing ledger and choose Absa feed setup.' },
          { step: 2, title: 'Map Account Details', description: 'Enter business check account numbers to trigger statement pulling.' }
        ],
        faq_json: [{ q: 'How often do statements sync?', a: 'Flares statement pulls are executed automatically every 24 hours.' }]
      },
      {
        slug: 'bank-feed-nedbank',
        category: 'Getting Started',
        title: 'Connecting Nedbank Bank Feeds',
        body_plain: 'Connect Nedbank corporate transactional accounts to reconcile invoice ledgers. Verify matching client transactions automatically.',
        content_json: [
          { step: 1, title: 'Select Nedbank Gateway', description: 'Go to Financial settings and choose Nedbank integration.' },
          { step: 2, title: 'Authorize Consent forms', description: 'Sign the Nedbank data consent form to allow secure transaction syncs.' }
        ],
        faq_json: [{ q: 'Can I revoke bank syncs?', a: 'Yes. Disconnect the NED bank feed from the dashboard interface in one click.' }]
      },
      {
        slug: 'bank-feed-standard-bank',
        category: 'Getting Started',
        title: 'Connecting Standard Bank Feeds',
        body_plain: 'Integrate Standard Bank check accounts. Automate transaction allocations to client invoices, credits, and ledger updates.',
        content_json: [
          { step: 1, title: 'Standard Bank Setup', description: 'Select Standard Bank from banking providers checklist.' },
          { step: 2, title: 'Link Transaction Channels', description: 'Assign checked accounts to map payment logs.' }
        ],
        faq_json: [{ q: 'Are Standard Bank feeds real-time?', a: 'Sync cycles run every morning at 05:00 SAST.' }]
      },
      {
        slug: 'bank-feed-capitec',
        category: 'Getting Started',
        title: 'Connecting Capitec Business Bank Feeds',
        body_plain: 'Reconcile Capitec business feeds. Track incoming client fees and update invoicing balances instantly.',
        content_json: [
          { step: 1, title: 'Capitec Setup', description: 'Choose Capitec Business from banking page.' },
          { step: 2, title: 'Reconcile Ledger Settings', description: 'Configure matching rules based on customer name.' }
        ],
        faq_json: [{ q: 'Does Capitec support personal banking feeds?', a: 'Only Capitec Business profiles are supported.' }]
      },
      {
        slug: 'brand-voice-setups',
        category: 'Getting Started',
        title: 'Configuring Brand Voice parameters',
        body_plain: 'Set up brand tone profiles, focus industries, target audiences, and vocabulary preferences to adjust AI article copywriting styles.',
        content_json: [
          { step: 1, title: 'Open Brand Settings', description: 'Go to settings and select Workspace Branding.' },
          { step: 2, title: 'Specify Tone Parameters', description: 'Configure professional, analytical, or casual voice presets.' }
        ],
        faq_json: [{ q: 'Where is brand voice used?', a: 'Injected into OpenAI prompt payloads for social and brief generation.' }]
      },
      {
        slug: 'whatsapp-business-workflows',
        category: 'Getting Started',
        title: 'WhatsApp Business Workflow Setup',
        body_plain: 'Connect WhatsApp Business API number. Build automated auto-responders and routing steps to assign conversations to support agents.',
        content_json: [
          { step: 1, title: 'WhatsApp Integration Link', description: 'Go to CRM integrations and click Connect WhatsApp.' },
          { step: 2, title: 'Enter API Key settings', description: 'Input your Meta WhatsApp ID and client tokens.' }
        ],
        faq_json: [{ q: 'Can I send bulk messages?', a: 'Yes, using approved Meta message templates only.' }]
      },
      {
        slug: 'domain-connection-guide',
        category: 'Getting Started',
        title: 'Custom Domain Connection & Verification',
        body_plain: 'Verify custom domain parameters (help.yourdomain.com) to publish web funnels and documentation sites.',
        content_json: [
          { step: 1, title: 'Enter Domain URL', description: 'Go to Settings > Domain Configurations.' },
          { step: 2, title: 'Configure DNS settings', description: 'Add CNAME records pointing to LeadsMind proxy servers.' }
        ],
        faq_json: [{ q: 'Are SSL certificates free?', a: 'LeadsMind automatically provisions free SSL on successful verification.' }]
      },
      {
        slug: 'team-onboarding-procedures',
        category: 'Getting Started',
        title: 'Team Onboarding & Permission Levels',
        body_plain: 'Invite team members to your active workspace. Assign custom roles like Admin, Editor, CRM Manager, or Accountant.',
        content_json: [
          { step: 1, title: 'Send Invite Email', description: 'Go to Team settings and type partner email.' },
          { step: 2, title: 'Assign Permissions Options', description: 'Select target workspace role check list.' }
        ],
        faq_json: [{ q: 'Can I restrict database access?', a: 'Yes, custom role parameters prevent non-admin views.' }]
      },
      {
        slug: 'billing-invoicing-setup',
        category: 'Getting Started',
        title: 'LeadsMind Invoicing Settings Setup',
        body_plain: 'Configure invoice numbering sequences, tax rates, standard payment bank details, and currency conversions.',
        content_json: [
          { step: 1, title: 'Select Billing Details', description: 'Go to Billing > Invoice Configurations.' },
          { step: 2, title: 'Set Standard Terms', description: 'Specify payment terms (e.g. 7 days, 30 days) and tax parameters.' }
        ],
        faq_json: [{ q: 'Does it support VAT?', a: 'Yes. Customize tax rates up to 15% VAT for South African businesses.' }]
      }
    ];

    // CRM Foundations Category Guides (18 Articles)
    const crmFoundations: any[] = [
      {
        slug: 'pipeline-configurations',
        category: 'CRM Foundations',
        title: 'Deal Pipelines & Stage Customisation',
        body_plain: 'Build customized deal tracking boards. Map client sales paths into stages (e.g., Prospect, Lead, Quote, Win).',
        content_json: [
          { step: 1, title: 'Create Pipeline Board', description: 'Go to CRM Pipelines and select Create Pipeline.' },
          { step: 2, title: 'Arrange Column stages', description: 'Add and drag card stages to represent workflow stages.' }
        ],
        faq_json: [{ q: 'Can I run multiple pipelines?', a: 'Yes. Scopes allow unlimited deal pipeline variations.' }]
      },
      {
        slug: 'tag-segment-workflows',
        category: 'CRM Foundations',
        title: 'Dynamic Contacts Tagging & Segments',
        body_plain: 'Tag client contacts to create dynamic filter segments. Automatically trigger emails on tag insertions.',
        content_json: [
          { step: 1, title: 'Define Tag Keys', description: 'Go to CRM Settings > Contact Tags.' },
          { step: 2, title: 'Create Segment filters', description: 'Add logical rules (e.g., Tag is "Warm Lead") to cluster profiles.' }
        ],
        faq_json: [{ q: 'Can tags launch automations?', a: 'Yes. Setting triggers is fully supported.' }]
      },
      {
        slug: 'custom-data-fields',
        category: 'CRM Foundations',
        title: 'Creating CRM Custom Data Fields',
        body_plain: 'Add custom fields (text, number, checkboxes) to contact profiles. Capture specific onboarding metadata.',
        content_json: [
          { step: 1, title: 'Add Custom Column', description: 'Go to CRM Contacts > Custom Fields.' },
          { step: 2, title: 'Select data type parameter', description: 'Configure text box, dropdown, or numeric limits.' }
        ],
        faq_json: [{ q: 'Is there a fields limit?', a: 'No. Dynamic column sizing is supported.' }]
      },
      {
        slug: 'layout-interaction-tracking',
        category: 'CRM Foundations',
        title: 'Layout Interaction Tracking Systems',
        body_plain: 'Track visitor interaction parameters on websites and funnels. Log button clicks, scrolling depths, and download inputs.',
        content_json: [
          { step: 1, title: 'Embed tracking pixel', description: 'Ensure the tracking script is active in custom domain setups.' },
          { step: 2, title: 'Review visitor logs', description: 'Check CRM profile pages to trace visitor session streams.' }
        ],
        faq_json: [{ q: 'Does this track page impressions?', a: 'Yes, metrics include impressions and session duration.' }]
      },
      {
        slug: 'facebook-lead-ads-sync',
        category: 'CRM Foundations',
        title: 'Facebook Lead Ads Direct Synchronisation',
        body_plain: 'Connect Facebook Ads Manager accounts. Push lead form submissions instantly into CRM pipelines.',
        content_json: [
          { step: 1, title: 'Authenticate Facebook', description: 'Go to Integrations > Connect Facebook Business.' },
          { step: 2, title: 'Map Lead form fields', description: 'Match Meta questions with CRM contact attributes.' }
        ],
        faq_json: [{ q: 'Do leads sync in real-time?', a: 'Yes. Dynamic webhooks populate CRM fields instantly.' }]
      },
      {
        slug: 'contact-importing-guide',
        category: 'CRM Foundations',
        title: 'Importing Contacts from CSV and Excel',
        body_plain: 'Import bulk contact lists. Map columns like name, email, phone numbers, and tags into workspace records.',
        content_json: [
          { step: 1, title: 'Upload Excel/CSV file', description: 'Go to Contacts > Import.' },
          { step: 2, title: 'Resolve header columns', description: 'Connect CSV columns to CRM database fields.' }
        ],
        faq_json: [{ q: 'How are duplicate emails resolved?', a: 'LeadsMind merges contacts automatically based on email match.' }]
      },
      {
        slug: 'lead-scoring-rules',
        category: 'CRM Foundations',
        title: 'Lead Scoring Metrics & Rules',
        body_plain: 'Assign scores (points) based on contact actions (e.g. email click, form submit) to identify hot prospects.',
        content_json: [
          { step: 1, title: 'Create Scoring System', description: 'Go to CRM Settings > Lead Scoring.' },
          { step: 2, title: 'Add Score rules', description: 'Define value changes (e.g. +10 points for pricing page visit).' }
        ],
        faq_json: [{ q: 'Can score transitions trigger notifications?', a: 'Yes, score levels can trigger automated notifications to agents.' }]
      },
      {
        slug: 'email-campaign-builder',
        category: 'CRM Foundations',
        title: 'Designing Campaigns in Email Builder',
        body_plain: 'Build custom HTML newsletter templates. Select target lists and track open rates, bounce logs, and link clicks.',
        content_json: [
          { step: 1, title: 'Select Newsletter Theme', description: 'Go to Marketing > Email Campaigns.' },
          { step: 2, title: 'Design content layout', description: 'Input text, buttons, images, and brand colors.' }
        ],
        faq_json: [{ q: 'Is there a daily send limit?', a: 'Limits depend on connected SMTP settings.' }]
      },
      {
        slug: 'sms-gateway-integration',
        category: 'CRM Foundations',
        title: 'Configuring SMS Gateway integrations',
        body_plain: 'Set up SMS delivery networks to automate outbound text alerts, meeting reminders, and updates.',
        content_json: [
          { step: 1, title: 'Select SMS Provider', description: 'Go to settings and select Integrations > SMS Gateway.' },
          { step: 2, title: 'Enter credentials keys', description: 'Input API credentials from Twilio or BulkSMS accounts.' }
        ],
        faq_json: [{ q: 'Does it support reply tracking?', a: 'Yes, if configured with dynamic virtual reply numbers.' }]
      },
      {
        slug: 'calendar-scheduler-integration',
        category: 'CRM Foundations',
        title: 'Calendar Booking schedules setups',
        body_plain: 'Activate booking pages. Define timeslot sizes, service charges, buffers, and meeting location options.',
        content_json: [
          { step: 1, title: 'Create Booking Portal', description: 'Go to Calendar > Schedule Widgets.' },
          { step: 2, title: 'Configure Available hours', description: 'Specify weekly operational time intervals.' }
        ],
        faq_json: [{ q: 'Does this link with Google Calendar?', a: 'Yes, supports bidirectional calendar sync.' }]
      },
      {
        slug: 'task-manager-kanban',
        category: 'CRM Foundations',
        title: 'Task Management & Project Kanban',
        body_plain: 'Manage workspace internal operations. Group tasks by client, allocate task owners, and assign deadlines.',
        content_json: [
          { step: 1, title: 'Add Project board', description: 'Go to Tasks and select Create Board.' },
          { step: 2, title: 'Assign team members', description: 'Select user checklist to allocate target deadlines.' }
        ],
        faq_json: [{ q: 'Can clients view these boards?', a: 'By default, boards are kept private to workspace members.' }]
      },
      {
        slug: 'contract-signatures',
        category: 'CRM Foundations',
        title: 'Proposals Studio & Electronic Signatures',
        body_plain: 'Create and send professional client proposals. Track digital signature confirmations directly inside CRM.',
        content_json: [
          { step: 1, title: 'Create Proposal Template', description: 'Go to Marketing > Proposals.' },
          { step: 2, title: 'Embed E-signature block', description: 'Drag the signature widget to the bottom of the proposal document.' }
        ],
        faq_json: [{ q: 'Are digital signatures legally binding?', a: 'Yes, they adhere to standard secure audit log validation rules.' }]
      },
      {
        slug: 'payment-gateways',
        category: 'CRM Foundations',
        title: 'Connecting Yoco, PayFast, & Stripe',
        body_plain: 'Process checkouts and charge invoices using top payment processors. Connect local gateways easily.',
        content_json: [
          { step: 1, title: 'Choose Checkout Gateways', description: 'Go to billing settings > Payment Gateways.' },
          { step: 2, title: 'Link API keys', description: 'Provide payment tokens (e.g. Yoco secret keys, PayFast Merchant IDs).' }
        ],
        faq_json: [{ q: 'Are cards processed securely?', a: 'Payment gateways verify details through secure PCI-DSS portals.' }]
      },
      {
        slug: 'reputation-management',
        category: 'CRM Foundations',
        title: 'Reputation Automation & Google Reviews',
        body_plain: 'Build automated campaigns requesting reviews. Sync with Google Business Profile to track reviews.',
        content_json: [
          { step: 1, title: 'Connect Google Business API', description: 'Go to Reputation and click Connect Account.' },
          { step: 2, title: 'Set Review requests', description: 'Configure email/sms templates fired automatically upon invoice payments.' }
        ],
        faq_json: [{ q: 'Can I hide negative reviews?', a: 'Google policy forbids editing reviews, but automation helps collect positive scores.' }]
      },
      {
        slug: 'funnel-website-builder',
        category: 'CRM Foundations',
        title: 'Funnels & Landing Page Web Builders',
        body_plain: 'Build landing pages to collect prospect files. Drag-and-drop structural elements, buttons, and lead forms.',
        content_json: [
          { step: 1, title: 'Create landing page', description: 'Go to Website Builder and select Funnels.' },
          { step: 2, title: 'Drag web blocks', description: 'Place text panels, cover images, forms, and buttons.' }
        ],
        faq_json: [{ q: 'Can I export page code?', a: 'Pages run natively inside LeadsMind high-speed server cache.' }]
      },
      {
        slug: 'chat-widget-installation',
        category: 'CRM Foundations',
        title: 'Live Chat Widget configuration',
        body_plain: 'Add live chat widget script to your external websites. Route visitor messages into the LeadsMind Unified Inbox.',
        content_json: [
          { step: 1, title: 'Get Widget Script', description: 'Go to Messaging > Live Chat Configurations.' },
          { step: 2, title: 'Place code before body tag', description: 'Copy and paste the HTML script snippet into your website header.' }
        ],
        faq_json: [{ q: 'Does chat support offline messages?', a: 'Yes, chats ask visitors for details when offline.' }]
      },
      {
        slug: 'automatic-lead-routing',
        category: 'CRM Foundations',
        title: 'Automatic Lead Routing & Assignments',
        body_plain: 'Configure round-robin rules to distribute incoming contacts to team members based on rules.',
        content_json: [
          { step: 1, title: 'Select Lead Routing rules', description: 'Go to CRM Settings > Routing Rules.' },
          { step: 2, title: 'Assign team members list', description: 'Choose team list to receive round-robin shares.' }
        ],
        faq_json: [{ q: 'Can I scope routing by criteria?', a: 'Yes, filters allow routing based on country, score, or form field values.' }]
      },
      {
        slug: 'system-telemetry-reports',
        category: 'CRM Foundations',
        title: 'Reading Financial Ledgers & CRM Reports',
        body_plain: 'Analyse campaign, finance, and pipeline logs. Export clean Excel grids matching performance summaries.',
        content_json: [
          { step: 1, title: 'Access CRM Reports', description: 'Go to reports and select Analytics dashboards.' },
          { step: 2, title: 'Filter by date range', description: 'Adjust dates to verify conversion trends.' }
        ],
        faq_json: [{ q: 'Can reports be scheduled?', a: 'Yes, choose automatic PDF email schedules.' }]
      }
    ];

    const categoriesMatrix = [
      {
        name: 'LMS Advanced Workflows',
        count: 15,
        topics: [
          'Certificate asset templates design and allocation',
          'SCORM compilation uploads and packaging verification',
          'NQF tracking mechanics and credits evaluation',
          'BBBEE skills development training record calculators',
          'Learner onboarding and course registration limits',
          'Gradebook configuration and assessment weighting rules',
          'Quiz design and randomized question bank pools',
          'LMS portal white-labeling and domain setup',
          'Instructor assignments and automated grading flows',
          'Drip content scheduling and prerequisites checks',
          'Video completion threshold validation rules',
          'Student discussion boards moderation controls',
          'Course evaluation surveys and feedback matrices',
          'Continuing Professional Development (CPD) points tracker',
          'LMS telemetry logs and completion certificates'
        ]
      },
      {
        name: 'Accounting & Finance',
        count: 16,
        topics: [
          'VAT201 return compilations and SARS upload guides',
          'Payroll generation configurations and employee codes',
          'PAYE/UIF/SDL tax ledger matching and allocation rules',
          'IRP6 provisional tax alert setups and thresholds',
          'Bank statement reconciliation and ledger alignment',
          'General ledger structures and double-entry mapping',
          'Accounts payable aging trackers and vendor checks',
          'Accounts receivable recovery workflows and limits',
          'SARS eFiling direct dashboard integration connection',
          'Fixed asset registers and depreciation calculators',
          'Balance sheet compiling and comparative analysis logs',
          'Cash flow projections and forecasting tools configuration',
          'Expense receipt OCR scan processing and categories matching',
          'Audit trail verification and workspace modifications log',
          'Managing financial years and closing periods routines',
          'SARS audit assistance logs package preparation'
        ]
      },
      {
        name: 'Invoicing & Automated Payments',
        count: 12,
        topics: [
          'PayFast checkout gateway hookups and merchant verification',
          'Multi-currency templates and dynamic foreign currency tags',
          'Recurring subscription structures and retry rules',
          'Yoco checkout gateway integration setups',
          'Stripe subscription webhooks and webhook matching rules',
          'Invoice payment reminders and grace period alerts',
          'Credit note generation and partial refunds setups',
          'Managing customer credit balances and deposit allocations',
          'Automated estimate-to-invoice pipeline transitions',
          'Processing batch invoices for client cohorts',
          'Customizing CSS on invoice layout sheets',
          'Verifying transaction history logs and gateway responses'
        ]
      },
      {
        name: 'Email Marketing System',
        count: 10,
        topics: [
          'POPIA-compliant subscription configurations and options',
          'Opt-out handler tracking and unsubscribe rules',
          'Domain verification steps (SPF, DKIM, DMARC key records)',
          'Newsletter email template design layouts',
          'Managing opt-in consent logs and verification status',
          'Automated bounce verification and blacklist cleaner',
          'A/B testing campaign subject lines and tracking clicks',
          'Email sender profile configuration options',
          'Spam score optimizer and content validation checklist',
          'Aggregated email deliverability telemetry records'
        ]
      },
      {
        name: 'Workflow Automation',
        count: 14,
        topics: [
          'Complex conditional branching setups and pathways',
          'Webhook triggers and custom payload parsing rules',
          'GoHighLevel migration recipes and field maps',
          'Zapier integrations setup and credential validation',
          'Automation logs monitoring and error retries',
          'Scheduled delays and wait-until condition triggers',
          'Lead assignment round-robin automation paths',
          'Contact updates triggers and field synchronisation rules',
          'Dynamic tag triggers and auto email responses',
          'SMS template automations for customer meetings',
          'Abandoned cart sequence configurations and times',
          'Custom webhook notifications to external platforms',
          'Database updates event-driven automation rules',
          'Troubleshooting failed trigger conditions guides'
        ]
      },
      {
        name: 'System Controls & Extensions',
        count: 23,
        topics: [
          'AI Tools/ARIA controls and screen-reader standards',
          'White-label Agency features and custom color systems',
          'Mobile App biometric setups and face/touch ID parameters',
          'Billing tracking interfaces and resource quotas monitoring',
          'Single Sign-On (SSO) SAML connection guidelines',
          'Multi-Factor Authentication (MFA) enforcement rules',
          'Workspace API key generation and usage controls',
          'Audit logs query filter setups and access tracking',
          'Setting system backup targets and recovery routines',
          'Bi-directional synchronization for CRM platforms',
          'White-label portal widgets code injections',
          'Workspace deletion guidelines and metadata backups',
          'Global layout templates and sidebar configuration options',
          'Custom role permissions matrices definitions',
          'Setting storage buckets and CDN proxy guidelines',
          'Configuring system status pages and alerts thresholds',
          'Webhooks logging and performance monitoring dashboards',
          'Biometric app registration validation rules',
          'White-label agent profiles custom DNS setup',
          'AI chatbot limits and prompt token quotas configurations',
          'External integrations credential storage guidelines',
          'Managing workspace billing cycles and plans selection',
          'Technical diagnostics dump export routines'
        ]
      }
    ];

    const phase2Articles: any[] = [];
    for (const cat of categoriesMatrix) {
      for (let i = 0; i < cat.count; i++) {
        const topic = cat.topics[i] || `${cat.name} Process Guide Part ${i + 1}`;
        const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        
        phase2Articles.push({
          slug,
          category: cat.name,
          title: topic.charAt(0).toUpperCase() + topic.slice(1),
          body_plain: `Step-by-step documentation regarding ${topic}. This walkthrough helps administrators configure ${cat.name} features, verify settings, and execute optimal setup guidelines within the LeadsMind CRM platform environment.`,
          content_json: [
            { step: 1, title: 'Locate Feature Control', description: `Open the ${cat.name} section inside your workspace dashboard settings.` },
            { step: 2, title: 'Configure Attributes & Settings', description: `Verify the parameters corresponding to: ${topic}. Adjust values according to company parameters.` },
            { step: 3, title: 'Save & Test Live Gateway', description: 'Click Save, verify connection outputs, and confirm the configuration state reports active.' }
          ],
          faq_json: [
            { q: `Where is the configuration for ${topic} located?`, a: `Available under the main settings matrix under ${cat.name}.` },
            { q: `Does this require admin role credentials?`, a: 'Yes, setting updates require write permissions.' }
          ]
        });
      }
    }

    const allArticles = [...gettingStarted, ...crmFoundations, ...phase2Articles];
    
    // Seed sequentially (mock embeddings for now, pgvector allows NULL embeddings)
    let seededCount = 0;
    for (const article of allArticles) {
      // Check if exists
      const { data: existing } = await supabase.from('help_articles').select('id').eq('slug', article.slug).maybeSingle();
      if (!existing) {
        // Generate embedding (using title + body to create search token space)
        const embedText = `${article.title}. ${article.body_plain}`;
        const embeddingVec = await generateEmbedding(embedText);

        const { error } = await supabase.from('help_articles').insert({
          ...article,
          embedding: embeddingVec || null,
          video_url: 'https://iframe.videodelivery.net/fc1a4f009e53094c4892c53f080f55cf' // default placeholder Cloudflare stream
        });
        if (error) {
          logger.error({ err: error, slug: article.slug }, 'help.articles.seed_article.failed');
        } else {
          seededCount++;
        }
      }
    }

    revalidatePath('/articles');
    return { success: true, count: seededCount, message: `Successfully seeded ${seededCount} new articles.` };

  } catch (error: any) {
    logger.error({ err: error }, 'help.articles.seed.failed');
    return { error: 'Failed to seed articles.' };
  }
}

// 6. smart Support Ticket escalation packaging mechanics
export async function createSupportTicketFromLena(payload: {
  title: string;
  history: any[];
  diagnostics: any;
  screenLocation: string;
}) {
  let wsId: string | null = null;
  try {
    wsId = await getCurrentWorkspaceId();
    if (!wsId) throw new ValidationError('No active workspace context');
    const user = await getUser();
    const supabase = await createServerClient();
    
    // Structure description with diagnostic parameters and context packaging
    const detailedDescription = `
[LENA SYSTEM DIAGNOSTIC ESCALATION]
User Query: ${payload.title}
Active Platform Screen: ${payload.screenLocation}

--- PACKAGED DIAGNOSTICS ---
${JSON.stringify(payload.diagnostics, null, 2)}

--- CHAT DIALOGUE HISTORY ---
${payload.history.map(m => `[${m.role.toUpperCase()}]: ${m.content}`).join('\n')}
    `.trim();

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({
        workspace_id: wsId,
        title: `[LENA] ${payload.title.substring(0, 80)}${payload.title.length > 80 ? '...' : ''}`,
        description: detailedDescription,
        priority: 'high',
        status: 'open',
        assigned_to: null
      })
      .select('id')
      .single();

    if (error) throw error;
    return { success: true, ticketId: ticket.id };

  } catch (error: any) {
    logger.error({ err: error, workspaceId: wsId }, 'help.support_ticket.escalation.failed');
    const clientError = toClientError(error);
    return { error: clientError.error };
  }
}

// 7. Get contextual articles by path mappings
export async function getContextualArticles(pathname: string) {
  try {
    const supabase = await createServerClient();
    
    // Map URL segments to category search tokens
    let searchToken = 'Getting Started';
    if (pathname.includes('/contacts')) searchToken = 'Workspace Setup';
    else if (pathname.includes('/pipelines')) searchToken = 'Pipeline';
    else if (pathname.includes('/invoices')) searchToken = 'Payment';
    else if (pathname.includes('/calendar')) searchToken = 'Booking';
    else if (pathname.includes('/automations')) searchToken = 'Workflow';
    else if (pathname.includes('/websites') || pathname.includes('/funnels')) searchToken = 'Landing Page';
    else if (pathname.includes('/campaigns')) searchToken = 'Email Campaign';
    else if (pathname.includes('/support')) searchToken = 'Live Chat';

    const { data: articles, error } = await supabase
      .from('help_articles')
      .select('id, slug, title, body_plain, category')
      .ilike('title', `%${searchToken}%`)
      .limit(3);

    if (error) throw error;

    // Fallback if no matching records found
    if (!articles || articles.length === 0) {
      const { data: fallback } = await supabase
        .from('help_articles')
        .select('id, slug, title, body_plain, category')
        .eq('category', 'Getting Started')
        .limit(3);
      return { data: fallback || [] };
    }

    return { data: articles };
  } catch (error: any) {
    logger.error({ err: error, pathname }, 'help.contextual_articles.fetch.failed');
    return { error: 'Failed to fetch contextual articles.' };
  }
}
