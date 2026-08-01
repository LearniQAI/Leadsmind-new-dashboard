import { requireAuth } from '@/lib/auth';
import { createDraftWorkflow } from '@/app/actions/automation_editor';

export const dynamic = 'force-dynamic';

export default async function NewWorkflowPage() {
  await requireAuth();
  await createDraftWorkflow(); // creates a blank workflow and redirects into /automations/[id]/edit
  return null;
}
