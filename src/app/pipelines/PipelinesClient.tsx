'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Plus, Layers, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pipeline, PipelineStage, Opportunity } from '@/types/crm';
import { PipelineStats } from './components/PipelineStats';
import { KanbanColumn } from './components/KanbanColumn';
import { OpportunityModal } from './components/OpportunityModal';
import { StageSettingsModal } from './components/StageSettingsModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { updateDealStage, deletePipeline, getMoreStageOpportunities } from '@/app/actions/pipelines';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { Contact } from '@/types/crm';
import { CreatePipelineModal } from './components/CreatePipelineModal';
import { createClient } from '@/lib/supabase/client';

// Must match PIPELINE_OPPORTUNITIES_PAGE_SIZE in src/app/actions/pipelines.ts
// — used here only to detect whether a stage has been paginated past its
// first page (see the resync-merge effect below), not to request pages
// itself (getMoreStageOpportunities owns real pagination server-side).
const OPPORTUNITIES_PAGE_SIZE = 50;

interface PipelinesClientProps {
  pipelines: Pipeline[];
  activePipeline: Pipeline;
  initialStages: PipelineStage[];
  initialOpportunities: Opportunity[];
  initialStageCounts: Record<string, number>;
  contacts: Contact[];
  members: { id: string, name: string }[];
}

