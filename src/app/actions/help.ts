'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
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

// 5. Seed Help Articles list.
// Content is code-verified against the real implementation (server actions, API
// routes, migrations) rather than invented from plausible-sounding topic names.
// Anything that could not be confirmed in code (named bank integrations that do
// not exist, SSO/SAML, mobile biometric login, SCORM runtime, etc.) is either
// omitted or explicitly called out as not implemented, so the LENA assistant
// that reads this table never confidently states something untrue.
//
// Two categories used below (Social Media, AI Tools) require the
// help_articles_category_check constraint added in migration
// 20260826000000_help_articles_add_categories.sql. Until that migration has
// been applied, inserts for those categories fall back to an existing allowed
// category (see CATEGORY_FALLBACK) so seeding still succeeds; re-run this
// function after applying the migration and it will not touch already-inserted
// rows (upsert is keyed by slug) — a one-off UPDATE moving those slugs to their
// intended category is the only remaining step.
const CATEGORY_FALLBACK: Record<string, string> = {
  'Social Media': 'CRM Foundations',
  'AI Tools': 'System Controls & Extensions',
};

export async function seedHelpArticles() {
  try {
    // Runs unauthenticated on every /articles page load to keep the KB
    // upserted (see src/app/articles/page.tsx). help_articles write access
    // is now service_role-only, so this must use the admin client rather
    // than the session-bound server client.
    const supabase = createAdminClient();

    // Getting Started Category Guides
    const gettingStarted: any[] = [
      {
        slug: 'product-overview',
        category: 'Getting Started',
        title: 'What Is LeadsMind? Product Overview',
        body_plain: 'LeadsMind is an all-in-one business platform combining CRM (pipelines, contacts, lead scoring, calendar booking), Finance and Invoicing (double-entry accounting, payroll, payment gateways, revenue forecasting), an LMS for courses and certificates, Email Marketing, Social media posting and analytics, AI Tools for content and image generation, Workflow Automation, and workspace-level System Controls like white-labeling and API keys. It is built as a single connected workspace rather than separate disconnected tools.',
        content_json: [
          { step: 1, title: 'Explore the Sidebar', description: 'Each module — CRM & Sales, Marketing, Social, Finance & Accounting, Commerce & Ops, HR & Payroll, Learning, Communication, Settings — has its own section in the sidebar.' },
          { step: 2, title: 'Start with Getting Started', description: 'Set up your workspace branding, invite your team, and connect the integrations relevant to you.' },
          { step: 3, title: 'Ask LENA for Specifics', description: 'For how any specific module or feature works, ask a more specific question — LENA answers from the real, verified help documentation for each module.' }
        ],
        faq_json: [
          { q: 'What does LeadsMind provide?', a: 'A connected CRM, Finance/Invoicing, LMS, Email Marketing, Social, AI Tools, and Workflow Automation platform in a single workspace — see the module-specific help articles for exactly what each one does and does not do today.' },
          { q: 'Is LeadsMind built for a specific industry?', a: 'It is a general business platform, with some features (VAT-aware invoicing fields, SARS-bracket payroll, PayFast/local gateways) specifically built for South African businesses.' }
        ]
      },
      {
        slug: 'workspace-branding-settings',
        category: 'Getting Started',
        title: 'Workspace Branding and Company Profile',
        body_plain: 'Update your workspace name, logo, brand colors, typography, and company KYC details (registered name, registration number) from Settings then Workspace. Renaming the workspace requires the admin or owner role.',
        content_json: [
          { step: 1, title: 'Open Workspace Settings', description: 'Go to Settings and select the Workspace tab.' },
          { step: 2, title: 'Update Branding Fields', description: 'Change the logo, brand colors, fonts, and KYC company details.' },
          { step: 3, title: 'Save Changes', description: 'Click Save. The new branding applies across the dashboard immediately.' }
        ],
        faq_json: [
          { q: 'Can I set a workspace-level currency or timezone?', a: 'No, LeadsMind does not currently have a workspace-level currency or timezone setting. Currency is set per invoice or order instead, and defaults to ZAR.' },
          { q: 'Who can rename the workspace?', a: 'Only users with the admin or owner role.' }
        ]
      },
      {
        slug: 'team-invites-roles',
        category: 'Getting Started',
        title: 'Inviting Team Members and Understanding Roles',
        body_plain: 'Invite teammates from Settings then Team by entering their email and selecting a role. LeadsMind currently supports four fixed roles: admin, hr, payroll, and viewer, each gating access to a different set of sections.',
        content_json: [
          { step: 1, title: 'Open Team Settings', description: 'Go to Settings then Team.' },
          { step: 2, title: 'Send an Invite', description: 'Click Invite and enter the teammate email and role.' },
          { step: 3, title: 'Teammate Accepts', description: 'The teammate accepts the emailed invite to join the workspace.' }
        ],
        faq_json: [
          { q: 'Can I create a custom role or permissions matrix?', a: 'Not currently. Roles are fixed to admin, hr, payroll, and viewer; there is no configurable custom-permissions system yet.' }
        ]
      },
      {
        slug: 'custom-domain-connection',
        category: 'Getting Started',
        title: 'Connecting a Custom Domain',
        body_plain: 'LeadsMind supports two separate custom-domain flows. A general workspace domain is added from Settings then Custom Domains with a CNAME to domains.leadsmind.com plus a TXT verification record, moving through pending, verifying, and ssl_provisioning states to active. A second, separate flow lets you set a CNAME to cname.leadsmind.io specifically to white-label the client portal your customers log into.',
        content_json: [
          { step: 1, title: 'Choose the Right Domain Flow', description: 'Decide whether you are connecting a general workspace domain or the client-portal white-label domain.' },
          { step: 2, title: 'Add DNS Records', description: 'Add the CNAME (and TXT verification record for the general domain flow) at your DNS provider.' },
          { step: 3, title: 'Check Status', description: 'Watch the domain status move from pending or verifying to active on its settings page.' }
        ],
        faq_json: [
          { q: 'Is SSL fully automatic?', a: 'The domain has an ssl_provisioning status step visible on its settings page; check that status for your specific domain rather than assuming SSL is instant.' },
          { q: 'Are the two domain flows the same setting?', a: 'No, they are separate settings for different purposes: one for your general workspace domain, one for the client portal specifically.' }
        ]
      },
      {
        slug: 'bank-account-connections',
        category: 'Getting Started',
        title: 'Connecting Bank Accounts and Uploading Statements',
        body_plain: 'LeadsMind has one live bank API connection today: Investec, connected via OAuth and API credentials under Finance then Connected Accounts, which reads your account balances and transactions and cannot move money. For any other South African bank, including FNB, Standard Bank, Nedbank, and Discovery, you upload a CSV, OFX, or QIF statement export instead. There is no live sync for those banks.',
        content_json: [
          { step: 1, title: 'Investec: Connect Directly', description: 'Go to Finance then Connected Accounts and enter your Investec API credentials to connect live.' },
          { step: 2, title: 'Other Banks: Export a Statement', description: 'Download a CSV, OFX, or QIF statement from your bank’s own online banking.' },
          { step: 3, title: 'Upload for Reconciliation', description: 'Upload the statement file under Finance for reconciliation.' }
        ],
        faq_json: [
          { q: 'Can I connect Absa or Capitec directly the way I can with Investec?', a: 'Not through a live API today; only Investec has a direct connection. You can still reconcile Absa or Capitec activity by uploading a CSV statement export.' }
        ]
      },
      {
        slug: 'ai-brand-voice',
        category: 'Getting Started',
        title: 'Setting Your AI Brand Voice',
        body_plain: 'Under Settings then AI, add free-text tone adjectives, such as confident, warm, or direct, describing how you want your brand to sound. These adjectives are injected into AI content-generation prompts across the platform, including blog posts, social captions, and course module descriptions, as an approved stylistic tone instruction.',
        content_json: [
          { step: 1, title: 'Open AI Settings', description: 'Go to Settings then AI.' },
          { step: 2, title: 'Add Tone Adjectives', description: 'Type free-text adjective tags describing your brand voice.' },
          { step: 3, title: 'Save', description: 'Saved adjectives are automatically included in future AI generation prompts.' }
        ],
        faq_json: [
          { q: 'Are there fixed voice presets like professional or casual?', a: 'No, it is a free-text adjective tag list rather than a small set of fixed presets.' }
        ]
      },
      {
        slug: 'whatsapp-business-connection',
        category: 'Getting Started',
        title: 'Connecting WhatsApp Business',
        body_plain: 'LeadsMind has two separate WhatsApp mechanisms that do not share credentials. The first is a Meta OAuth connection powering the shared inbox and conversations, which requires a WhatsApp Business Account and, for production use with real customers, a Meta app that has completed Meta App Review. The second is a separate Twilio-based WhatsApp channel used only for automated outbound messages, such as workflow reminders, configured with your own Twilio SID, token, and number in workspace settings.',
        content_json: [
          { step: 1, title: 'Inbox Conversations: Connect via Meta', description: 'Use the Meta OAuth dialog to connect a WhatsApp Business Account for the shared inbox.' },
          { step: 2, title: 'Automation Sends: Connect via Twilio', description: 'Enter your Twilio SID, token, and WhatsApp-enabled number in workspace settings for automated outbound messages.' }
        ],
        faq_json: [
          { q: 'Do I need Meta App Review to use WhatsApp?', a: 'For the Meta OAuth inbox connection, yes: production use with real customer accounts requires your Meta app to complete App Review, and until then it may be limited to test users. The Twilio automation channel does not require Meta App Review.' }
        ]
      }
    ];

    const crmFoundations: any[] = [
      {
        slug: 'deal-pipelines-stages',
        category: 'CRM Foundations',
        title: 'Deal Pipelines and Stage Customisation',
        body_plain: 'Build custom deal-tracking boards under CRM then Pipelines, mapping your sales process into stages such as Prospect, Lead, Quote, and Won. You can create multiple pipelines for different products or teams.',
        content_json: [
          { step: 1, title: 'Create a Pipeline', description: 'Go to CRM Pipelines and select Create Pipeline.' },
          { step: 2, title: 'Arrange Stages', description: 'Add and drag stage columns to represent your sales process.' }
        ],
        faq_json: [
          { q: 'Can I run multiple pipelines at once?', a: 'Yes, LeadsMind supports unlimited pipeline variations per workspace.' }
        ]
      },
      {
        slug: 'contact-tags-segments',
        category: 'CRM Foundations',
        title: 'Tagging Contacts and Building Segments',
        body_plain: 'Tag contacts from CRM Settings then Contact Tags, then build dynamic segments in Segments using rules such as Tag is Warm Lead. The lead scoring engine also applies tags automatically, for example High Intent or Hot Lead, based on contact behaviour.',
        content_json: [
          { step: 1, title: 'Define Tags', description: 'Go to CRM Settings then Contact Tags.' },
          { step: 2, title: 'Build a Segment', description: 'Create a segment filter using tag or field rules.' }
        ],
        faq_json: [
          { q: 'Can tags trigger automations?', a: 'Yes, tag changes can be used as automation triggers.' }
        ]
      },
      {
        slug: 'creating-a-contact',
        category: 'CRM Foundations',
        title: 'Creating a Contact Manually',
        body_plain: 'Add a single contact directly from Contacts by clicking Add Contact and entering their name, email, phone, and any tags. This is separate from bulk CSV import, which is for adding many contacts at once.',
        content_json: [
          { step: 1, title: 'Open Contacts', description: 'Go to CRM then Contacts.' },
          { step: 2, title: 'Click Add Contact', description: 'Enter the contact\'s name, email, phone number, and any tags.' },
          { step: 3, title: 'Save', description: 'Save to add them to your CRM immediately.' }
        ],
        faq_json: [
          { q: 'How can I create contacts in the CRM?', a: 'Go to Contacts and click Add Contact to add one manually, or use Import for adding many contacts at once from a CSV or Excel file.' },
          { q: 'Can I add a contact directly to a pipeline stage?', a: 'Add the contact first, then assign them to a pipeline and stage from their contact record or the pipeline board.' }
        ]
      },
      {
        slug: 'contact-import-csv',
        category: 'CRM Foundations',
        title: 'Importing Contacts from CSV or Excel',
        body_plain: 'Import bulk contact lists from Contacts then Import, mapping spreadsheet columns such as name, email, phone, and tags to CRM fields.',
        content_json: [
          { step: 1, title: 'Upload the File', description: 'Go to Contacts then Import and upload a CSV or Excel file.' },
          { step: 2, title: 'Map Columns', description: 'Match your spreadsheet columns to CRM fields.' }
        ],
        faq_json: [
          { q: 'What happens with duplicate email addresses?', a: 'LeadsMind merges contacts automatically based on a matching email address.' }
        ]
      },
      {
        slug: 'lead-scoring-engine',
        category: 'CRM Foundations',
        title: 'Automatic Lead Scoring',
        body_plain: 'LeadsMind scores contacts automatically based on real engagement events, such as opening an email, clicking a link, or replying to a message, for example adding points for a reply. Crossing score thresholds can auto-tag a contact, and the contact record shows an explanation of how the score was reached.',
        content_json: [
          { step: 1, title: 'Engagement Happens', description: 'A contact opens, clicks, or replies to an email or message.' },
          { step: 2, title: 'Score Updates Automatically', description: 'Points are added and the score explanation field updates on the contact record.' }
        ],
        faq_json: [
          { q: 'Is lead scoring configurable per workspace, or a fixed formula?', a: 'Scoring is event-driven based on real engagement actions; check the contact record’s score explanation field to see exactly which events contributed to a given score.' }
        ]
      },
      {
        slug: 'payment-gateways-connect',
        category: 'CRM Foundations',
        title: 'Connecting Payment Gateways',
        body_plain: 'LeadsMind supports Stripe and PayPal through real OAuth connect flows, with no manual key entry required. Paystack, Flutterwave, and Ozow are bring-your-own-key integrations, where you enter your own provider credentials and LeadsMind validates them against the provider before marking the gateway connected. PayFast is also live and powers course checkout, invoice payments, funnel orders, and calendar bookings, but runs on LeadsMind shared platform merchant credentials rather than a per-workspace connection. Yoco is not currently integrated.',
        content_json: [
          { step: 1, title: 'Choose a Gateway', description: 'Go to Finance then Payment Gateways.' },
          { step: 2, title: 'Connect', description: 'Use OAuth for Stripe and PayPal, or enter your own API credentials for Paystack, Flutterwave, and Ozow.' }
        ],
        faq_json: [
          { q: 'Do I need my own merchant account for every gateway?', a: 'For Stripe, PayPal, Paystack, Flutterwave, and Ozow, yes, checkout routes through your own connected account. PayFast currently uses shared platform credentials instead of a per-workspace merchant account.' }
        ]
      },
      {
        slug: 'calendar-booking-scheduling',
        category: 'CRM Foundations',
        title: 'Calendar Booking Pages and Round-Robin Assignment',
        body_plain: 'Activate booking pages under Calendar, defining time-slot sizes, buffers, and available hours. Round-robin assignment is available for meeting bookings, assigning the rep with the lowest current booking count and the oldest prior assignment. This round-robin logic is scoped to calendar bookings; it is not a general-purpose CRM-wide lead-routing-by-criteria engine.',
        content_json: [
          { step: 1, title: 'Create a Booking Page', description: 'Go to Calendar then Schedule Widgets.' },
          { step: 2, title: 'Set Available Hours', description: 'Specify weekly available time slots and buffers.' },
          { step: 3, title: 'Enable Round-Robin', description: 'Add multiple team members to distribute bookings automatically.' }
        ],
        faq_json: [
          { q: 'Can I route any incoming contact by country or score, not just bookings?', a: 'Not currently. Round-robin routing exists specifically for calendar bookings, not as a general contact-assignment rules engine.' }
        ]
      },
      {
        slug: 'proposals-esignatures',
        category: 'CRM Foundations',
        title: 'Proposals and Electronic Signatures',
        body_plain: 'Create client proposals from Marketing then Proposals. Proposals are built on the same underlying Quotes and Estimates data as an enhanced quote with an e-signature step, rather than a separate document type. Signing records the signature data, the signer IP address, and an audit-log entry.',
        content_json: [
          { step: 1, title: 'Create a Quote', description: 'Build a quote with your line items.' },
          { step: 2, title: 'Add E-Signature Step', description: 'Send it as a proposal with the signature step enabled.' },
          { step: 3, title: 'Client Signs', description: 'The client signs; the signature, their IP address, and an audit entry are recorded.' }
        ],
        faq_json: [
          { q: 'Are proposals a different feature from Quotes?', a: 'No, in LeadsMind a Proposal is a Quote taken through an added e-signature step, not a separate document type.' }
        ]
      },
      {
        slug: 'reputation-google-reviews',
        category: 'CRM Foundations',
        title: 'Reputation Management and Google Reviews',
        body_plain: 'Connect your Google Business Profile under Reputation to automatically request reviews and pull them in via the Google Places API. If no Google Places API key is configured in a given environment, LeadsMind falls back to showing placeholder mock reviews so the interface still renders, so confirm your API key is set before relying on live review data.',
        content_json: [
          { step: 1, title: 'Connect Google Business', description: 'Go to Reputation and click Connect Account.' },
          { step: 2, title: 'Set Review Requests', description: 'Configure automated review-request messages triggered after invoice payment.' }
        ],
        faq_json: [
          { q: 'Can I remove a negative review?', a: 'No, Google policy does not allow editing or removing reviews; automation only helps you request more positive reviews over time.' }
        ]
      }
    ];

    const financeArticles: any[] = [
      {
        slug: 'vat-tax-tracking-status',
        category: 'Accounting & Finance',
        title: 'VAT and Tax Tracking: What Is Not Automated',
        body_plain: 'LeadsMind does not currently calculate or track VAT anywhere in the invoice or expense workflow. Invoice tax totals are always zero, there is no per-invoice or per-expense VAT logic, and there is no SARS eFiling integration or VAT201 report generation. If you need to charge or reclaim VAT, calculate and record it outside LeadsMind for now.',
        content_json: [
          { step: 1, title: 'Check Invoice Tax Total', description: 'Note that the tax total field on invoices is always zero; it is not calculated.' },
          { step: 2, title: 'Handle VAT Externally', description: 'Calculate, charge, and file VAT using your own accounting process outside LeadsMind until this is supported.' }
        ],
        faq_json: [
          { q: 'Does LeadsMind calculate VAT automatically on invoices or expenses?', a: 'No. Tax totals are always zero; there is no VAT calculation logic anywhere in LeadsMind today.' },
          { q: 'Can I file VAT201 or connect to SARS eFiling from LeadsMind?', a: 'No, neither VAT201 generation nor a SARS eFiling integration exists in LeadsMind.' }
        ]
      },
      {
        slug: 'general-ledger-double-entry',
        category: 'Accounting & Finance',
        title: 'Chart of Accounts and Double-Entry Ledger',
        body_plain: 'LeadsMind maintains a real South African-standard chart of accounts and posts genuine double-entry journal entries, for example a bank debit paired with a revenue credit, automatically whenever a PayFast payment lands. This is a real general ledger, not just a list of transactions.',
        content_json: [
          { step: 1, title: 'Review Chart of Accounts', description: 'Go to Finance to view the standard chart of accounts.' },
          { step: 2, title: 'Payments Post Automatically', description: 'PayFast payments automatically create matching debit and credit journal entries.' }
        ],
        faq_json: [
          { q: 'Does every payment gateway post to the ledger automatically?', a: 'Confirmed automatic posting exists for PayFast payments; check Finance Reports to confirm entries for other gateways in your workspace.' }
        ]
      },
      {
        slug: 'payroll-paye-uif-sdl',
        category: 'Accounting & Finance',
        title: 'Running Payroll with PAYE, UIF, and SDL',
        body_plain: 'Payroll is calculated using real 2024/25 SARS tax brackets and the primary rebate for PAYE, plus UIF at 1 percent, capped, on both employer and employee sides, and SDL at 1 percent, generating payroll runs and payslips. Access is restricted to the admin, owner, hr, or payroll roles.',
        content_json: [
          { step: 1, title: 'Open Payroll', description: 'Go to HR then Payroll (admin, owner, hr, or payroll role required).' },
          { step: 2, title: 'Run Payroll', description: 'Generate a payroll run; PAYE, UIF, and SDL are calculated automatically per employee.' },
          { step: 3, title: 'Review Payslips', description: 'Review the generated payslips before finalising.' }
        ],
        faq_json: [
          { q: 'Does LeadsMind handle IRP6 provisional tax or file directly with SARS eFiling?', a: 'No. There is no provisional tax (IRP6) feature and no SARS eFiling integration. VAT is also not currently tracked or calculated anywhere in invoices or expenses; do not rely on LeadsMind for VAT201 reporting.' }
        ]
      },
      {
        slug: 'bank-reconciliation',
        category: 'Accounting & Finance',
        title: 'Bank Reconciliation',
        body_plain: 'Reconcile transactions under Finance then Reconciliation by manually matching unmatched bank-feed or uploaded-statement transactions against unpaid invoices with one click, which marks the invoice as paid. Live bank-feed transactions come only from the Investec connection; other banks are reconciled from uploaded CSV, OFX, or QIF statements.',
        content_json: [
          { step: 1, title: 'Open Reconciliation', description: 'Go to Finance then Reconciliation.' },
          { step: 2, title: 'Match Transactions', description: 'Match each unmatched transaction to the correct unpaid invoice with one click.' }
        ],
        faq_json: [
          { q: 'Is reconciliation automatic?', a: 'Matching is a manual one-click action per transaction, not a fully automatic background process.' }
        ]
      },
      {
        slug: 'profit-loss-reports',
        category: 'Accounting & Finance',
        title: 'Profit and Loss Reports',
        body_plain: 'Generate a real profit and loss report from Finance then Reports, with CSV export and a print view. There is currently no balance sheet, an assets, liabilities, and equity snapshot, generated by LeadsMind, only the P&L, a cash-flow view, revenue forecasting, and a FICA/KYC compliance tab.',
        content_json: [
          { step: 1, title: 'Open Reports', description: 'Go to Finance then Reports.' },
          { step: 2, title: 'Export', description: 'Use Export CSV to download the P&L for a chosen date range.' }
        ],
        faq_json: [
          { q: 'Can I export financial reports?', a: 'Yes, the P&L report supports CSV export from the Reports page.' }
        ]
      },
      {
        slug: 'revenue-cash-flow-forecast',
        category: 'Accounting & Finance',
        title: 'Revenue and Cash Flow Forecasting',
        body_plain: 'The forecasting tool computes historical paid-invoice revenue per currency, deliberately not summing across currencies since LeadsMind has no exchange-rate source, bucketed weekly or monthly with real period-over-period growth and moving-average trend math computed in code. An AI model then reasons over these pre-computed numbers rather than inventing the trend itself, and at least three historical periods are required before a forecast is produced.',
        content_json: [
          { step: 1, title: 'Open Revenue Forecast', description: 'Go to Finance then Revenue Forecast.' },
          { step: 2, title: 'Review Per-Currency Trend', description: 'Review the forecast, shown separately per currency.' }
        ],
        faq_json: [
          { q: 'Does the forecast convert everything into one currency?', a: 'No. Because there is no exchange-rate source in LeadsMind, figures are kept and forecast separately per currency rather than being combined.' }
        ]
      }
    ];

    const invoicingArticles: any[] = [
      {
        slug: 'invoice-numbering-currency',
        category: 'Invoicing & Automated Payments',
        title: 'Invoice Numbering and Multi-Currency Invoices',
        body_plain: 'Invoices and credit notes receive real sequential numbers, such as INV-2026-1001, generated automatically. Invoices carry a currency field and reporting and forecasting tools group figures by that currency, but LeadsMind has no exchange-rate or conversion source, so this is a currency tag on each invoice rather than real foreign-exchange conversion.',
        content_json: [
          { step: 1, title: 'Create an Invoice', description: 'Create an invoice; a sequential number is assigned automatically.' },
          { step: 2, title: 'Set the Currency', description: 'Choose the invoice currency; it is stored as a tag, not converted.' }
        ],
        faq_json: [
          { q: 'Can I set a custom invoice numbering sequence or prefix?', a: 'Not currently confirmed as a configurable setting; numbering is generated automatically by the system.' }
        ]
      },
      {
        slug: 'credit-notes',
        category: 'Invoicing & Automated Payments',
        title: 'Issuing Credit Notes',
        body_plain: 'Create credit notes against an invoice to reduce the amount still due, with real sequential numbering and ownership checks. A credit note reduces amount_due without altering the original amount_paid figure.',
        content_json: [
          { step: 1, title: 'Open the Invoice', description: 'Open the invoice you want to credit.' },
          { step: 2, title: 'Issue a Credit Note', description: 'Create the credit note; the amount due updates automatically.' }
        ],
        faq_json: [
          { q: 'Does a credit note refund money automatically?', a: 'No, a credit note only adjusts the invoice balance. Refunding actual money is a separate action; see Processing Refunds.' }
        ]
      },
      {
        slug: 'refunds',
        category: 'Invoicing & Automated Payments',
        title: 'Processing Refunds',
        body_plain: 'Refunds against a Stripe-paid invoice, course enrollment, or booking call the real Stripe refund API and move actual money. PayFast has no public refund API for standard South African merchants, so PayFast refunds are record-only: LeadsMind logs the refund for your books, but you must still return the funds to the customer yourself outside the platform.',
        content_json: [
          { step: 1, title: 'Open the Payment', description: 'Open the paid invoice, enrollment, or booking.' },
          { step: 2, title: 'Issue the Refund', description: 'Stripe refunds move money automatically; PayFast refunds are recorded only.' }
        ],
        faq_json: [
          { q: 'Will a PayFast refund automatically return the customer money?', a: 'No. PayFast refunds in LeadsMind are record-only; you need to action the actual money movement outside the platform.' }
        ]
      },
      {
        slug: 'retainers-prepaid-balance',
        category: 'Invoicing & Automated Payments',
        title: 'Client Retainers',
        body_plain: 'Retainers let a client prepay a balance that is then drawn down against future invoices. This is a prepaid-balance feature, not an automated recurring-invoice generator; LeadsMind does not currently auto-generate recurring client invoices on a schedule.',
        content_json: [
          { step: 1, title: 'Set Up a Retainer', description: 'Go to Finance then Retainers and record the prepaid balance.' },
          { step: 2, title: 'Draw It Down', description: 'Apply the balance against invoices as they are issued.' }
        ],
        faq_json: [
          { q: 'Do retainers automatically generate a new invoice every month?', a: 'No, retainers track a prepaid balance applied to invoices as they are issued; they do not auto-generate recurring invoices on a schedule.' }
        ]
      }
    ];

    const lmsArticles: any[] = [
      {
        slug: 'course-module-lesson-builder',
        category: 'LMS Advanced Workflows',
        title: 'Building Courses, Modules, and Lessons',
        body_plain: 'Create courses with modules and lessons from the course builder, choosing a lesson type such as video, text, PDF, audio, quiz, assignment, or SCORM-labelled upload, with real per-lesson access levels of public, enrolled, or paid.',
        content_json: [
          { step: 1, title: 'Create a Course', description: 'Go to Courses and create a new course.' },
          { step: 2, title: 'Add Modules and Lessons', description: 'Add modules, then lessons of the type you need, and set each lesson’s access level.' }
        ],
        faq_json: [
          { q: 'Does LeadsMind actually run SCORM packages?', a: 'No, SCORM is currently just a file-upload lesson type accepting a zip file; there is no SCORM runtime, manifest parsing, or completion tracking behind it.' }
        ]
      },
      {
        slug: 'quizzes-and-grading',
        category: 'LMS Advanced Workflows',
        title: 'Quizzes, Assignments, and Grading',
        body_plain: 'The quiz builder supports eight real question types, including multiple choice, true or false, short answer, matching, ordering, fill in the blank, code challenge, and file upload, with optional randomised question pools and a time limit. Assignments are graded individually as pass or fail with feedback comments in the Submissions tab; there is no separate weighted multi-assignment gradebook, a student transcript PDF lists quiz attempts and scores instead.',
        content_json: [
          { step: 1, title: 'Build a Quiz', description: 'Add questions of any of the eight supported types.' },
          { step: 2, title: 'Grade Submissions', description: 'Grade assignment submissions pass or fail with feedback in the Submissions tab.' },
          { step: 3, title: 'View Transcript', description: 'Students can download a transcript PDF listing quiz attempts and scores.' }
        ],
        faq_json: [
          { q: 'Is there a gradebook with weighted assessments?', a: 'Not currently. Grading happens per assignment or quiz, with an overall transcript PDF, rather than a configurable weighted gradebook.' }
        ]
      },
      {
        slug: 'certificates',
        category: 'LMS Advanced Workflows',
        title: 'Course Completion Certificates',
        body_plain: 'On completing every lesson, and passing every quiz-bearing lesson, a real PDF certificate is generated with a validation ID printed on it. There is currently no public lookup page or verification endpoint for that validation ID, so it should not be described as independently verifiable online.',
        content_json: [
          { step: 1, title: 'Complete the Course', description: 'Complete every lesson and pass every quiz-bearing lesson.' },
          { step: 2, title: 'Download Certificate', description: 'A PDF certificate with a validation ID is generated automatically.' }
        ],
        faq_json: [
          { q: 'Can someone verify my certificate online using the validation ID?', a: 'Not currently; there is no public verification page behind that ID today. It is printed on the certificate but not independently checkable online.' }
        ]
      },
      {
        slug: 'drip-content-scheduling',
        category: 'LMS Advanced Workflows',
        title: 'Drip Content Scheduling',
        body_plain: 'Modules can be set to unlock a fixed number of days after a student enrols, real date-based drip logic, alongside separate lock types for paid-only, coming-soon, and prerequisite-based content.',
        content_json: [
          { step: 1, title: 'Set Drip Days', description: 'Set drip_days on a module to control when it unlocks after enrollment.' }
        ],
        faq_json: [
          { q: 'Can drip be based on a specific calendar date instead of days since enrollment?', a: 'Drip logic is based on days since enrollment, not a fixed calendar date.' }
        ]
      },
      {
        slug: 'course-enrollment-checkout',
        category: 'LMS Advanced Workflows',
        title: 'Course Enrollment and Checkout',
        body_plain: 'Students enrol through a real Stripe checkout session for paid courses, and enrollment is only granted once a matching paid invoice exists, not simply because a price is greater than zero. Progress is calculated dynamically from completed lessons against the total lesson count in the course.',
        content_json: [
          { step: 1, title: 'Checkout', description: 'The student completes a real Stripe checkout session for a paid course.' },
          { step: 2, title: 'Enrollment Confirmed', description: 'Enrollment is granted once a matching paid invoice exists.' }
        ],
        faq_json: [
          { q: 'Can a workspace admin self-enrol in their own paid course?', a: 'No, workspace admins are blocked from self-enrolling.' }
        ]
      },
      {
        slug: 'course-qa-assistant',
        category: 'LMS Advanced Workflows',
        title: 'AI Course Q&A Assistant',
        body_plain: 'Enrolled students can ask questions about a specific course using a real retrieval-augmented AI assistant that searches embedded course content and only answers from what it retrieves, explicitly refusing to answer outside the course material. It also has a per-student cooldown and consumes AI credits per question.',
        content_json: [
          { step: 1, title: 'Ask a Question', description: 'From the course player, ask a question about the course content.' },
          { step: 2, title: 'Grounded Answer', description: 'The assistant answers only from retrieved course content, or declines if nothing relevant is found.' }
        ],
        faq_json: [
          { q: 'Can students ask the course Q&A assistant general questions unrelated to the course?', a: 'No, it is designed to answer strictly from that course’s own content and will decline questions outside it.' }
        ]
      },
      {
        slug: 'video-lessons-completion',
        category: 'LMS Advanced Workflows',
        title: 'Video Lesson Completion Tracking',
        body_plain: 'Completion tracking differs by video source. Natively uploaded video tracks your real playback position and duration. Embedded YouTube or Vimeo video instead uses a simulated timer that advances automatically and reaches roughly ninety percent completion after about eighteen seconds, regardless of how much of the video you actually watched, so treat embedded-video completion as an approximate rather than exact watch-time signal.',
        content_json: [
          { step: 1, title: 'Uploaded Video', description: 'Native uploaded video tracks your real playback position.' },
          { step: 2, title: 'Embedded YouTube/Vimeo', description: 'Embedded video uses a simulated completion timer instead of real watch-time tracking.' }
        ],
        faq_json: [
          { q: 'Does watching an embedded YouTube video to the end guarantee accurate completion tracking?', a: 'Not exactly; embedded YouTube and Vimeo videos use a simulated completion timer rather than tracking your real playback position. Natively uploaded video files do track real position.' }
        ]
      }
    ];

    const emailMarketingArticles: any[] = [
      {
        slug: 'email-campaign-builder',
        category: 'Email Marketing System',
        title: 'Building and Sending Email Campaigns',
        body_plain: 'Design campaigns in the email builder under Marketing then Email Campaigns. Emails are sent through Resend as the sending provider, with a mock fallback used automatically in local or sandbox environments when no real Resend key is configured.',
        content_json: [
          { step: 1, title: 'Design the Campaign', description: 'Build the campaign layout in the email builder.' },
          { step: 2, title: 'Send', description: 'Sending goes through Resend.' }
        ],
        faq_json: [
          { q: 'Which email provider actually sends the emails?', a: 'Resend.' }
        ]
      },
      {
        slug: 'popia-compliance',
        category: 'Email Marketing System',
        title: 'POPIA Compliance and Data Erasure',
        body_plain: 'LeadsMind includes real POPIA, South African data protection, tooling, including consent tracking and a right-to-erasure flow that anonymises a contact email, cancels their active workflow executions, records a suppression status, and produces an erasure receipt.',
        content_json: [
          { step: 1, title: 'Process an Erasure Request', description: 'Use the erasure flow to anonymise the contact and cancel active workflows.' },
          { step: 2, title: 'Keep the Receipt', description: 'Retain the generated erasure receipt as your compliance record.' }
        ],
        faq_json: [
          { q: 'Is erasure a soft delete or does it fully remove the contact?', a: 'It anonymises the contact and suppresses future contact, producing an erasure receipt as a record of the action, rather than hard-deleting the row.' }
        ]
      },
      {
        slug: 'domain-verification-deliverability',
        category: 'Email Marketing System',
        title: 'Sender Domain Verification (SPF, DKIM, DMARC)',
        body_plain: 'Domain verification performs real DNS TXT lookups for SPF on your root domain, DKIM under a resend._domainkey subdomain record, and DMARC under _dmarc, and only marks your domain verified once those records genuinely resolve correctly. A mock bypass path exists only for recognised test domains and a development flag; real domains go through genuine DNS checks.',
        content_json: [
          { step: 1, title: 'Add DNS Records', description: 'Add the SPF, DKIM, and DMARC TXT records shown for your sender domain.' },
          { step: 2, title: 'Verify', description: 'LeadsMind performs a real DNS lookup and marks the domain verified once the records resolve.' }
        ],
        faq_json: [
          { q: 'Is domain verification a real DNS check or just a checkbox?', a: 'It is a real DNS TXT record lookup against your domain for real domains; only recognised test domains bypass it.' }
        ]
      },
      {
        slug: 'bounce-unsubscribe-handling',
        category: 'Email Marketing System',
        title: 'Bounce Handling and Unsubscribes',
        body_plain: 'Bounce and complaint webhooks from Resend and AWS SES are processed automatically, distinguishing hard bounces, which suppress the address, from soft bounces, which increment a counter before suppression. Unsubscribe links use a signed, tamper-resistant token rather than a guessable URL.',
        content_json: [
          { step: 1, title: 'Bounce Occurs', description: 'A hard or soft bounce webhook is received from Resend or AWS SES.' },
          { step: 2, title: 'Suppression Applied', description: 'Hard bounces and complaints suppress the address immediately; soft bounces increment a counter.' }
        ],
        faq_json: [
          { q: 'Will one soft bounce immediately stop future emails to that address?', a: 'No, a single soft bounce increments a counter; suppression happens after repeated soft bounces or on a hard bounce or complaint.' }
        ]
      },
      {
        slug: 'email-campaign-ab-testing',
        category: 'Email Marketing System',
        title: 'A/B Testing (Forms and Funnels, Not Email Campaigns)',
        body_plain: 'Real A/B testing exists for forms and funnels, with deterministic variant assignment. There is currently no dedicated A/B testing feature for email campaign subject lines or content inside the email campaign builder itself.',
        content_json: [
          { step: 1, title: 'Use Forms/Funnels A/B Testing', description: 'Set up A/B variants on a form or funnel page instead.' }
        ],
        faq_json: [
          { q: 'Can I A/B test two subject lines on an email campaign?', a: 'Not currently inside the email campaign builder; A/B testing today is a forms and funnels feature.' }
        ]
      }
    ];

    const socialMediaArticles: any[] = [
      {
        slug: 'social-platform-connections',
        category: 'Social Media',
        title: 'Connecting Social Accounts',
        body_plain: 'LeadsMind can post to Facebook, Instagram, LinkedIn, TikTok, and YouTube, each through a real OAuth connection and a real publish call to that platform’s API, not just a UI mockup. Instagram posts require an image URL; text-only Instagram posts are not supported. TikTok publishing is video-only.',
        content_json: [
          { step: 1, title: 'Connect an Account', description: 'Go to Social and connect Facebook, Instagram, LinkedIn, TikTok, or YouTube via OAuth.' },
          { step: 2, title: 'Create a Post', description: 'Create a post; remember Instagram needs an image and TikTok needs a video.' }
        ],
        faq_json: [
          { q: 'Are all five platforms equally easy to connect?', a: 'Connection uses each platform’s real OAuth flow; see the Meta App Review article for a caveat specific to Facebook and Instagram.' }
        ]
      },
      {
        slug: 'meta-app-review-caveat',
        category: 'Social Media',
        title: 'Facebook and Instagram: Meta App Review',
        body_plain: 'Facebook and Instagram posting uses Meta OAuth permissions that, under Meta’s own system, require completed App Review and Business Verification before non-test customers can connect their own Pages. Until that review is complete for a given app, real customer connections beyond test users may not be available.',
        content_json: [
          { step: 1, title: 'Check App Review Status', description: 'Confirm whether the connected Meta app has completed App Review before promising customers a Facebook/Instagram connection.' }
        ],
        faq_json: [
          { q: 'Can any client connect their Facebook Page today?', a: 'That depends on the current Meta App Review status of the connected Meta app; until App Review is complete, connections may be limited to test users.' }
        ]
      },
      {
        slug: 'social-post-scheduling',
        category: 'Social Media',
        title: 'Scheduling Social Posts',
        body_plain: 'Posts can be scheduled for a future time; a scheduled post is stored and then actually published by a background worker at the scheduled time, not published immediately.',
        content_json: [
          { step: 1, title: 'Schedule a Post', description: 'Set a future date and time when creating the post.' },
          { step: 2, title: 'Background Publish', description: 'A background worker publishes the post at the scheduled time.' }
        ],
        faq_json: [
          { q: 'If I schedule a post for tomorrow, does it publish now?', a: 'No, scheduled posts are held and published by a background job at the scheduled time.' }
        ]
      },
      {
        slug: 'ai-captions-hashtags',
        category: 'Social Media',
        title: 'AI-Generated Captions and Hashtags',
        body_plain: 'AI-generated captions and hashtag suggestions come from a text-generation model reasoning over your prompt and brand voice, not from a live trending-hashtag data source. Treat suggested hashtags as AI guesses at plausible, relevant tags, not real-time trending data.',
        content_json: [
          { step: 1, title: 'Generate a Caption', description: 'Use the AI caption generator in the post composer.' },
          { step: 2, title: 'Review Hashtags', description: 'Review suggested hashtags as AI guesses, not live trend data, before posting.' }
        ],
        faq_json: [
          { q: 'Are the suggested hashtags based on what is actually trending right now?', a: 'No, they are AI-generated suggestions based on your content and brand voice, not a live trending-data lookup.' }
        ]
      },
      {
        slug: 'social-analytics',
        category: 'Social Media',
        title: 'Social Media Analytics',
        body_plain: 'Real post and page analytics are available for Facebook, Instagram, and YouTube, pulled from each platform’s genuine Insights or Analytics API. LinkedIn analytics are not available, since that requires a separate Marketing Developer Platform partnership LeadsMind does not have, and TikTok’s public API does not offer analytics endpoints at any access tier, so TikTok post analytics are not available either.',
        content_json: [
          { step: 1, title: 'View Analytics', description: 'Open Social Analytics for Facebook, Instagram, or YouTube posts.' }
        ],
        faq_json: [
          { q: 'Can I see analytics for my LinkedIn or TikTok posts?', a: 'Not currently, analytics are only available for Facebook, Instagram, and YouTube.' }
        ]
      }
    ];

    const aiToolsArticles: any[] = [
      {
        slug: 'ai-text-generation',
        category: 'AI Tools',
        title: 'AI Text Generation',
        body_plain: 'AI writing tools, covering blog posts, ad copy, module descriptions, and general content, run on OpenAI gpt-4o-mini, including a real multi-language South African business copywriter supporting English, Afrikaans, Zulu, and Xhosa. Generation is grounded only in the prompt and your brand voice settings, not any live external data source.',
        content_json: [
          { step: 1, title: 'Choose a Content Type', description: 'Pick blog, ad copy, module description, or general content.' },
          { step: 2, title: 'Generate', description: 'The model generates text using your prompt and brand voice settings.' }
        ],
        faq_json: [
          { q: 'Does the AI pull in live news or current events when writing content?', a: 'No, generation is based on the prompt and your brand voice settings only; it has no live web or news data source.' }
        ]
      },
      {
        slug: 'ai-image-generation',
        category: 'AI Tools',
        title: 'AI Image Generation',
        body_plain: 'AI image generation uses OpenAI gpt-image-2, a real synchronous generation call taking roughly ten to thirty seconds, subject to a per-workspace cooldown and AI-credit consumption. Image generation costs significantly more in credits than a text generation request.',
        content_json: [
          { step: 1, title: 'Describe the Image', description: 'Enter a prompt describing the image you want.' },
          { step: 2, title: 'Generate', description: 'Wait roughly ten to thirty seconds for the image; a cooldown applies before your next generation.' }
        ],
        faq_json: [
          { q: 'Is image generation instant?', a: 'No, expect roughly ten to thirty seconds per image, and note a cooldown applies between generations for a given workspace.' }
        ]
      },
      {
        slug: 'ai-credit-limits',
        category: 'AI Tools',
        title: 'AI Usage Limits and Credits',
        body_plain: 'AI features are metered through a credit-guard system with cooldowns to control cost and abuse, rather than being unlimited. Image generation consumes noticeably more credits per request than text generation.',
        content_json: [
          { step: 1, title: 'Check Remaining Credits', description: 'AI credit usage is tracked per workspace.' }
        ],
        faq_json: [
          { q: 'Can I generate unlimited AI content?', a: 'No, usage is metered by a credit system with cooldowns, not unlimited.' }
        ]
      },
      {
        slug: 'ai-course-qa-remedial',
        category: 'AI Tools',
        title: 'AI Struggle Detection and Remedial Assignments',
        body_plain: 'For enrolled students, LeadsMind can calculate a real weighted struggle score from course activity, and generate an AI remedial assignment targeted at that student, after verifying their enrollment and ownership of the course.',
        content_json: [
          { step: 1, title: 'Struggle Score Calculated', description: 'A weighted struggle score is calculated from the student’s real course activity.' },
          { step: 2, title: 'Generate Remedial Assignment', description: 'Generate an AI remedial assignment targeted at that student.' }
        ],
        faq_json: [
          { q: 'Is struggle detection just a manual flag a teacher sets?', a: 'No, it is a real weighted score calculated from the student’s activity in the course.' }
        ]
      }
    ];

    const workflowAutomationArticles: any[] = [
      {
        slug: 'workflow-builder-basics',
        category: 'Workflow Automation',
        title: 'Building Automated Workflows',
        body_plain: 'The automation builder lets you build a real step-based workflow with branching, such as an A/B split, and reordering, backed by real actions including send email, send SMS, and apply tag. It is a step-list editor rather than a free-form drag-and-drop canvas graph. Only triggers that something in LeadsMind actually fires are offered, so you cannot accidentally build a workflow around an event that never happens.',
        content_json: [
          { step: 1, title: 'Choose a Trigger', description: 'Pick from the offered real triggers.' },
          { step: 2, title: 'Add Steps', description: 'Add steps such as send email, send SMS, or apply tag, with branching if needed.' }
        ],
        faq_json: [
          { q: 'Is the automation builder a visual node-graph canvas?', a: 'No, it is a step-list editor with branching and reordering, not a drag-and-drop canvas.' }
        ]
      },
      {
        slug: 'webhooks-zapier',
        category: 'Workflow Automation',
        title: 'Webhooks and Zapier Integration',
        body_plain: 'LeadsMind supports real outbound webhooks and a Zapier integration built on a Master API Secret Key and Base URL from Settings then Developer, which you paste into a Zapier LeadsMind app or Zap, rather than a published one-click Zapier app listing. Make.com integration is listed as coming soon and is not available yet.',
        content_json: [
          { step: 1, title: 'Get Your API Key and Base URL', description: 'Go to Settings then Developer.' },
          { step: 2, title: 'Configure in Zapier', description: 'Paste the key and base URL into your Zapier app or Zap.' }
        ],
        faq_json: [
          { q: 'Is there a one-click Zapier app I can install?', a: 'Not exactly, you connect Zapier using an API key and base URL from Settings then Developer rather than a one-click app install.' }
        ]
      },
      {
        slug: 'gohighlevel-migration',
        category: 'Workflow Automation',
        title: 'Migrating from Other Platforms',
        body_plain: 'There is currently no automated GoHighLevel import or migration tool in LeadsMind. If you are moving from GoHighLevel or a similar platform, plan on migrating contacts via CSV import and rebuilding automations manually using the workflow builder and webhooks.',
        content_json: [
          { step: 1, title: 'Import Contacts', description: 'Use CSV import to bring over your contacts.' },
          { step: 2, title: 'Rebuild Automations', description: 'Recreate your automations manually in the workflow builder.' }
        ],
        faq_json: [
          { q: 'Can LeadsMind automatically import my GoHighLevel workflows?', a: 'No automated GoHighLevel migration tool exists today; use CSV contact import and rebuild automations manually.' }
        ]
      },
      {
        slug: 'api-keys-developer-access',
        category: 'Workflow Automation',
        title: 'Generating API Keys',
        body_plain: 'Generate workspace API keys from Settings then Developer for external integrations, including Zapier. Keys are shown to you once at creation and stored server-side only as a SHA-256 hash, so keep the key somewhere safe when it is first generated.',
        content_json: [
          { step: 1, title: 'Generate a Key', description: 'Go to Settings then Developer and click Generate API Key.' },
          { step: 2, title: 'Store It Safely', description: 'Copy the key immediately; it will not be shown again.' }
        ],
        faq_json: [
          { q: 'Can I view a previously generated API key again later?', a: 'No, only a hash is stored server-side; the raw key is shown once at creation time.' }
        ]
      }
    ];

    const systemControlsArticles: any[] = [
      {
        slug: 'white-label-domains-branding',
        category: 'System Controls & Extensions',
        title: 'White-Label Branding and Domains',
        body_plain: 'White-labeling covers workspace branding, custom colors, and two separate domain flows, a general custom domain and a client-portal domain, each independently DNS-verified. This is distinct from sender-domain setup for email deliverability (SPF, DKIM, DMARC), which is a separate configuration.',
        content_json: [
          { step: 1, title: 'Set Branding', description: 'Update logo and colors under Settings then Workspace.' },
          { step: 2, title: 'Connect a Domain', description: 'Connect your general or client-portal domain separately from your sender domain.' }
        ],
        faq_json: [
          { q: 'Is my email sending domain the same setting as my white-label portal domain?', a: 'No, they are two separate settings: sender domain verification for email deliverability, and custom or portal domain routing for white-labeling.' }
        ]
      },
      {
        slug: 'workspace-deletion',
        category: 'System Controls & Extensions',
        title: 'Deleting a Workspace',
        body_plain: 'Workspace deletion is blocked while there is an active paid subscription, whether via Stripe or Paystack, and requires typing the workspace name to confirm, as a real safety guardrail against accidental deletion.',
        content_json: [
          { step: 1, title: 'Cancel Active Subscription', description: 'Cancel any active paid subscription first.' },
          { step: 2, title: 'Confirm Deletion', description: 'Type the workspace name to confirm permanent deletion.' }
        ],
        faq_json: [
          { q: 'Can I delete a workspace that still has an active paid subscription?', a: 'No, deletion is blocked until the active subscription is cancelled first.' }
        ]
      },
      {
        slug: 'forms-governance-audit-log',
        category: 'System Controls & Extensions',
        title: 'Forms Governance Audit Log',
        body_plain: 'A real audit trail exists for form governance actions, viewable from a form’s governance tab, logging who changed what and when. This is scoped specifically to forms; there is no general workspace-wide system access audit log today, and the Security settings page currently lists that as not yet available.',
        content_json: [
          { step: 1, title: 'Open Form Governance', description: 'Open a form and go to its Governance tab.' },
          { step: 2, title: 'Review Audit Log', description: 'Review who changed what and when for that form.' }
        ],
        faq_json: [
          { q: 'Can I see a full history of every login and settings change across the whole workspace?', a: 'Not currently, only forms governance actions have a real audit log today; a general system-wide access history is not yet available.' }
        ]
      },
      {
        slug: 'security-mfa-sso-status',
        category: 'System Controls & Extensions',
        title: 'Account Security: What Is and Is Not Available',
        body_plain: 'LeadsMind dashboard logins do not currently support two-factor authentication, single sign-on, or SAML, despite older help copy that may say otherwise. The client-facing portal has a separate real WhatsApp one-time-password login flow, but that is portal login for clients, not dashboard-user multi-factor authentication.',
        content_json: [
          { step: 1, title: 'Dashboard Login', description: 'Dashboard users log in with email and password; no MFA, SSO, or SAML is currently available.' },
          { step: 2, title: 'Client Portal Login', description: 'Client portal login uses a separate real WhatsApp one-time-password flow.' }
        ],
        faq_json: [
          { q: 'Can I enable two-factor authentication on my dashboard account?', a: 'Not currently; despite what some older help content may say, there is no MFA toggle for dashboard users today.' },
          { q: 'Does LeadsMind support SSO or SAML for enterprise login?', a: 'No, this is not currently implemented.' }
        ]
      },
      {
        slug: 'mobile-app-status',
        category: 'System Controls & Extensions',
        title: 'Is There a LeadsMind Mobile App?',
        body_plain: 'LeadsMind is a web-based dashboard; there is no dedicated native mobile app and no biometric login feature. Access it through your mobile browser instead of an app store install.',
        content_json: [
          { step: 1, title: 'Use a Mobile Browser', description: 'Open LeadsMind in your phone’s browser; there is no separate app to install.' }
        ],
        faq_json: [
          { q: 'Can I log in with Face ID or a fingerprint through a LeadsMind mobile app?', a: 'No, there is no LeadsMind mobile app or biometric login; the platform is accessed through a web browser, including on mobile.' }
        ]
      }
    ];

    const allArticles = [
      ...gettingStarted,
      ...crmFoundations,
      ...financeArticles,
      ...invoicingArticles,
      ...lmsArticles,
      ...emailMarketingArticles,
      ...socialMediaArticles,
      ...aiToolsArticles,
      ...workflowAutomationArticles,
      ...systemControlsArticles,
    ];

    // Remove any previously-seeded articles that are no longer part of the
    // verified content set (the old seed contained fabricated specifics, e.g.
    // named bank integrations and SSO/SAML claims, that do not exist in the
    // real product; those rows must not linger alongside the accurate ones).
    const validSlugs = allArticles.map((a) => a.slug);
    const { data: staleRows } = await supabase.from('help_articles').select('id, slug');
    const staleIds = (staleRows || []).filter((r) => !validSlugs.includes(r.slug)).map((r) => r.id);
    if (staleIds.length > 0) {
      const { error: deleteError } = await supabase.from('help_articles').delete().in('id', staleIds);
      if (deleteError) {
        logger.error({ err: deleteError }, 'help.articles.seed_cleanup.failed');
      }
    }

    // Seed sequentially: insert only slugs that do not already exist, generating
    // a real embedding for each. If the target category is not yet allowed by
    // the database constraint (Social Media / AI Tools need migration
    // 20260826000000), fall back to an existing allowed category so the article
    // still seeds; it can be re-categorised with a one-line UPDATE later.
    let seededCount = 0;
    const categoryFallbacksUsed: string[] = [];
    for (const article of allArticles) {
      const { data: existing } = await supabase
        .from('help_articles')
        .select('id, title, body_plain, faq_json')
        .eq('slug', article.slug)
        .maybeSingle();

      // A slug match with different content means a stale/fabricated row from
      // an earlier seed survived under the same slug — update it in place
      // rather than silently leaving old content live (this happened once:
      // 'email-campaign-builder' kept its fabricated body until caught by hand).
      // Also re-embeds if faq_json changed, since FAQ text is now part of the
      // embedding input.
      if (
        existing &&
        existing.title === article.title &&
        existing.body_plain === article.body_plain &&
        JSON.stringify(existing.faq_json) === JSON.stringify(article.faq_json)
      ) {
        continue;
      }

      // Include FAQ Q&A text, not just title+body: users type short direct
      // questions ("can I run multiple pipelines?"), but body_plain is written
      // as narrative description — embedding only the narrative made even a
      // verbatim FAQ question score ~0.42 against its own article (measured),
      // while broad "what is X" phrasing scored 0.8+ just for matching that
      // narrative style. Embedding the FAQ pairs closes that gap.
      const faqText = (article.faq_json || []).map((f: any) => `${f.q} ${f.a}`).join(' ');
      const embedText = `${article.title}. ${article.body_plain} ${faqText}`;
      const embeddingVec = await generateEmbedding(embedText);

      const row = {
        ...article,
        embedding: embeddingVec || null,
        video_url: null,
      };

      let error;
      if (existing) {
        ({ error } = await supabase.from('help_articles').update(row).eq('id', existing.id));
      } else {
        ({ error } = await supabase.from('help_articles').insert(row));
        if (error && error.code === '23514' && CATEGORY_FALLBACK[article.category]) {
          const fallbackCategory = CATEGORY_FALLBACK[article.category];
          ({ error } = await supabase.from('help_articles').insert({ ...row, category: fallbackCategory }));
          if (!error) {
            categoryFallbacksUsed.push(`${article.slug} -> ${fallbackCategory} (intended: ${article.category})`);
          }
        }
      }

      if (error) {
        logger.error({ err: error, slug: article.slug }, 'help.articles.seed_article.failed');
      } else {
        seededCount++;
      }
    }

    if (categoryFallbacksUsed.length > 0) {
      logger.error(
        { categoryFallbacksUsed },
        'help.articles.seed.category_migration_pending: apply supabase/migrations/20260826000000_help_articles_add_categories.sql then re-categorise these slugs'
      );
    }

    revalidatePath('/articles');
    return {
      success: true,
      count: seededCount,
      message: `Successfully seeded ${seededCount} new articles.${staleIds.length ? ` Removed ${staleIds.length} stale/fabricated articles.` : ''}`,
      categoryFallbacksUsed,
    };

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
