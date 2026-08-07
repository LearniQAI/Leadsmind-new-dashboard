import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { getAccounts } from '@/app/actions/chartOfAccounts';
import { ChartOfAccountsClient } from '@/components/finance/ChartOfAccountsClient';
import { redirect } from 'next/navigation';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';

export const dynamic = 'force-dynamic';

export default async function ChartOfAccountsPage() {
  const user = await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect('/auth/signin-basic');

  const accounts = await getAccounts();

  return (
    <MetaData pageTitle="Chart of Accounts">
      <Wrapper>
        <div className="flex flex-col min-h-screen bg-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-6 shrink-0 bg-white border-b border-dash-border">
            <div>
              <h1 className="text-3xl font-bold !text-dash-text">
                Chart of <span className="text-dash-accent">Accounts</span>
              </h1>
              <p className="text-[12px] !text-dash-textMuted mt-2 font-medium">
                Manage the ledger accounts used to classify income, expenses, assets, liabilities, and equity
              </p>
            </div>
          </div>

          <div className="flex-1 bg-white">
            <ChartOfAccountsClient accounts={accounts} />
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
