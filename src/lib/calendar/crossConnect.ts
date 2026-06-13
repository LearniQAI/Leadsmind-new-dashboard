import { createAdminClient } from '@/lib/supabase/server';

/**
 * Creates a support ticket in public.support_tickets if the appointment belongs to a support calendar.
 */
export async function createSupportTicket(appointmentId: string): Promise<any | null> {
  const supabase = createAdminClient();
  
  try {
    // 1. Fetch appointment details along with its calendar
    const { data: appointment, error: apptError } = await supabase
      .from('appointments')
      .select('*, calendar:booking_calendars(name, description)')
      .eq('id', appointmentId)
      .single();

    if (apptError || !appointment) {
      console.error(`[crossConnect] Appointment not found: ${appointmentId}`, apptError);
      return null;
    }

    const calendar = appointment.calendar;
    const isSupport = calendar?.name?.toLowerCase().includes('support') || 
                      calendar?.description?.toLowerCase().includes('support');

    if (!isSupport) {
      return null;
    }

    // 2. Check if a ticket has already been created for this appointment (idempotency check)
    const { data: existingTicket } = await supabase
      .from('support_tickets')
      .select('id')
      .ilike('description', `%${appointmentId}%`)
      .limit(1)
      .maybeSingle();

    if (existingTicket) {
      console.log(`[crossConnect] Support ticket already exists for appointment ${appointmentId}`);
      return existingTicket;
    }

    // 3. Insert new support ticket
    const ticketTitle = `Support Request: ${appointment.title}`;
    const ticketDescription = `Automatically generated tracking ticket for scheduled support booking.
Appointment ID: ${appointmentId}
Start Time: ${appointment.start_time}
End Time: ${appointment.end_time}
Calendar Name: ${calendar?.name || 'N/A'}`;

    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        workspace_id: appointment.workspace_id,
        contact_id: appointment.contact_id,
        title: ticketTitle,
        description: ticketDescription,
        priority: 'normal',
        status: 'open',
        assigned_to: appointment.user_id || null // Assign to host rep
      })
      .select()
      .single();

    if (ticketError) {
      console.error('[crossConnect] Failed to create support ticket:', ticketError);
      return null;
    }

    console.log(`[crossConnect] Created support ticket ${ticket.id} for appointment ${appointmentId}`);
    return ticket;
  } catch (err: any) {
    console.error('[crossConnect] Error in createSupportTicket:', err);
    return null;
  }
}

/**
 * Parses a transcript for action items and inserts them into the native contact tasks table.
 */
export async function createTasksFromTranscript(appointmentId: string): Promise<void> {
  const supabase = createAdminClient();

  try {
    // 1. Fetch Appointment metadata
    const { data: appointment } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (!appointment) {
      console.error(`[crossConnect] Appointment not found for task sync: ${appointmentId}`);
      return;
    }

    // 2. Fetch completed transcript
    const { data: transcript } = await supabase
      .from('meet_transcripts')
      .select('*')
      .eq('appointment_id', appointmentId)
      .maybeSingle();

    if (!transcript) {
      console.warn(`[crossConnect] No transcript found for appointment: ${appointmentId}`);
      return;
    }

    const transcriptText = transcript.transcript_text;
    if (!transcriptText) {
      console.warn(`[crossConnect] Transcript text is empty for appointment: ${appointmentId}`);
      return;
    }

    // 3. Extract action items using LLM (if configured) or fallback heuristic parsing
    let actionItems: { title: string; description: string; dueDays: number }[] = [];

    const openAiKey = process.env.OPENAI_API_KEY;
    if (openAiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openAiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are an AI assistant parsing meeting transcripts for action items.
Identify concrete tasks/action items mentioned in the transcript.
For each action item, provide:
1. A clear short title.
2. A brief description of what needs to be done.
3. The estimated number of days to complete this (default to 7 if not specified).

Your output must be a valid JSON array of objects with the structure:
[
  { "title": "Task title", "description": "Description text", "dueDays": 7 }
]
Output ONLY the raw JSON array, without any markdown formatting or code blocks.`,
              },
              { role: 'user', content: transcriptText },
            ],
          }),
        });
        const data = await response.json();
        if (response.ok && data.choices?.[0]?.message?.content) {
          const text = data.choices[0].message.content.trim();
          actionItems = JSON.parse(text);
        }
      } catch (err) {
        console.warn('[crossConnect] GPT action items extraction failed, using fallback parser:', err);
      }
    }

    // Fallback parsing / mock tasks if GPT extraction is unavailable or fails
    if (actionItems.length === 0) {
      if (transcriptText.toLowerCase().includes('automation')) {
        actionItems.push({
          title: 'Review LeadsMind automation settings',
          description: 'Action item parsed from meeting: look over automation setups.',
          dueDays: 7
        });
      }
      if (transcriptText.toLowerCase().includes('webhook') || transcriptText.toLowerCase().includes('crm')) {
        actionItems.push({
          title: 'Hook up CRM webhooks',
          description: 'Action item parsed from meeting: check webhook configurations.',
          dueDays: 3
        });
      }
      if (actionItems.length === 0) {
        actionItems.push({
          title: `Meeting Follow-up: ${appointment.title}`,
          description: `Action item parsed from session summary: ${transcript.summary || 'Follow up with client.'}`,
          dueDays: 5
        });
      }
    }

    // 4. Insert tasks into public.contact_tasks
    let count = 0;
    for (const item of actionItems) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + item.dueDays);

      const { error } = await supabase
        .from('contact_tasks')
        .insert({
          workspace_id: appointment.workspace_id,
          contact_id: appointment.contact_id,
          title: item.title,
          description: item.description,
          due_date: dueDate.toISOString(),
          status: 'todo',
          assigned_to: appointment.user_id || null,
          created_by: appointment.user_id || null
        });

      if (!error) {
        count++;
      } else {
        console.error('[crossConnect] Failed to insert contact task:', error);
      }
    }

    console.log(`[crossConnect] Synced ${count} tasks for appointment ${appointmentId}`);
  } catch (err: any) {
    console.error('[crossConnect] Error in createTasksFromTranscript:', err);
  }
}