export default function PipelinesClient({
  pipelines,
  activePipeline,
  initialStages,
  initialOpportunities,
  initialStageCounts,
  contacts,
  members
}: PipelinesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  // Created once per mount (not in the render body) — a fresh instance every
  // render would tear down and resubscribe the realtime effect below on
  // every state change. Same convention as ConversationsClient.tsx.
  const [supabase] = useState(() => createClient());

  // Modals state
  const [isOppModalOpen, setIsOppModalOpen] = useState(false);
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [targetStageId, setTargetStageId] = useState<string | null>(null);
  const [showDeletePipelineConfirm, setShowDeletePipelineConfirm] = useState(false);
  const [isDeletingPipeline, setIsDeletingPipeline] = useState(false);

  // Board's own source of truth for opportunities, seeded from the server
  // props. The PRIMARY root cause of "deal added but invisible" was actually
  // upstream of this component entirely: `getPipelineOpportunities`'s embed
  // query (`contact:contacts(*)`) was ambiguous — `opportunities` has three
  // FKs into `contacts` — and PostgREST rejected it outright (PGRST201) on
  // every single call, meaning `initialOpportunities` was `[]` from the very
  // first server render for every workspace, always, not just after a
  // create. Fixed at the query itself (see `pipelines.ts`). Independently of
  // that, this component ALSO had no direct update path for create/edit/
  // delete — only drag-and-drop ever updated local state; a freshly created
  // deal's visibility depended entirely on `OpportunityModal`'s
  // `router.refresh()` eventually cascading a new `initialOpportunities`
  // prop back down through a re-render, an indirect mechanism with no direct
  // code path connecting "deal created" to "board shows it". Both are fixed
  // now: the query returns real data, and the create/update/delete flow
  // (`OpportunityModal`'s `onSaved`) gives this state a direct, synchronous
  // update the instant the server action resolves, rather than relying
  // solely on the refresh cascade.
  const [opportunities, setOpportunities] = useState<Opportunity[]>(initialOpportunities);
  // Each stage's REAL total deal count (not just how many are currently
  // loaded) — getPipelineOpportunities now only fetches the first page per
  // stage. Drives each column's "Load more" affordance.
  const [stageCounts, setStageCounts] = useState<Record<string, number>>(initialStageCounts);
  const [loadingMoreStages, setLoadingMoreStages] = useState<Record<string, boolean>>({});

  // Tracks how many opportunities are currently loaded per stage, kept as a
  // ref (not state) purely so the resync effect below can read it without
  // needing to be an effect dependency itself.
  const loadedCountsRef = useRef<Record<string, number>>({});
  useEffect(() => {
    const counts: Record<string, number> = {};
    opportunities.forEach((o) => { counts[o.stage_id] = (counts[o.stage_id] || 0) + 1; });
    loadedCountsRef.current = counts;
  }, [opportunities]);

  // Defense in depth: if the server-provided list changes for any other
  // reason (e.g. a real page navigation, or router.refresh() — including
  // the debounced refresh the realtime subscription below triggers),
  // resync — but this is no longer the only way the board learns about a
  // deal, just a consistency backstop.
  //
  // Since getPipelineOpportunities only returns page 1 per stage, a naive
  // "just replace with the fresh prop" (the pre-pagination behavior) would
  // silently truncate any stage a user had paginated further into back down
  // to 50 items on every background refresh — a deal they were already
  // looking at would vanish. For a stage still within its first page,
  // replacing is exactly correct (identical to the old behavior). For a
  // stage the user has loaded further pages of, this merges instead: fresh
  // data updates/adds, but never drops something already on screen.
  useEffect(() => {
    setOpportunities((prev) => {
      const singlePageStageIds = new Set(
        initialStages
          .filter((s) => (loadedCountsRef.current[s.id] ?? 0) <= OPPORTUNITIES_PAGE_SIZE)
          .map((s) => s.id)
      );

      const freshForSinglePageStages = initialOpportunities.filter((o) => singlePageStageIds.has(o.stage_id));
      const freshById = new Map(initialOpportunities.map((o) => [o.id, o]));

      const mergedExpandedStages = prev
        .filter((o) => !singlePageStageIds.has(o.stage_id))
        .map((o) => freshById.get(o.id) || o);
      const mergedIds = new Set(mergedExpandedStages.map((o) => o.id));
      const newInExpandedStages = initialOpportunities.filter(
        (o) => !singlePageStageIds.has(o.stage_id) && !mergedIds.has(o.id)
      );

      return [...freshForSinglePageStages, ...mergedExpandedStages, ...newInExpandedStages];
    });
  }, [initialOpportunities, initialStages]);

  useEffect(() => {
    setStageCounts(initialStageCounts);
  }, [initialStageCounts]);

  const handleLoadMore = async (stageId: string) => {
    setLoadingMoreStages((prev) => ({ ...prev, [stageId]: true }));
    const currentlyLoaded = opportunities.filter((o) => o.stage_id === stageId).length;
    const res = await getMoreStageOpportunities(stageId, currentlyLoaded);
    setLoadingMoreStages((prev) => ({ ...prev, [stageId]: false }));

    if (!res.success || !res.data) {
      toast.error(res.error || 'Failed to load more deals.');
      return;
    }

    setOpportunities((prev) => {
      const existingIds = new Set(prev.map((o) => o.id));
      const newOnes = res.data!.filter((o) => !existingIds.has(o.id));
      return [...prev, ...newOnes];
    });
    if (typeof res.total === 'number') {
      setStageCounts((prev) => ({ ...prev, [stageId]: res.total! }));
    }
  };

  // Realtime subscription — live cross-tab/cross-user sync for stage moves,
  // adds, and deletes. Same shape as ConversationsClient.tsx's Communications
  // Hub subscription: workspace-scoped channel + filter (defense in depth on
  // top of RLS, which Realtime already enforces per subscriber JWT), debounced
  // router.refresh() rather than a raw refresh per event so a burst of writes
  // (e.g. a bulk drag, or this board's own re-sequencing touching several
  // rows in one move) collapses into one refetch. A refresh re-runs the page's
  // getPipelineOpportunities() and flows back down through the
  // `initialOpportunities` resync effect above — no separate patch-merge
  // logic needed here, unlike the message-bubble-level patching Conversations
  // needs for its own reasons.
  //
  // Filtered to workspace_id, not the active pipeline specifically —
  // postgres_changes only supports a single column=eq.value filter and
  // `opportunities` has no pipeline_id column of its own (only stage_id,
  // whose pipeline is a join away). A workspace with several pipelines open
  // in different tabs can see an occasional redundant refresh from another
  // pipeline's activity; that's a minor extra round-trip, not a correctness
  // issue, and matches the simpler "just refetch" convention already used by
  // src/components/kanban/TasksBoard.tsx for the same tradeoff.
  const realtimeRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const workspaceId = activePipeline.workspace_id;
    if (!workspaceId || typeof window === 'undefined') return;

    const scheduleRefresh = () => {
      if (realtimeRefreshTimer.current) clearTimeout(realtimeRefreshTimer.current);
      realtimeRefreshTimer.current = setTimeout(() => router.refresh(), 300);
    };

    const channel = supabase
      .channel(`pipelines:${workspaceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'opportunities', filter: `workspace_id=eq.${workspaceId}` },
        () => scheduleRefresh()
      )
      .subscribe();

    return () => {
      if (realtimeRefreshTimer.current) clearTimeout(realtimeRefreshTimer.current);
      supabase.removeChannel(channel);
    };
  }, [supabase, router, activePipeline.workspace_id]);

  const handleEditDeal = (opp: Opportunity) => {
    setSelectedOpp(opp);
    setIsOppModalOpen(true);
  };

  // Deep-link entry point — the dashboard's Sales Pipeline widget links a
  // deal card straight to `/pipelines?pipelineId=...&opportunityId=...`
  // rather than duplicating this board's own detail UI. Opens the same
  // OpportunityModal a manual click on the card would. `openedRef` stops it
  // from reopening if the id ever matches after the user closes the modal.
  const openedDealIdRef = React.useRef<string | null>(null);
  useEffect(() => {
    const opportunityId = searchParams.get('opportunityId');
    if (!opportunityId || openedDealIdRef.current === opportunityId) return;

    const target = opportunities.find(o => o.id === opportunityId);
    if (target) {
      openedDealIdRef.current = opportunityId;
      handleEditDeal(target);
    }
  }, [searchParams, opportunities]);

  const handleCreateDeal = (stageId?: string) => {
    setSelectedOpp(null);
    setTargetStageId(stageId || (initialStages.length > 0 ? initialStages[0].id : null));
    setIsOppModalOpen(true);
  };

  const handleDeletePipeline = async () => {
    setIsDeletingPipeline(true);
    const res = await deletePipeline(activePipeline.id);
    setIsDeletingPipeline(false);

    if (!res.success) {
      toast.error(res.error || 'Failed to delete pipeline');
      return;
    }

    toast.success('Pipeline deleted');
    const remaining = pipelines.filter(p => p.id !== activePipeline.id);
    router.push(remaining.length > 0 ? `/pipelines?pipelineId=${remaining[0].id}` : '/pipelines');
    router.refresh();
  };

  // Called directly by OpportunityModal the moment createOpportunity/
  // updateOpportunity/deleteOpportunity resolves successfully — this is the
  // one direct, deterministic link from "server write succeeded" to "board
  // shows it", replacing the previous implicit refresh-cascade.
  const handleDealSaved = (opp: Opportunity, action: 'create' | 'update' | 'delete') => {
    setOpportunities(prev => {
      if (action === 'delete') return prev.filter(o => o.id !== opp.id);
      const exists = prev.some(o => o.id === opp.id);
      return exists ? prev.map(o => (o.id === opp.id ? opp : o)) : [...prev, opp];
    });
    if (action === 'create') {
      setStageCounts(prev => ({ ...prev, [opp.stage_id]: (prev[opp.stage_id] ?? 0) + 1 }));
    } else if (action === 'delete') {
      setStageCounts(prev => ({ ...prev, [opp.stage_id]: Math.max(0, (prev[opp.stage_id] ?? 1) - 1) }));
    }
    router.refresh();
  };

  // 2. Drag End Handler — same direct-state-update approach as above rather
  // than useOptimistic, so both mutation paths on this board go through one
  // consistent mechanism instead of two different ones.
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const dealId = draggableId;
    const newStageId = destination.droppableId;
    const newPosition = destination.index;
    const previous = opportunities;
    // Captured before the optimistic mutation below — this is what the board
    // believed was current at drag-start, sent to the server as the
    // optimistic-concurrency check's expected value.
    const expectedUpdatedAt = previous.find(o => o.id === dealId)?.updated_at;

    setOpportunities(prev =>
      prev.map(opp =>
        opp.id === dealId
          ? { ...opp, stage_id: newStageId, position: newPosition, updated_at: new Date().toISOString() }
          : opp
      )
    );

    startTransition(async () => {
      const res = await updateDealStage(dealId, newStageId, newPosition, expectedUpdatedAt);
      if (!res.success) {
        if (res.conflict) {
          // Someone else changed this exact deal between this board's last
          // known state and this drag — reverting to `previous` isn't
          // trustworthy either, since `previous` is the same stale snapshot
          // that caused the conflict. Pull the real current state instead of
          // silently guessing which side should win.
          toast.error('This deal was just changed elsewhere — refreshing with the latest version.');
          router.refresh();
        } else {
          toast.error('Tactical failure: Could not update deal stage');
          setOpportunities(previous);
        }
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* 1. Header Area */}
      <div className="shrink-0 flex flex-col">
        <div className="h-[72px] px-8 flex items-center justify-between bg-white/90 backdrop-blur-md sticky top-0 z-10 shadow-[0_1px_2px_rgba(15,23,42,0.04)] border-b border-dash-border/70">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <h1 className="text-[10px] font-bold !text-dash-accent uppercase tracking-wide leading-none mb-2">
                Pipelines
              </h1>
              <div className="flex items-center gap-2.5">
                <Select
                  value={activePipeline.id}
                  onValueChange={(value) => router.push(`/pipelines?pipelineId=${value}`)}
                >
                  <SelectTrigger className="h-auto w-auto gap-1.5 border-0 bg-transparent p-0 shadow-none text-[18px] font-bold !text-dash-text tracking-tight leading-none hover:text-dash-accent transition-colors focus:outline-none focus:ring-0 [&>svg]:opacity-60 [&>svg]:!text-dash-textMuted">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-dash-border rounded-xl shadow-xl">
                    {pipelines.map(p => (
                      <SelectItem key={p.id} value={p.id} className="text-[13px] font-semibold">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse"></div>
                <button
                  onClick={() => setShowDeletePipelineConfirm(true)}
                  title="Delete this pipeline"
                  className="w-7 h-7 rounded-lg flex items-center justify-center !text-dash-textMuted hover:!text-red hover:bg-red/10 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            <div className="h-10 w-[1px] bg-dash-border/60"></div>

            <button 
              onClick={() => setIsPipelineModalOpen(true)}
              className="group flex items-center gap-2 h-10 px-4 rounded-[12px] bg-dash-surface border border-dash-border !text-dash-textMuted hover:text-dash-accent hover:bg-dash-accent/5 transition-colors motion-reduce:transition-none"
              title="Add New Pipeline"
            >
              <Plus size={12} className="group-hover:scale-110 transition-transform motion-reduce:group-hover:scale-100" />
              <span className="text-[11px] font-bold tracking-wider">New pipeline</span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsStageModalOpen(true)}
              className="h-11 px-6 rounded-[12px] bg-dash-surface border border-dash-border !text-dash-text hover:bg-dash-border/60 text-[12px] font-bold transition-all flex items-center gap-2.5 active:scale-[0.98]"
            >
              <Layers size={12} className="!text-dash-textMuted" />
              Architect stages
            </button>
            <button
              onClick={() => handleCreateDeal()}
              className="h-11 px-6 rounded-[12px] bg-dash-accent text-white hover:bg-dash-accent/90 text-[12px] font-bold transition-all flex items-center gap-2.5 shadow-xl shadow-dash-accent/20 active:scale-[0.98]"
            >
              <Plus size={12} />
              Add deal
            </button>
          </div>
        </div>

        <PipelineStats opportunities={opportunities} members={members} />
      </div>

      {/* 2. Compact Board Area — narrow fixed-width columns so a typical
          5-7 stage pipeline fits a standard desktop width without scrolling;
          horizontal scroll is a deliberate fallback for unusually long
          pipelines, not the default experience. */}
      <div className="relative flex-1 min-h-0">
        <div className="h-full overflow-x-auto light-scrollbar bg-dash-surface p-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex items-start gap-4 min-h-full">
            {initialStages.map((stage, idx) => {
              const stageOpportunities = opportunities.filter(opp => opp.stage_id === stage.id);
              const totalCount = stageCounts[stage.id] ?? stageOpportunities.length;
              return (
                <div key={stage.id} className="w-[260px] shrink-0">
                  <KanbanColumn
                    stage={stage}
                    stageIndex={idx}
                    stageCount={initialStages.length}
                    opportunities={stageOpportunities}
                    totalCount={totalCount}
                    onLoadMore={() => handleLoadMore(stage.id)}
                    loadingMore={!!loadingMoreStages[stage.id]}
                    onEditDeal={handleEditDeal}
                    onAddDeal={() => handleCreateDeal(stage.id)}
                    onSaved={handleDealSaved}
                    showEmptyStateAction={opportunities.length === 0}
                  />
                </div>
              );
            })}

            {/* Add Stage Placeholder */}
            <div
              onClick={() => setIsStageModalOpen(true)}
              className="w-[260px] shrink-0 h-[240px] flex flex-col items-center justify-center border-2 border-dashed border-dash-border rounded-2xl group hover:border-dash-accent/30 transition-all motion-reduce:transition-none cursor-pointer bg-white hover:bg-dash-accent/5"
            >
              <div className="w-11 h-11 rounded-2xl bg-white border border-dash-border flex items-center justify-center mb-3 group-hover:bg-dash-accent/10 group-hover:border-dash-accent/20 group-hover:scale-110 transition-all motion-reduce:group-hover:scale-100 shadow-inner">
                <Plus size={18} className="!text-dash-textMuted group-hover:text-dash-accent" />
              </div>
              <p className="text-[11px] font-bold !text-dash-textMuted tracking-wider group-hover:!text-dash-text transition-colors text-center px-4">Add pipeline stage</p>
            </div>
          </div>
        </DragDropContext>
        </div>
        {/* Fade hint — signals more stages exist off-screen instead of an
            abrupt hard cut when the board overflows horizontally. Only the
            columns themselves scroll (see overflow-x-auto above); this sits
            on top as a purely visual cue. */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-dash-surface to-transparent" />
      </div>

      {/* 3. Modals */}
      <OpportunityModal
        isOpen={isOppModalOpen}
        onClose={() => setIsOppModalOpen(false)}
        opportunity={selectedOpp}
        stageId={targetStageId || undefined}
        contacts={contacts}
        stages={initialStages}
        onSaved={handleDealSaved}
      />

      <StageSettingsModal
        isOpen={isStageModalOpen}
        onClose={() => setIsStageModalOpen(false)}
        pipelineId={activePipeline.id}
        initialStages={initialStages}
      />

      <CreatePipelineModal
        isOpen={isPipelineModalOpen}
        onClose={() => setIsPipelineModalOpen(false)}
      />

      <ConfirmDialog
        isOpen={showDeletePipelineConfirm}
        onClose={() => setShowDeletePipelineConfirm(false)}
        onConfirm={handleDeletePipeline}
        title={`Delete "${activePipeline.name}"?`}
        description="This permanently deletes the pipeline, all of its stages, and every deal inside them. This action can't be undone."
        confirmLabel={isDeletingPipeline ? 'Deleting...' : 'Yes, delete pipeline'}
        cancelLabel="Keep pipeline"
        variant="danger"
      />
    </div>
  );
}
