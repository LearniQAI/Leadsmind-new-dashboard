import React from 'react';
import { notFound, redirect } from 'next/navigation';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { requireAuth } from '@/lib/auth';
import { getSequenceForEdit } from '@/app/actions/email_sequences';
import { getEditorReferenceData } from '@/app/actions/automation_editor';
import { SequenceEditorClient } from './SequenceEditorClient';

export const dynamic = 'force-dynamic';

export default async function SequenceEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const result = await getSequenceForEdit(id);

  if (!result.success) {
    // A workflow that isn't a simplified sequence (or was hand-edited with
    // steps this editor can't represent) belongs in the full Workflow
    // Builder instead of failing here.
    if (result.notSequence) redirect(`/automations/${id}/edit`);
    notFound();
  }

  const ref = await getEditorReferenceData();
  const filterOptions = {
    tags: ref.success ? ref.data.tags : [],
    courses: ref.success ? ref.data.courses.map((c: any) => ({ id: c.id, name: c.title })) : [],
    funnels: ref.success ? ref.data.funnels : [],
  };

  return (
    <Wrapper>
      <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)]">
        <SequenceEditorClient sequence={result.data} filterOptions={filterOptions} />
      </div>
    </Wrapper>
  );
}
