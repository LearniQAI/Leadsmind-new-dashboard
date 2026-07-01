import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/database/datasource';
import { ResearchAgent } from '@/server/services/ai/ResearchAgent';
import { requireAuth } from '@/lib/auth/requireAuth';

export const dynamic = 'force-dynamic';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const user = authResult;

  try {
    const body = await req.json();
    const { contactIds, workspaceId, domain } = body;

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json({ error: 'Missing contactIds array parameter' }, { status: 400 });
    }

    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspaceId parameter' }, { status: 400 });
    }

    // Limit to up to 50 profiles per request to prevent API overload (Sprint 5.3 Batch Research Processing Route)
    const targets = contactIds.slice(0, 50);
    const chunkSize = 5;
    const results = [];

    // Chunk contact IDs into sub-queues and process them over extended intervals
    for (let i = 0; i < targets.length; i += chunkSize) {
      const chunk = targets.slice(i, i + chunkSize);
      
      const chunkPromises = chunk.map(async (contactId) => {
        try {
          // Fetch contact details from database
          const contact = await db('contacts').where({ id: contactId }).first();
          if (!contact) {
            return { contactId, success: false, error: 'Contact not found' };
          }

          const contactName = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Valued Prospect';
          
          // Determine company name (guess from domain if not available)
          let companyName = 'Target Enterprise';
          const targetDomain = domain || contact.email?.split('@')[1] || 'zafrologistics.co.za';
          
          const companyRecord = await db('crm_companies').where({ domain: targetDomain }).first();
          if (companyRecord) {
            companyName = companyRecord.name;
          } else {
            const domainPart = targetDomain.split('.')[0];
            companyName = domainPart.charAt(0).toUpperCase() + domainPart.slice(1);
          }

          // Execute contact intelligence profiling and lead scoring
          const report = await ResearchAgent.enrichContact(
            contactId,
            contactName,
            companyName,
            targetDomain,
            workspaceId
          );

          return { contactId, success: true, report };
        } catch (itemErr: any) {
          console.error(`Error in batch processing contact ${contactId}:`, itemErr.message);
          return { contactId, success: false, error: itemErr.message };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);

      // Sleep between chunks to distribute API load and prevent rate limit exhaustion
      if (i + chunkSize < targets.length) {
        await sleep(1000); // 1 second interval
      }
    }

    return NextResponse.json({ success: true, processedCount: results.length, details: results });
  } catch (error: any) {
    console.error('[Batch Research API] Exception:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
