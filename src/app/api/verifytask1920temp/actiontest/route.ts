// TEMPORARY verification-only route for a one-off permission-matrix live
// test of the collaborator-access fix. Dispatches to the REAL exported
// server actions (same functions the actual pages/components call) under
// the CALLER'S real authenticated session (cookies forwarded by the
// browser/test client) -- not the admin client -- so this genuinely
// exercises requireFormAccess() as a real user would hit it. Not part of
// the product surface -- removed at the end of this verification pass.
import { NextResponse } from 'next/server';
import * as marketing from '@/app/actions/marketing';
import * as collaborators from '@/app/actions/collaborators';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ACTIONS: Record<string, (...args: any[]) => Promise<any>> = {
  getForm: marketing.getForm,
  updateForm: marketing.updateForm,
  deleteFormAction: marketing.deleteFormAction,
  getFormSubmissionsData: marketing.getFormSubmissionsData,
  getFormAutomationsData: marketing.getFormAutomationsData,
  createFormWorkflow: marketing.createFormWorkflow,
  toggleFormWorkflowActive: marketing.toggleFormWorkflowActive,
  deleteFormWorkflow: marketing.deleteFormWorkflow,
  getPartialSubmissionsData: marketing.getPartialSubmissionsData,
  getFormAnalyticsAccessData: marketing.getFormAnalyticsAccessData,
  getFormAbTestingAccessData: marketing.getFormAbTestingAccessData,
  getFormForGovernance: marketing.getFormForGovernance,
  getFormCollaborators: collaborators.getFormCollaborators,
  inviteFormCollaborator: collaborators.inviteFormCollaborator,
  removeFormCollaborator: collaborators.removeFormCollaborator,
  updateFormCollaboratorRole: collaborators.updateFormCollaboratorRole,
  acceptFormInvitation: collaborators.acceptFormInvitation,
  declineFormInvitation: collaborators.declineFormInvitation,
};

export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: 'no secret configured' }, { status: 500 });
  if (req.headers.get('X-Verify-Secret') !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { action, args } = await req.json();
  const fn = ACTIONS[action];
  if (!fn) return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });

  try {
    const result = await fn(...(args || []));
    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, thrown: e.message }, { status: 200 });
  }
}
