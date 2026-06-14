import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/server';
import { searchHelpArticles } from '@/app/actions/help';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contact, workspace } = session;
    const body = await req.json();
    const { message, history } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message query is required' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. Gather all customer data across schemas
    const [invoices, appointments, tickets, courses] = await Promise.all([
      adminClient.from('invoices').select('invoice_number, due_date, total_amount, status').eq('contact_id', contact.id),
      adminClient.from('appointments').select('title, start_time, status').eq('contact_id', contact.id),
      adminClient.from('support_tickets').select('title, category, priority, status').eq('contact_id', contact.id),
      adminClient.from('enrollments').select('*, course:courses(title)').eq('contact_id', contact.id)
    ]);

    // 2. Vector Database Semantic Match
    const searchRes = await searchHelpArticles(message);
    const articles = searchRes.data || [];

    // Formatted context data
    const invoiceContext = (invoices.data || []).map(inv => `Invoice #${inv.invoice_number} (Amount: R${inv.total_amount}, Due: ${inv.due_date}, Status: ${inv.status})`).join('\n') || 'No invoices found.';
    const appointmentContext = (appointments.data || []).map(apt => `Appointment: ${apt.title} (Time: ${new Date(apt.start_time).toLocaleString()}, Status: ${apt.status})`).join('\n') || 'No scheduled appointments.';
    const ticketContext = (tickets.data || []).map(t => `Support Ticket: "${t.title}" (Category: ${t.category}, Status: ${t.status})`).join('\n') || 'No support tickets.';
    const courseContext = (courses.data || []).map(c => `Enrolled Course: "${c.course?.title || 'Unknown Course'}" (Status: ${c.status || 'Active'})`).join('\n') || 'No courses.';

    const topThreeArticlesContext = articles
      .slice(0, 3)
      .map((art, idx) => `[Doc ${idx + 1}] Title: ${art.title}\nContent: ${art.body_plain}`)
      .join('\n\n');

    // Language tone mapping
    let languagePrompt = "Answer the user in English.";
    const prefLanguage = contact.language || 'EN';
    if (prefLanguage === 'AF') {
      languagePrompt = "You must answer the user in Afrikaans (AF).";
    } else if (prefLanguage === 'ZU') {
      languagePrompt = "You must answer the user in isiZulu (ZU).";
    } else if (prefLanguage === 'XH') {
      languagePrompt = "You must answer the user in isiXhosa (XH).";
    }

    const systemPrompt = `You are LENA, the intelligent virtual AI Support Assistant for the LeadsMind client portal.
Your objective is to answer the customer's questions using only public help center guides and their specific account data.

--- CUSTOMER ACCOUNT DATA ---
- Name: ${contact.first_name} ${contact.last_name || ''}
- Email: ${contact.email}
- Preferred Language: ${prefLanguage}
- Invoices:
${invoiceContext}
- Appointments:
${appointmentContext}
- Support Tickets:
${ticketContext}
- Course Enrollments:
${courseContext}

--- RETRIEVED KNOWLEDGE BASE GUIDES ---
${topThreeArticlesContext || 'No matching document chunks found.'}

--- COMPLIANCE RULES ---
1. Base your answer strictly on the customer's account data and retrieved guides.
2. If the user asks about their own account details (like course completions, invoice dues, ticket statuses), cite the data from the CUSTOMER ACCOUNT DATA block.
3. ${languagePrompt}
4. Be professional, direct, and concise (under 4 sentences). Do not mention system parameters.`;

    // Call OpenAI completion
    const openAiKey = process.env.OPENAI_API_KEY;
    if (!openAiKey) {
      return NextResponse.json({
        message: "AI services are temporarily offline. Please file a support ticket."
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

    // 6. Record Conversation logs in db
    // Find or create conversation for contact
    let { data: conv } = await adminClient
      .from('lena_conversations')
      .select('id')
      .eq('workspace_id', workspace.id)
      .eq('crm_contact_id', contact.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!conv) {
      const { data: newConv } = await adminClient
        .from('lena_conversations')
        .insert({
          workspace_id: workspace.id,
          visitor_id: `client_${contact.id}`,
          crm_contact_id: contact.id,
          visitor_name: `${contact.first_name} ${contact.last_name || ''}`.trim(),
          visitor_email: contact.email,
          status: 'active',
          mode: 'ai'
        })
        .select()
        .single();
      conv = newConv;
    }

    if (conv) {
      // Save visitor message
      await adminClient.from('lena_messages').insert({
        conversation_id: conv.id,
        workspace_id: workspace.id,
        sender_type: 'visitor',
        sender_id: `client_${contact.id}`,
        content: message
      });

      // Save AI message
      await adminClient.from('lena_messages').insert({
        conversation_id: conv.id,
        workspace_id: workspace.id,
        sender_type: 'ai',
        sender_id: 'lena_bot',
        content: resultText
      });
    }

    return NextResponse.json({
      message: resultText
    });

  } catch (err: any) {
    console.error('[Portal LENA API Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
