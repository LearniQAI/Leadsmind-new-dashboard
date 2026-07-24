import { NextResponse } from 'next/server';
import { db } from '@/server/database/datasource';
import { ResearchAgent } from '@/server/services/ai/ResearchAgent';
import { sendEmail } from '@/lib/email';
import { getUser, requireWorkspaceAccess } from '@/lib/auth';
import { UnauthorizedError as LibUnauthorizedError, ForbiddenError as LibForbiddenError } from '@/lib/errors';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

function isCronAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');
  return req.headers.get('Authorization') === `Bearer ${cronSecret}`;
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return handleBriefingCron();
}

// Two entry modes:
//  (a) a valid CRON_SECRET bearer token — the real scheduled trigger, runs the unchanged bulk
//      all-workspaces appointment sweep.
//  (b) a real authenticated session — the "Send Pre-Meeting Briefing Email" button
//      (ContactBriefClient.tsx), scoped to exactly the one contact it names. The contact's
//      real workspace_id is resolved server-side and membership verified — a client-supplied
//      workspaceId is never trusted for authorization, same standing rule as every other route
//      fixed in this task.
// Neither present -> 401.
export async function POST(req: Request) {
  if (isCronAuthorized(req)) {
    return handleBriefingCron();
  }

  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { contactId } = body;
    if (!contactId) {
      return NextResponse.json({ error: 'Missing required parameter: contactId' }, { status: 400 });
    }

    const contact = await db('contacts').where({ id: contactId }).first();
    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // requireWorkspaceAccess() reads the caller's active_workspace_id cookie and verifies a
    // real workspace_members row — but the workspace that actually authorizes this action is
    // the CONTACT's own real workspace_id, not whatever the caller's active workspace happens
    // to be. Confirm they match before proceeding.
    const { workspaceId } = await requireWorkspaceAccess();
    if (contact.workspace_id !== workspaceId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return await handleSingleContactBrief(contact, user.email!);
  } catch (err: any) {
    if (err instanceof LibUnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (err instanceof LibForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    logger.error({ err }, 'cron.pre_meeting_brief.single_contact.failed');
    return NextResponse.json({ error: 'Pre-meeting brief processing failed.' }, { status: 500 });
  }
}

async function handleSingleContactBrief(contact: any, recipientEmail: string) {
  const contactName = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Prospect';
  const domain = contact.metadata?.company_domain || contact.email?.split('@')[1] || 'zafrologistics.co.za';
  const domainPart = domain.split('.')[0];
  const companyName = domainPart.charAt(0).toUpperCase() + domainPart.slice(1);

  logger.info({ contactId: contact.id, workspaceId: contact.workspace_id }, 'cron.pre_meeting_brief.single_contact.enrichment_start');
  const report = await ResearchAgent.enrichContact(
    contact.id,
    contactName,
    companyName,
    domain,
    contact.workspace_id
  );

  const reportRecord = await db('ai_research_reports')
    .where({ contact_id: contact.id })
    .first();

  const leadScore = reportRecord?.lead_score || 75;
  const suitability = leadScore >= 80 ? 'HIGH FIT TARGET' : leadScore >= 60 ? 'WARM PROSPECT' : 'NURTURE PLAY';

  const html = `
    <div style="font-family: sans-serif; background: #04091a; color: #eef2ff; padding: 24px; border-radius: 12px; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3b82f6; border-bottom: 1px solid #1e293b; padding-bottom: 8px;">LeadsMind AI Pre-Meeting Briefing</h2>
      <p>Prospect intelligence briefing for <strong>${contactName}</strong> from <strong>${companyName}</strong>.</p>

      <div style="background: #0b0b1e; border: 1px solid rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; margin: 16px 0;">
        <span style="font-size: 11px; text-transform: uppercase; color: #94a3b8; display: block;">Lead Suitability Metric</span>
        <span style="font-size: 32px; font-weight: bold; color: #eef2ff;">${leadScore} <span style="font-size: 14px; color: #64748b;">/ 100</span></span>
        <div style="margin-top: 8px; font-size: 12px; font-weight: bold; color: #10b981;">[${suitability}]</div>
      </div>

      <h3 style="color: #60a5fa;">Prospect Intelligence Summary</h3>
      <p><strong>Operational Profile:</strong> ${report.plain_language_operational_profile || 'No details available.'}</p>

      <h3 style="color: #60a5fa;">Friction Signals & Pain Points</h3>
      <ul>
        ${(report.inferred_pain_points || []).map((p: string) => `<li>${p}</li>`).join('') || '<li>No pain points cached.</li>'}
      </ul>

      <h3 style="color: #60a5fa;">Strategic Conversation Openers</h3>
      <blockquote style="border-left: 4px solid #3b82f6; padding-left: 12px; font-style: italic; color: #94a3b8; margin: 16px 0;">
        "${(report.suggested_conversation_openers || [])[0] || 'Reach out to discuss workflow integrations.'}"
      </blockquote>

      <p style="font-size: 11px; color: #64748b; margin-top: 24px; border-top: 1px solid #1e293b; padding-top: 8px;">
        This is an automated tactical briefing generated by LeadsMind AI.
      </p>
    </div>
  `;

  await sendEmail({
    to: recipientEmail,
    subject: `AI Briefing: Pre-Meeting Assessment for ${contactName}`,
    html
  });

  return NextResponse.json({ success: true, contactName, sentTo: recipientEmail });
}

async function handleBriefingCron() {
  try {
    const now = new Date();
    // Look ahead 2 hours (115 to 120 minutes window)
    const startRange = new Date(now.getTime() + 115 * 60 * 1000);
    const endRange = new Date(now.getTime() + 120 * 60 * 1000);

    logger.info({ startRange: startRange.toISOString(), endRange: endRange.toISOString() }, 'cron.pre_meeting_brief.scan_start');

    // Query appointments scheduled 2 hours ahead
    const upcomingAppointments = await db('appointments')
      .where('start_time', '>=', startRange.toISOString())
      .where('start_time', '<=', endRange.toISOString())
      .where({ status: 'scheduled' });

    logger.info({ count: upcomingAppointments.length }, 'cron.pre_meeting_brief.appointments_found');

    const results = [];

    for (const appointment of upcomingAppointments) {
      try {
        if (!appointment.contact_id || !appointment.workspace_id) {
          continue;
        }

        // Fetch contact details
        const contact = await db('contacts').where({ id: appointment.contact_id }).first();
        if (!contact) continue;

        const contactName = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Prospect';

        // Fetch agent details
        let agentEmail = 'account-manager@leadsmind.io';
        if (appointment.user_id) {
          const agent = await db('users').where({ id: appointment.user_id }).first();
          if (agent && agent.email) {
            agentEmail = agent.email;
          }
        }

        const domain = contact.metadata?.company_domain || contact.email?.split('@')[1] || 'zafrologistics.co.za';
        const domainPart = domain.split('.')[0];
        const companyName = domainPart.charAt(0).toUpperCase() + domainPart.slice(1);

        // Trigger background research & enrichment lookup
        logger.info({ contactId: contact.id, appointmentId: appointment.id }, 'cron.pre_meeting_brief.enrichment_start');
        const report = await ResearchAgent.enrichContact(
          contact.id,
          contactName,
          companyName,
          domain,
          appointment.workspace_id
        );

        // Fetch lead score
        const reportRecord = await db('ai_research_reports')
          .where({ contact_id: contact.id })
          .first();

        const leadScore = reportRecord?.lead_score || 75;
        const suitability = leadScore >= 80 ? 'HIGH FIT TARGET' : leadScore >= 60 ? 'WARM PROSPECT' : 'NURTURE PLAY';

        const html = `
          <div style="font-family: sans-serif; background: #04091a; color: #eef2ff; padding: 24px; border-radius: 12px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3b82f6; border-bottom: 1px solid #1e293b; padding-bottom: 8px;">LeadsMind AI Pre-Meeting Briefing</h2>
            <p>You have an upcoming appointment with <strong>${contactName}</strong> from <strong>${companyName}</strong> scheduled at ${new Date(appointment.start_time).toLocaleTimeString()}.</p>
            
            <div style="background: #0b0b1e; border: 1px solid rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; margin: 16px 0;">
              <span style="font-size: 11px; text-transform: uppercase; color: #94a3b8; display: block;">Lead Suitability Metric</span>
              <span style="font-size: 32px; font-weight: bold; color: #eef2ff;">${leadScore} <span style="font-size: 14px; color: #64748b;">/ 100</span></span>
              <div style="margin-top: 8px; font-size: 12px; font-weight: bold; color: #10b981;">[${suitability}]</div>
            </div>

            <h3 style="color: #60a5fa;">Prospect Intelligence Summary</h3>
            <p><strong>Operational Profile:</strong> ${report.plain_language_operational_profile || 'No details available.'}</p>
            
            <h3 style="color: #60a5fa;">Friction Signals & Pain Points</h3>
            <ul>
              ${(report.inferred_pain_points || []).map((p: string) => `<li>${p}</li>`).join('') || '<li>No pain points cached.</li>'}
            </ul>

            <h3 style="color: #60a5fa;">Strategic Conversation Openers</h3>
            <blockquote style="border-left: 4px solid #3b82f6; padding-left: 12px; font-style: italic; color: #94a3b8; margin: 16px 0;">
              "${(report.suggested_conversation_openers || [])[0] || 'Reach out to discuss workflow integrations.'}"
            </blockquote>

            <p style="font-size: 11px; color: #64748b; margin-top: 24px; border-top: 1px solid #1e293b; padding-top: 8px;">
              This is an automated tactical briefing generated by LeadsMind AI.
            </p>
          </div>
        `;

        // Send Email Briefing
        await sendEmail({
          to: agentEmail,
          subject: `AI Briefing: Pre-Meeting Assessment for ${contactName}`,
          html
        });

        results.push({ appointmentId: appointment.id, contactName, sentTo: agentEmail });
      } catch (innerErr: any) {
        logger.error({ err: innerErr, appointmentId: appointment.id }, 'cron.pre_meeting_brief.appointment_processing.failed');
      }
    }

    return NextResponse.json({ success: true, processedCount: results.length, briefings: results });
  } catch (error: any) {
    logger.error({ err: error }, 'cron.pre_meeting_brief.failed');
    return NextResponse.json({ error: 'Pre-meeting brief processing failed.' }, { status: 500 });
  }
}
