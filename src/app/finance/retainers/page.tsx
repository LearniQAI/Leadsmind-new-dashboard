import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { getContactsForInvoicing } from '@/app/actions/finance';
import { listRetainers } from '@/app/actions/retainers';
import { RetainersClient } from '@/components/finance/RetainersClient';
import { redirect } from 'next/navigation';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';

export const dynamic = 'force-dynamic';

export default async function RetainersPage() {
  const user = await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect('/auth/signin-basic');

  const [retainers, contacts] = await Promise.all([
    listRetainers(workspaceId),
    getContactsForInvoicing(workspaceId),
  ]);

  return (
    <MetaData pageTitle="Retainers">
      <Wrapper>
        <div className="flex flex-col min-h-screen bg-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-6 shrink-0 bg-white border-b border-dash-border">
            <div>
              <h1 className="text-3xl font-bold !text-dash-text">
                <span className="text-dash-accent">Retainers</span>
              </h1>
              <p className="text-[12px] !text-dash-textMuted mt-2 font-medium">
                Track prepaid advance balances per contact and apply them against future invoices
              </p>
            </div>
          </div>

          <div className="flex-1 bg-white">
            <RetainersClient retainers={retainers} contacts={contacts} workspaceId={workspaceId} />
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
