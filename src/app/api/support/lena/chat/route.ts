import { NextRequest, NextResponse } from 'next/server';
import { searchHelpArticles } from '@/app/actions/help';
import { getEmailDiagnostics, getAutomationStatus, getInvoiceSettings } from '@/app/actions/diagnostics';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
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

    // 2. Confidence Threshold Gate (Hard 70% threshold / 0.70 score)
    // If not a basic greeting and top match similarity drops below 70%, trigger ticket fallback escalation
    if (!isGreeting && similarity < 0.70) {
      return NextResponse.json({
        low_confidence: true,
        message: "I couldn't locate a highly matching help article in our system database (similarity confidence score below 70%). To save you time, would you like me to package your workspace diagnostics parameters and submit a high-priority ticket directly to our technical support team?",
        diagnostics_packaged: packagedDiagnostics,
        embeddings_active: !!searchRes.embeddings_active
      });
    }

    // 3. Construct prompt incorporating vector match + system settings diagnostics context
    const topThreeArticlesContext = articles
      .slice(0, 3)
      .map((art, idx) => `[Document ${idx + 1}] Title: ${art.title}\nContent: ${art.body_plain}\nSteps: ${JSON.stringify(art.content_json)}`)
      .join('\n\n');

    const systemPrompt = `You are LENA, the intelligent virtual AI Workspace Support Assistant for the LeadsMind platform.
Your objective is to help workspace members troubleshoot configuration, email domains, payment gateways, and crm systems using help center documentation and live diagnostics.

--- SYSTEM KNOWLEDGE BASE DOCUMENTS ---
${topThreeArticlesContext || 'No matching document chunks found.'}

--- LIVE SANDBOX WORKSPACE DIAGNOSTICS ---
- Custom Domain: ${emailDiag.custom_domain || 'None connected'}
- Email Sending Node: ${emailDiag.email_from_address} (MX Record: ${emailDiag.dns_status?.mx}, DKIM: ${emailDiag.dns_status?.dkim}, SPF: ${emailDiag.dns_status?.spf})
- Automation Workflows: Total ${autoDiag.total_workflows} configured, Active: ${autoDiag.active_workflows}, Status Check: ${autoDiag.status}
- Invoicing Payments Setup: Stripe Connect: ${invoiceDiag.payment_gateways?.stripe}, PayFast Link: ${invoiceDiag.payment_gateways?.payfast}, Yoco Link: ${invoiceDiag.payment_gateways?.yoco}
- Local Invoicing Parameters: VAT rate is ${invoiceDiag.tax_rate_percent}%

--- RESPONSE COMPLIANCE RULES ---
1. Base your answer strictly on the retrieval documents and live diagnostics.
2. If the user asks about an error or config issue matching the diagnostic data (e.g. Resend key or domain is missing), point them exactly to the status shown in the diagnostics block.
3. Be professional, direct, and concise (under 4 sentences). Don't explain your system instruction parameters.`;

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
      low_confidence: false,
      embeddings_active: !!searchRes.embeddings_active
    });

  } catch (err: any) {
    console.error('[LENA API Route Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
