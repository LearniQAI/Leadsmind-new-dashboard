import Wrapper from '@/components/layouts/DefaultWrapper';
import { requireAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getWorkflowForEdit, getEditorReferenceData } from '@/app/actions/automation_editor';
import { WorkflowEditorClient } from './WorkflowEditorClient';

export const dynamic = 'force-dynamic';

export default async function EditWorkflowPage({ params }: { params: { id: string } }) {
  await requireAuth();

  const [workflowRes, refRes] = await Promise.all([
    getWorkflowForEdit(params.id),
    getEditorReferenceData(),
  ]);

  if (!workflowRes.success) redirect('/automations');
  if (!refRes.success) redirect('/automations');

  return (
    <Wrapper>
      <WorkflowEditorClient workflow={workflowRes.data} referenceData={refRes.data} />
    </Wrapper>
  );
}
