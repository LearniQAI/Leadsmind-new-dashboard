import { getCurrentWorkspaceId } from '@/lib/auth';
import { getQuotes } from '@/app/actions/quotes';
import MetaData from '@/hooks/useMetaData';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { FileText, Plus, Search, Filter } from 'lucide-react';
import Link from 'next/link';
import { QuoteMasterLedger } from '@/components/quotes/QuoteMasterLedger';

export default async function QuotesPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const quotes = await getQuotes(workspaceId!);

  return (
    <MetaData pageTitle="Quotes Ledger">
      <Wrapper>
        <div className="app__slide-wrapper">
          <div className="page-header px-6 py-4">
            <div className="ph-left">
              <h1 className="text-2xl font-bold font-space text-[var(--t1)]">
                QUOTES <span className="text-[var(--accent2)]">LEDGER</span>
              </h1>
              <p className="text-[11.5px] text-[var(--t3)] uppercase tracking-[0.8px] font-medium mt-1">
                Proposal tracking & conversion pipeline
              </p>
            </div>
            <div className="ph-right flex gap-3">
              <Link href="/quotes/new">
                <button className="btn-primary gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Create Proposal</span>
                </button>
              </Link>
            </div>
          </div>

          <div className="px-6 py-6">
             {/* Simple Stats Row */}
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Active Quotes', value: quotes.filter(q => q.status === 'sent').length, color: 'text-blue-400' },
                  { label: 'Accepted', value: quotes.filter(q => q.status === 'accepted').length, color: 'text-emerald-400' },
                  { label: 'Converted', value: quotes.filter(q => q.status === 'converted').length, color: 'text-purple-400' },
                  { label: 'Pipeline Value', value: `$${quotes.reduce((sum, q) => sum + Number(q.total_amount), 0).toLocaleString()}`, color: 'text-[var(--t1)]' },
                ].map((stat, i) => (
                  <div key={i} className="bg-[var(--n800)] border border-[var(--bdr)] p-5 rounded-[var(--r16)]">
                    <p className="text-[10px] font-bold text-[var(--t3)] uppercase tracking-widest mb-1">{stat.label}</p>
                    <p className={`text-xl font-bold font-space ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
             </div>

             <QuoteMasterLedger quotes={quotes} />
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
