"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, animate, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ChevronRight, DollarSign, Layers, TrendingUp, Trophy } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { useDashboardContext } from "@/components/layouts/DashboardProvider";
import { createClient } from "@/lib/supabase/client";
import { getStageTheme } from "@/app/pipelines/lib/stageColors";
import UserAvatar from "@/components/ui/UserAvatar";
import { CurrencyValue } from "@/components/dashboard-ui";
import type { PipelineFunnelStage } from "@/types/analytics.types";

interface SalesPipelineSummaryProps {
  pipelineFunnel: PipelineFunnelStage[];
}

const DEALS_PREVIEW_LIMIT = 20;
const COLUMN_HEIGHT = 520;
const COLUMN_WIDTH = 292;
const VISIBLE_CARDS = 20;

function withAlpha(hex: string, alpha: number): string {
  const value = parseInt(hex.replace("#", ""), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Ticks a displayed number from its previous value to its new one instead of
// hard-swapping — the "smooth transition, not a hard re-render flash" ask.
function AnimatedNumber({ value, formatter }: { value: number; formatter: (n: number) => string }) {
  const [display, setDisplay] = useState(value);
  const prevRef = React.useRef(value);

  useEffect(() => {
    const from = prevRef.current;
    const controls = animate(from, value, {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    prevRef.current = value;
    return () => controls.stop();
  }, [value]);

  return <span className="tabular-nums">{formatter(Math.round(display))}</span>;
}

function daysInStage(stageEnteredAt: string): string {
  try {
    return formatDistanceToNowStrict(new Date(stageEnteredAt));
  } catch {
    return "—";
  }
}

async function fetchPipelineFunnel(workspaceId: string): Promise<PipelineFunnelStage[]> {
  const supabase = createClient();

  const { data: stagesRaw } = await supabase
    .from("pipeline_stages")
    .select(`
      id, name, position,
      pipeline:pipelines(id, name),
      opportunities(
        id, title, value, stage_entered_at, owner_id,
        contact:contacts!opportunities_contact_id_fkey(id, first_name, last_name)
      )
    `)
    .eq("workspace_id", workspaceId)
    .order("position", { ascending: true });

  const stages = (stagesRaw ?? []) as any[];

  const funnel = stages.map((s) => {
    const stageOpportunities: any[] = Array.isArray(s.opportunities) ? s.opportunities : [];
    const pipelineRel = Array.isArray(s.pipeline) ? s.pipeline[0] : s.pipeline;
    return {
      id: s.id,
      label: s.name,
      value: stageOpportunities.length,
      totalValue: stageOpportunities.reduce((sum, o) => sum + (Number(o.value) || 0), 0),
      pipelineId: pipelineRel?.id ?? null,
      pipelineName: pipelineRel?.name ?? null,
      deals: stageOpportunities.slice(0, DEALS_PREVIEW_LIMIT).map((o) => {
        const contact = Array.isArray(o.contact) ? o.contact[0] : o.contact;
        return {
          id: o.id,
          title: o.title,
          value: Number(o.value) || 0,
          stageEnteredAt: o.stage_entered_at,
          ownerId: o.owner_id ?? null,
          contact: contact ? { firstName: contact.first_name, lastName: contact.last_name } : null,
          owner: null as { firstName: string | null; lastName: string | null; avatarUrl: string | null } | null,
        };
      }),
    };
  });

  const ownerIds = Array.from(
    new Set(funnel.flatMap((s) => s.deals.map((d) => d.ownerId).filter(Boolean) as string[]))
  );
  if (ownerIds.length > 0) {
    const { data: owners } = await supabase
      .from("users")
      .select("id, first_name, last_name, avatar_url")
      .in("id", ownerIds);
    const ownersById = new Map((owners ?? []).map((u: any) => [u.id, u]));
    funnel.forEach((stage) => {
      stage.deals.forEach((d) => {
        const owner = d.ownerId ? ownersById.get(d.ownerId) : null;
        d.owner = owner
          ? { firstName: owner.first_name, lastName: owner.last_name, avatarUrl: owner.avatar_url }
          : null;
      });
    });
  }

  return funnel as PipelineFunnelStage[];
}

function DealCard({
  deal,
  accent,
  onOpen,
}: {
  deal: PipelineFunnelStage["deals"][number];
  accent: string;
  onOpen: () => void;
}) {
  const contactName = deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName}` : deal.title;

  return (
    <motion.div
      layout
      layoutId={deal.id}
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2 }}
      onClick={onOpen}
      className="group relative bg-white rounded-2xl p-3.5 cursor-pointer transition-shadow duration-200 motion-reduce:transition-none shadow-[0_1px_3px_rgba(15,23,42,0.06)] hover:shadow-[0_10px_24px_rgba(15,23,42,0.1)]"
      style={{ border: `1px solid ${withAlpha(accent, 0.16)}`, borderLeft: `3px solid ${accent}` }}
    >
      <ChevronRight
        size={13}
        className="absolute top-3 right-3 !text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <div className="flex items-start gap-2.5">
        <div className="relative shrink-0">
          <UserAvatar
            firstName={deal.owner?.firstName ?? deal.contact?.firstName}
            lastName={deal.owner?.lastName ?? deal.contact?.lastName}
            avatarUrl={deal.owner?.avatarUrl}
            size="sm"
          />
          <span
            className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-white"
            style={{ backgroundColor: accent }}
          />
        </div>
        <div className="min-w-0 flex-1 pr-4">
          <p className="text-[12.5px] font-bold !text-[#0F172A] truncate leading-snug group-hover:!text-[#1359FF] transition-colors">
            {contactName}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10.5px] font-extrabold tabular-nums"
              style={{ backgroundColor: withAlpha(accent, 0.1), color: accent }}
            >
              <CurrencyValue value={deal.value} />
            </span>
            <span className="text-[10px] font-medium !text-slate-400 whitespace-nowrap">
              {daysInStage(deal.stageEnteredAt)} in stage
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyStageState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center py-10 px-3 bg-gradient-to-b from-slate-50/80 to-transparent rounded-xl border border-dashed border-slate-200/80">
      <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-2.5 shadow-sm">
        <Layers size={16} className="!text-slate-300" />
      </div>
      <p className="text-[11.5px] font-semibold !text-slate-400">No deals in this stage yet</p>
    </div>
  );
}

function ColumnSkeleton() {
  return (
    <div className="shrink-0 rounded-2xl border border-[#EEF2F7] overflow-hidden" style={{ width: COLUMN_WIDTH, height: COLUMN_HEIGHT }}>
      <div className="h-[84px] bg-slate-100/80 animate-pulse" />
      <div className="p-2.5 space-y-2.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[70px] rounded-2xl bg-slate-50 border border-slate-100 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export function SalesPipelineSummary({ pipelineFunnel }: SalesPipelineSummaryProps) {
  const router = useRouter();
  const { workspace } = useDashboardContext();
  const [funnel, setFunnel] = useState(pipelineFunnel);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(pipelineFunnel.length > 0);

  useEffect(() => {
    setFunnel(pipelineFunnel);
    if (pipelineFunnel.length > 0) setHasLoadedOnce(true);
  }, [pipelineFunnel]);

  // Live-sync with the Manage Pipeline board: any insert/update/delete/stage
  // move on `opportunities`, or a stage rename/reorder on `pipeline_stages`,
  // re-runs the same aggregate query this widget renders from — so a deal
  // dragged to a new stage on /pipelines (or created there) appears here
  // without a dashboard reload.
  useEffect(() => {
    const workspaceId = workspace?.id;
    if (!workspaceId) return;

    const supabase = createClient();
    const refetch = async () => {
      const data = await fetchPipelineFunnel(workspaceId);
      setFunnel(data);
      setHasLoadedOnce(true);
    };

    const channel = supabase
      .channel(`dashboard_pipeline_${workspaceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "opportunities", filter: `workspace_id=eq.${workspaceId}` },
        refetch
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pipeline_stages", filter: `workspace_id=eq.${workspaceId}` },
        refetch
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspace?.id]);

  const { totalValue, totalDeals } = useMemo(
    () => ({
      totalValue: funnel.reduce((sum, s) => sum + (s.totalValue ?? 0), 0),
      totalDeals: funnel.reduce((sum, s) => sum + (s.value ?? 0), 0),
    }),
    [funnel]
  );

  const openDeal = (dealId: string, pipelineId: string | null) => {
    const params = new URLSearchParams();
    if (pipelineId) params.set("pipelineId", pipelineId);
    params.set("opportunityId", dealId);
    router.push(`/pipelines?${params.toString()}`);
  };

  return (
    <div className="bg-gradient-to-b from-white to-slate-50/40 border border-[#EEF2F7] rounded-[24px] p-6 shadow-[0_4px_24px_rgba(15,23,42,0.05)] flex flex-col justify-between">
      {/* Header row */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h3 className="text-[19px] font-bold !text-[#0F172A] tracking-tight">Sales Pipeline Summary</h3>
          <p className="text-[12px] !text-slate-500 mt-0.5">Live stage-by-stage view of your open deals</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 pl-3 pr-4 py-2 rounded-2xl bg-white border border-[#EEF2F7] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <DollarSign size={15} className="!text-emerald-600" />
            </div>
            <div>
              <div className="text-[9.5px] font-bold !text-slate-400 uppercase tracking-wider leading-none">Pipeline value</div>
              <div className="text-[16px] font-extrabold !text-[#0F172A] leading-tight mt-0.5">
                <AnimatedNumber value={totalValue} formatter={(n) => `$${n.toLocaleString()}`} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 pl-3 pr-4 py-2 rounded-2xl bg-white border border-[#EEF2F7] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <TrendingUp size={15} className="!text-[#1359FF]" />
            </div>
            <div>
              <div className="text-[9.5px] font-bold !text-slate-400 uppercase tracking-wider leading-none">Open deals</div>
              <div className="text-[16px] font-extrabold !text-[#0F172A] leading-tight mt-0.5">
                <AnimatedNumber value={totalDeals} formatter={(n) => n.toLocaleString()} />
              </div>
            </div>
          </div>
          <a
            href="/pipelines"
            className="h-[42px] px-4 rounded-2xl bg-[#0F172A] hover:bg-[#1e293b] !text-white text-[12px] font-bold flex items-center gap-1.5 whitespace-nowrap transition-all shadow-[0_4px_16px_rgba(15,23,42,0.18)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.28)] hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            Manage Pipeline <ArrowUpRight size={13} />
          </a>
        </div>
      </div>

      {!hasLoadedOnce ? (
        <div className="flex gap-4 overflow-x-hidden">
          {[0, 1, 2, 3].map((i) => (
            <ColumnSkeleton key={i} />
          ))}
        </div>
      ) : funnel.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-16 border border-dashed border-[#E5E7EB] rounded-2xl p-6 bg-slate-50/50">
          <Layers size={28} className="!text-slate-300 mb-3" />
          <h4 className="text-[14px] font-bold !text-[#0F172A]">No opportunities yet</h4>
          <p className="text-[12px] !text-slate-500 mt-0.5 max-w-[280px]">
            Create your first opportunity to start tracking pipeline performance.
          </p>
          <a
            href="/pipelines"
            className="mt-4 px-4 py-2 bg-[#2563EB] hover:bg-blue-700 !text-white rounded-xl text-[12px] font-bold shadow-sm transition-all"
          >
            Create Opportunity
          </a>
        </div>
      ) : (
        <div className="relative">
          <div className="flex items-stretch gap-0 overflow-x-auto pb-2 light-scrollbar">
            {funnel.map((stage, idx) => {
              const theme = getStageTheme(idx, funnel.length);
              const isWon = idx === funnel.length - 1 && funnel.length > 1;
              const prevCount = idx > 0 ? funnel[idx - 1].value : null;
              const conversion =
                prevCount && prevCount > 0 ? Math.round((stage.value / prevCount) * 100) : null;
              const conversionColor =
                conversion === null ? "#94A3B8" : conversion >= 70 ? "#10B981" : conversion >= 40 ? "#FF8A00" : "#EF4444";
              const visibleDeals = stage.deals.slice(0, VISIBLE_CARDS);
              const hiddenCount = Math.max(0, stage.value - visibleDeals.length);

              return (
                <div key={stage.id} className="shrink-0 flex items-start" style={{ width: idx > 0 ? COLUMN_WIDTH + 44 : COLUMN_WIDTH }}>
                  {/* Funnel connector — conversion drop-off between this
                      stage and the previous one, rendered as an animated
                      gradient flow line with a severity-colored % pill. */}
                  {idx > 0 && (
                    <div className="flex flex-col items-center justify-start pt-[38px] w-11 shrink-0">
                      <div className="relative w-full h-[3px] rounded-full overflow-hidden bg-slate-100">
                        <div
                          className="absolute inset-y-0 left-0 w-1/2 pipeline-flow"
                          style={{ background: `linear-gradient(90deg, transparent, ${conversionColor}, transparent)` }}
                        />
                      </div>
                      <div
                        className="flex items-center gap-0.5 mt-1.5 px-1.5 py-0.5 rounded-full whitespace-nowrap"
                        style={{ backgroundColor: withAlpha(conversionColor, 0.12) }}
                      >
                        <ChevronRight size={9} style={{ color: conversionColor }} />
                        {conversion !== null && (
                          <span className="text-[9.5px] font-extrabold tabular-nums" style={{ color: conversionColor }}>
                            {conversion}%
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div
                    className="flex flex-col rounded-2xl border overflow-hidden shrink-0 shadow-[0_2px_14px_rgba(15,23,42,0.045)] transition-shadow duration-200 hover:shadow-[0_6px_24px_rgba(15,23,42,0.08)] motion-reduce:transition-none"
                    style={{ height: COLUMN_HEIGHT, width: COLUMN_WIDTH, borderColor: withAlpha(theme.solid, 0.18) }}
                  >
                    {/* Top accent bar */}
                    <div className="h-[4px] shrink-0" style={{ background: `linear-gradient(90deg, ${theme.solid}, ${withAlpha(theme.solid, 0.4)})` }} />

                    {/* Sticky column header */}
                    <div
                      className="sticky top-0 z-[1] px-4 py-3.5 border-b backdrop-blur-md backdrop-saturate-150"
                      style={{
                        background: `linear-gradient(180deg, ${withAlpha(theme.solid, 0.1)}, rgba(255,255,255,0.85))`,
                        borderColor: withAlpha(theme.solid, 0.14),
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 ring-4"
                          style={{ backgroundColor: theme.solid, ["--tw-ring-color" as any]: withAlpha(theme.solid, 0.18) }}
                        />
                        <span className="text-[11.5px] font-extrabold uppercase tracking-wider !text-slate-700 truncate">
                          {stage.label}
                        </span>
                        {isWon && <Trophy size={12} className="!text-emerald-500 shrink-0" />}
                      </div>
                      {stage.pipelineName && (
                        <div className="text-[9px] font-medium !text-slate-400 truncate mt-0.5 ml-4">
                          {stage.pipelineName}
                        </div>
                      )}
                      <div className="flex items-end justify-between mt-2.5">
                        <span className="text-[22px] font-extrabold !text-[#0F172A] tabular-nums leading-none">
                          <AnimatedNumber value={stage.value} formatter={(n) => `${n}`} />
                        </span>
                        <div className="text-right">
                          <div className="text-[9px] font-medium !text-slate-400 leading-none mb-1">deals</div>
                          <span
                            className="text-[11.5px] font-extrabold tabular-nums px-1.5 py-0.5 rounded-md"
                            style={{ color: theme.solid, backgroundColor: withAlpha(theme.solid, 0.1) }}
                          >
                            <AnimatedNumber value={stage.totalValue} formatter={(n) => `$${n.toLocaleString()}`} />
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Deal card list */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2.5 light-scrollbar bg-gradient-to-b from-slate-50/30 to-white">
                      {visibleDeals.length === 0 ? (
                        <EmptyStageState />
                      ) : (
                        <AnimatePresence initial={false} mode="popLayout">
                          {visibleDeals.map((deal) => (
                            <DealCard
                              key={deal.id}
                              deal={deal}
                              accent={theme.solid}
                              onOpen={() => openDeal(deal.id, stage.pipelineId)}
                            />
                          ))}
                        </AnimatePresence>
                      )}
                      {hiddenCount > 0 && (
                        <a
                          href="/pipelines"
                          className="block text-center text-[11px] font-bold !text-[#2563EB] hover:text-blue-700 py-2"
                        >
                          +{hiddenCount} more · View all
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scroll-edge fade hints */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-slate-50/80 to-transparent" />
        </div>
      )}

      <style>{`
        .pipeline-flow {
          animation: pipeline-flow-move 2.6s linear infinite;
        }
        @keyframes pipeline-flow-move {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .pipeline-flow { animation: none; }
        }
      `}</style>
    </div>
  );
}
