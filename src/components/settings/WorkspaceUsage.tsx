import { Users, Zap, Globe } from 'lucide-react';

interface UsageMetric {
  used: number;
  limit: number;
}

interface WorkspaceUsageProps {
  usage: {
    contacts: UsageMetric;
    automations: UsageMetric;
    websites: UsageMetric;
  } | null;
}

const METRICS = [
  { key: 'contacts', label: 'Contacts', icon: Users },
  { key: 'automations', label: 'Automations', icon: Zap },
  { key: 'websites', label: 'Websites', icon: Globe },
] as const;

// One restrained accent color (dash-accent), warming to amber only once usage
// is genuinely close to the plan limit -- not alarming red at low usage.
// Matches the same signaling principle used elsewhere in the dash-* system.
function barColor(pct: number): string {
  if (pct >= 90) return 'bg-amber-500';
  if (pct >= 80) return 'bg-dash-accent/70';
  return 'bg-dash-accent';
}

export function WorkspaceUsage({ usage }: WorkspaceUsageProps) {
  if (!usage) return null;

  return (
    <div className="dash-account-card">
      <div className="card__title-wrap mb-[20px]">
        <h5 className="card__heading-title">Workspace Usage</h5>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {METRICS.map(({ key, label, icon: Icon }) => {
          const metric = usage[key];
          const isUnlimited = !Number.isFinite(metric.limit);
          const pct = isUnlimited ? 0 : Math.min(100, Math.round((metric.used / metric.limit) * 100));

          return (
            <div key={key} className="p-5 bg-dash-surface border border-dash-border rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-white border border-dash-border flex items-center justify-center !text-dash-accent">
                  <Icon size={16} />
                </div>
                <span className="text-[11px] font-bold !text-dash-textMuted">
                  {isUnlimited ? 'Unlimited' : `${pct}%`}
                </span>
              </div>
              <div>
                <p className="text-[11px] font-bold !text-dash-textMuted uppercase tracking-wider mb-1">{label}</p>
                <p className="text-[22px] font-bold !text-dash-text tabular-nums">
                  {metric.used.toLocaleString()}
                  <span className="text-[13px] font-medium !text-dash-textMuted">
                    {isUnlimited ? '' : ` / ${metric.limit.toLocaleString()}`}
                  </span>
                </p>
              </div>
              {!isUnlimited && (
                <div className="w-full bg-white border border-dash-border rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColor(pct)}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
