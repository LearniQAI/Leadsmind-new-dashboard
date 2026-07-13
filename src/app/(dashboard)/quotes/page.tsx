import { getCurrentWorkspaceId } from '@/lib/auth';
import { getQuotes } from '@/app/actions/quotes';
import MetaData from '@/hooks/useMetaData';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { QuoteMasterLedger } from '@/components/quotes/QuoteMasterLedger';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashCard } from '@/components/dashboard-ui/Card';

export default async function QuotesPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const quotes = await getQuotes(workspaceId!);

  return (
    <MetaData pageTitle="Quotes Ledger">
      <Wrapper>
        <div className="bg-white min-h-screen">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-4 border-b border-dash-border">
            <div>
              <h1 className="text-2xl font-bold !text-dash-text">
                Quotes <span className="text-dash-accent">Ledger</span>
              </h1>
              <p className="text-[12px] !text-dash-textMuted font-medium mt-1">
                Proposal tracking & conversion pipeline
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/quotes/new">
                <DashButton variant="primary">
                  <Plus className="h-4 w-4" />
                  <span>Create Proposal</span>
                </DashButton>
              </Link>
            </div>
          </div>

          <div className="px-6 py-6">
             {/* Simple Stats Row */}
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Active Quotes', value: quotes.filter(q => q.status === 'sent').length, color: 'text-dash-accent' },
                  { label: 'Accepted', value: quotes.filter(q => q.status === 'accepted').length, color: 'text-green' },
                  { label: 'Converted', value: quotes.filter(q => q.status === 'converted').length, color: 'text-purple-600' },
                  { label: 'Pipeline Value', value: `$${quotes.reduce((sum, q) => sum + Number(q.total_amount), 0).toLocaleString()}`, color: '!text-dash-text' },
                ].map((stat, i) => (
                  <DashCard key={i} padding="default">
                    <p className="text-[11px] font-semibold !text-dash-textMuted mb-1">{stat.label}</p>
                    <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                  </DashCard>
                ))}
             </div>

             <QuoteMasterLedger quotes={quotes} />
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
