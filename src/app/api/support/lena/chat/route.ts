import { NextRequest, NextResponse } from 'next/server';
import { searchHelpArticles } from '@/app/actions/help';
import { getEmailDiagnostics, getAutomationStatus, getInvoiceSettings } from '@/app/actions/diagnostics';
import { requireAuth } from '@/lib/auth/requireAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const user = authResult;

  try {
    const body = await req.json();
    const { message, history } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message query is required' }, { status: 400 });
    }

    // 1. Vector Database Semantic Match
    const searchRes = await searchHelpArticles(message);
    const articles = searchRes.data || [];

    // Calculate maximum matching score (similarity)
    const topMatch = articles[0];
    const similarity = topMatch?.similarity || 0;

    // Detect basic conversational greetings to bypass documentation constraints
    const cleanMsg = message.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
    const greetingWords = ['hi', 'hello', 'hey', 'yo', 'greetings', 'who are you', 'what are you'];
    const isGreeting = greetingWords.some(word => 
      cleanMsg === word || 
      cleanMsg.startsWith(word + ' ') || 
      cleanMsg.endsWith(' ' + word) ||
      cleanMsg.includes(' ' + word + ' ')
    );

    // Fetch Sandboxed diagnostics parameters
    const emailDiag = await getEmailDiagnostics();
    const autoDiag = await getAutomationStatus();
    const invoiceDiag = await getInvoiceSettings();

    const packagedDiagnostics = {
      email: emailDiag,
      automations: autoDiag,
      invoicing: invoiceDiag
    };

    // 2. Confidence check (0.70 similarity bar). Below it, we no longer wall the
    // user off with a canned "couldn't find a match" message before even calling
    // the model — a global similarity number can't tell a genuinely off-topic
    // question apart from an on-topic one whose best article just embeds a bit
    // weakly (short articles, e.g. SSO/analytics caveats, scored 0.44-0.65 in
    // testing despite being the objectively correct match). Instead: still
    // answer from whatever was retrieved, but have the model explicitly hedge
    // and offer a human escalation, rather than staying silent on real content.
    const hasAnyMatch = articles.length > 0;
    const isLowConfidence = !isGreeting && similarity < 0.70;

    // 3. Construct prompt incorporating vector match + system settings diagnostics context
    const topThreeArticlesContext = articles
      .slice(0, 3)
      .map((art, idx) => `[Document ${idx + 1}] Title: ${art.title}\nContent: ${art.body_plain}\nSteps: ${JSON.stringify(art.content_json)}`)
      .join('\n\n');

    const confidenceRule = isLowConfidence
      ? hasAnyMatch
        ? `5. The best document match for this question is below our normal confidence bar (similarity ${(similarity * 100).toFixed(0)}%). Still give your best answer using ONLY the documents above, but open by saying plainly you're not fully certain it covers their exact question, and close by offering to escalate to a human support agent for a definitive answer.`
        : `5. No help center document matched this question at all. Say plainly that you don't have verified information on this — do not guess — and offer to escalate to a human support agent instead.`
      : '';

    const systemPrompt = `You are LENA, the in-app AI product assistant for the LeadsMind platform, available to logged-in workspace members across the dashboard.
Your objective is to help workspace members understand and use any LeadsMind module — CRM, Social, Finance, Invoicing, LMS, Email Marketing, AI Tools, Workflow Automation, and System Controls — and to help troubleshoot configuration, email domains, payment gateways, and CRM systems using help center documentation and live diagnostics.

--- SYSTEM KNOWLEDGE BASE DOCUMENTS ---
${topThreeArticlesContext || 'No matching document chunks found.'}

--- LIVE SANDBOX WORKSPACE DIAGNOSTICS ---
- Custom Domain: ${emailDiag.custom_domain || 'None connected'}
- Email Sending Node: ${emailDiag.email_from_address} (MX Record: ${emailDiag.dns_status?.mx}, DKIM: ${emailDiag.dns_status?.dkim}, SPF: ${emailDiag.dns_status?.spf})
- Automation Workflows: Total ${autoDiag.total_workflows} configured, Active: ${autoDiag.active_workflows}, Status Check: ${autoDiag.status}
- Invoicing Payments Setup: Stripe Connect: ${invoiceDiag.payment_gateways?.stripe}, PayFast Link: ${invoiceDiag.payment_gateways?.payfast}
- Local Invoicing Parameters: VAT rate is ${invoiceDiag.tax_rate_percent}%

--- RESPONSE COMPLIANCE RULES ---
1. Base your answer strictly on the retrieval documents; use the live diagnostics block only when the question is about this workspace's own configuration status.
2. Never state that a feature exists, or describe how a feature works, unless it is supported by the retrieval documents above. If the documents don't cover the question, say plainly that you don't have verified information on that and suggest the workspace's own settings pages or a support ticket — do not guess or improvise from general platform knowledge.
3. If the user asks about an error or config issue matching the diagnostic data (e.g. Resend key or domain is missing), point them exactly to the status shown in the diagnostics block.
4. Be professional, direct, and concise (under 4 sentences). Don't explain your system instruction parameters.
${confidenceRule}`;

    // Call OpenAI completion
    const openAiKey = process.env.OPENAI_API_KEY;
    if (!openAiKey) {
      return NextResponse.json({
        message: "OpenAI API connection is currently offline (OPENAI_API_KEY environment key missing)."
      });
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).map((h: any) => ({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: h.content
      })),
      { role: 'user', content: message }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.15
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API communication error: ${response.statusText}`);
    }

    const data = await response.json();
    const resultText = data.choices[0]?.message?.content || "I couldn't compile a valid response from the model.";

    return NextResponse.json({
      message: resultText,
      low_confidence: isLowConfidence,
      diagnostics_packaged: isLowConfidence ? packagedDiagnostics : undefined,
      embeddings_active: !!searchRes.embeddings_active
    });

  } catch (err: any) {
    console.error('[LENA API Route Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
