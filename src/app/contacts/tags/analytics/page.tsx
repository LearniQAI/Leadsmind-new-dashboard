import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { getTagAnalytics } from '@/app/actions/tagAnalytics';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';

export const dynamic = 'force-dynamic';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-dash-border rounded-2xl shadow-sm p-5">
      <h3 className="text-sm font-bold !text-dash-text mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-[13px]">
      <span className="!text-dash-text font-semibold truncate">{label}</span>
      <span className="!text-dash-textMuted font-bold shrink-0 ml-3">{value}</span>
    </div>
  );
}

export default async function TagAnalyticsPage() {
  await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect('/auth/signin-basic');

  const res = await getTagAnalytics();
  if (!res.success) {
    return (
      <MetaData pageTitle="Tag Analytics">
        <Wrapper>
          <div className="py-20 text-center !text-dash-textMuted">{res.error}</div>
        </Wrapper>
      </MetaData>
    );
  }

  const { mostUsedTags, revenueByTag, conversionByTag, courseCompletionByTag, tagGrowthTrend } = res.data;

  return (
    <MetaData pageTitle="Tag Analytics">
      <Wrapper>
        <div className="space-y-6 py-10 px-4 max-w-5xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/contacts/tags">
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface border border-dash-border">
                <ArrowLeft size={18} />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight !text-dash-text mb-1">Tag Analytics</h1>
              <p className="text-sm !text-dash-textMuted font-medium">Real aggregation over tags, revenue, deals, and course completion — no estimation</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card title="Most-used tags">
              {mostUsedTags.length === 0 ? (
                <p className="text-[12px] !text-dash-textMuted">No tags assigned yet</p>
              ) : (
                mostUsedTags.map((t) => <Row key={t.tagId} label={t.name} value={`${t.count} contacts`} />)
              )}
            </Card>

            <Card title="Revenue by tag (paid invoices)">
              {revenueByTag.length === 0 ? (
                <p className="text-[12px] !text-dash-textMuted">No paid invoices linked to tagged contacts</p>
              ) : (
                revenueByTag.map((t) => <Row key={t.tagId} label={t.name} value={t.revenue.toLocaleString(undefined, { style: 'currency', currency: 'ZAR' })} />)
              )}
            </Card>

            <Card title="Deal conversion by tag">
              {conversionByTag.length === 0 ? (
                <p className="text-[12px] !text-dash-textMuted">No deals linked to tagged contacts</p>
              ) : (
                conversionByTag.map((t) => (
                  <Row key={t.tagId} label={t.name} value={`${Math.round(t.conversionRate * 100)}% (${t.dealCount} deals)`} />
                ))
              )}
            </Card>

            <Card title="Course completion by tag">
              {courseCompletionByTag.length === 0 ? (
                <p className="text-[12px] !text-dash-textMuted">No enrollments linked to tagged contacts</p>
              ) : (
                courseCompletionByTag.map((t) => (
                  <Row key={t.tagId} label={t.name} value={`${Math.round(t.completionRate * 100)}% (${t.enrollmentCount} enrollments)`} />
                ))
              )}
            </Card>
          </div>

          <Card title="Tag growth trend (tags added per week, last 12 weeks)">
            {tagGrowthTrend.length === 0 ? (
              <p className="text-[12px] !text-dash-textMuted">No tag additions recorded in this window</p>
            ) : (
              <div className="flex items-end gap-2 h-32">
                {tagGrowthTrend.map((w) => {
                  const max = Math.max(...tagGrowthTrend.map((x) => x.count), 1);
                  return (
                    <div key={w.week} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-dash-accent/70 rounded-t-md"
                        style={{ height: `${Math.max((w.count / max) * 100, 4)}%` }}
                        title={`${w.week}: ${w.count}`}
                      />
                      <span className="text-[9px] !text-dash-textMuted">{w.week.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </Wrapper>
    </MetaData>
  );
}
