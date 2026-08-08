import { requireAuth } from '@/lib/auth';
import { createSequenceDraft } from '@/app/actions/email_sequences';

export const dynamic = 'force-dynamic';

export default async function NewSequencePage() {
  await requireAuth();
  await createSequenceDraft(); // creates a blank sequence workflow and redirects into /sequences/[id]/edit
  return null;
}
