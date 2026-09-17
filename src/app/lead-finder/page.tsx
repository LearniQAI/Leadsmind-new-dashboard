import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { SearchFilters } from '@/components/lead-finder/SearchFilters';
import { SavedSearchManager } from '@/components/lead-finder/SavedSearchManager';
import { Target, MapPinned, Sparkles, UserPlus } from 'lucide-react';
import { DashStatusPill } from '@/components/dashboard-ui';

const HERO_FEATURES = [
  { icon: MapPinned, label: 'Global Google Places search' },
  { icon: Sparkles, label: 'Instant enrichment & scoring' },
  { icon: UserPlus, label: 'One-click CRM import' },
];

export default function LeadFinderPage() {
  return (
    <Wrapper>
      <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)]">
        <div className="flex flex-col gap-8">
          {/* Hero Section */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-white to-dash-accent/[0.06] border border-dash-border p-8 md:p-12 shadow-[0_1px_0_rgba(15,23,42,0.03),0_20px_48px_-24px_rgba(19,89,255,0.18)]">
            {/* Branded radial + concentric-ring motif, replacing the flat oversized icon */}
            <div
              className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(19,89,255,0.10) 0%, rgba(19,89,255,0.03) 55%, transparent 75%)' }}
            />
            <div className="absolute top-1/2 right-10 -translate-y-1/2 w-64 h-64 rounded-full border border-dash-accent/10 pointer-events-none hidden md:block" />
            <div className="absolute top-1/2 right-10 -translate-y-1/2 w-44 h-44 rounded-full border border-dash-accent/15 pointer-events-none hidden md:block" />
            <div className="absolute top-1/2 right-10 -translate-y-1/2 w-24 h-24 -mt-4 -mr-4 rounded-full bg-white border border-dash-border shadow-lg items-center justify-center pointer-events-none hidden md:flex">
              <Target className="w-9 h-9 text-dash-accent" strokeWidth={1.75} />
            </div>

            <div className="relative z-10 max-w-2xl">
              <DashStatusPill variant="accent" dot className="mb-4">
                AI-powered lead discovery
              </DashStatusPill>
              <h1 className="text-4xl md:text-5xl font-black !text-dash-text mb-4 leading-tight tracking-tight">
                Discover <span className="text-dash-accent">High-Intent</span> Leads on Autopilot.
              </h1>
              <p className="text-lg !text-dash-textMuted mb-6 max-w-xl">
                Search globally through Google Places, enrich data instantly, and add verified prospects directly into your CRM pipeline with a single click.
              </p>
              <div className="flex flex-wrap gap-2">
                {HERO_FEATURES.map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-dash-border px-3 py-1.5 text-xs font-semibold !text-dash-text backdrop-blur-sm"
                  >
                    <Icon size={13} className="text-dash-accent" /> {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2">
              <React.Suspense fallback={<div className="h-64 bg-white border border-dash-border rounded-2xl animate-pulse"></div>}>
                <SearchFilters />
              </React.Suspense>
            </div>
            <div className="lg:col-span-1 lg:sticky lg:top-6">
              <SavedSearchManager />
            </div>
          </div>
        </div>
      </div>
    </Wrapper>
  );
}
