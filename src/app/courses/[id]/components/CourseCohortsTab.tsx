"use client";

import React, { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Users, Trash2, Pencil, CalendarClock, X, Check } from "lucide-react";
import {
  SettingsPanel,
  SettingsHeader,
  SettingsBody,
  Toggle,
  TextInput,
  PrimaryButton,
  GhostButton,
  EmptyState,
  LoadingState,
  StatusPill,
} from "./settings/primitives";
import StudentsRosterModal from "./StudentsRosterModal";
import {
  listCohorts,
  setCohortsEnabled,
  createCohort,
  updateCohort,
  deleteCohort,
} from "@/app/actions/courseCohorts";

interface Props {
  course: any;
  onSaved: (c: any) => void;
}

type Cohort = {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  seat_cap: number;
  seats_taken: number;
  seats_left: number;
  is_full: boolean;
  has_enrollments: boolean;
};

const toLocalInput = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");

function CohortForm({
  initial,
  locked,
  onCancel,
  onSubmit,
  busy,
}: {
  initial?: Partial<Cohort>;
  locked: boolean; // start_date + seat_cap frozen (has enrollments)
  onCancel: () => void;
  onSubmit: (v: { name: string; start_date: string; end_date: string | null; seat_cap: number }) => void;
  busy: boolean;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [start, setStart] = useState(toLocalInput(initial?.start_date || null));
  const [end, setEnd] = useState(toLocalInput(initial?.end_date || null));
  const [cap, setCap] = useState(initial?.seat_cap != null ? String(initial.seat_cap) : "");

  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-[11px] font-semibold text-dash-textMuted">Cohort name</span>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Autumn 2026" />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] font-semibold text-dash-textMuted">
            Seat cap {locked && <em className="not-italic text-amber-600">(locked — has students)</em>}
          </span>
          <TextInput type="number" min={1} step={1} value={cap} disabled={locked}
            onChange={(e) => setCap(e.target.value)} placeholder="e.g. 25" className="font-mono" />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] font-semibold text-dash-textMuted">
            Start date {locked && <em className="not-italic text-amber-600">(locked)</em>}
          </span>
          <TextInput type="datetime-local" value={start} disabled={locked}
            onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] font-semibold text-dash-textMuted">End date (optional)</span>
          <TextInput type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
      </div>
      <div className="flex gap-2">
        <PrimaryButton
          type="button"
          loading={busy}
          onClick={() =>
            onSubmit({ name, start_date: start, end_date: end || null, seat_cap: parseInt(cap) || 0 })
          }
        >
          <Check className="size-3.5" /> Save cohort
        </PrimaryButton>
        <GhostButton type="button" onClick={onCancel}>
          <X className="size-3.5" /> Cancel
        </GhostButton>
      </div>
    </div>
  );
}

export default function CourseCohortsTab({ course, onSaved }: Props) {
  const [enabled, setEnabled] = useState<boolean>(!!course.cohorts_enabled);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rosterCohort, setRosterCohort] = useState<Cohort | null>(null);
  const [pending, startTransition] = useTransition();

  const load = () => {
    setLoading(true);
    listCohorts(course.id)
      .then((r) => setCohorts((r as any).data || []))
      .finally(() => setLoading(false));
  };
  useEffect(load, [course.id]);

  const toggle = (v: boolean) => {
    setEnabled(v);
    startTransition(async () => {
      const r = await setCohortsEnabled(course.id, v);
      if ((r as any).error) {
        toast.error((r as any).error);
        setEnabled(!v);
      } else {
        toast.success(v ? "Cohorts enabled." : "Cohorts disabled.");
        onSaved({ ...course, cohorts_enabled: v });
      }
    });
  };

  const doCreate = (v: any) =>
    startTransition(async () => {
      const r = await createCohort(course.id, v);
      if ((r as any).error) toast.error((r as any).error);
      else {
        toast.success("Cohort created.");
        setCreating(false);
        load();
      }
    });

  const doUpdate = (id: string, v: any) =>
    startTransition(async () => {
      const r = await updateCohort(id, v);
      if ((r as any).error) toast.error((r as any).error);
      else {
        toast.success("Cohort updated.");
        setEditingId(null);
        load();
      }
    });

  const doDelete = (id: string) => {
    if (!window.confirm("Delete this cohort?")) return;
    startTransition(async () => {
      const r = await deleteCohort(id);
      if ((r as any).error) toast.error((r as any).error);
      else {
        toast.success("Cohort deleted.");
        load();
      }
    });
  };

  return (
    <SettingsPanel>
      <SettingsHeader
        eyebrow="Cohorts"
        title="Scheduled cohorts"
        description="Run this course as scheduled groups moving through it together — a shared start date and a per-cohort seat cap. Independent of the pricing / start-method settings."
      />
      <SettingsBody className="space-y-6">
        <Toggle
          checked={enabled}
          onChange={toggle}
          label="Enable cohorts for this course"
          description="When on, students pick a cohort as part of enrolment and only non-full cohorts are offered."
        />

        {enabled && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-dash-text">Cohorts</span>
              {!creating && (
                <GhostButton type="button" onClick={() => { setCreating(true); setEditingId(null); }}>
                  <Plus className="size-3.5" /> New cohort
                </GhostButton>
              )}
            </div>

            {creating && (
              <CohortForm locked={false} busy={pending} onCancel={() => setCreating(false)} onSubmit={doCreate} />
            )}

            {loading ? (
              <LoadingState label="Loading cohorts…" />
            ) : cohorts.length === 0 && !creating ? (
              <EmptyState
                icon={<CalendarClock className="size-5" />}
                title="No cohorts yet"
                description="Create your first cohort to schedule a group intake."
              />
            ) : (
              <div className="space-y-2">
                {cohorts.map((c) =>
                  editingId === c.id ? (
                    <CohortForm
                      key={c.id}
                      initial={c}
                      locked={c.has_enrollments}
                      busy={pending}
                      onCancel={() => setEditingId(null)}
                      onSubmit={(v) => doUpdate(c.id, v)}
                    />
                  ) : (
                    <div
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dash-border bg-white px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-dash-text truncate">{c.name}</span>
                          {c.is_full ? (
                            <StatusPill tone="amber">Full</StatusPill>
                          ) : (
                            <StatusPill tone="green">{c.seats_left} left</StatusPill>
                          )}
                        </div>
                        <div className="mt-0.5 text-[11px] text-dash-textMuted">
                          Starts {new Date(c.start_date).toLocaleDateString(undefined, { dateStyle: "medium" })}
                          {c.end_date ? ` · ends ${new Date(c.end_date).toLocaleDateString(undefined, { dateStyle: "medium" })}` : ""}
                          {" · "}
                          {c.seats_taken}/{c.seat_cap} seats
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setRosterCohort(c)}
                          className="inline-flex items-center gap-1 rounded-lg border border-dash-border px-2.5 py-1.5 text-[11px] font-semibold text-dash-textMuted hover:text-dash-text"
                        >
                          <Users className="size-3.5" /> Roster
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEditingId(c.id); setCreating(false); }}
                          className="rounded-lg border border-dash-border p-1.5 text-dash-textMuted hover:text-dash-text"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={c.has_enrollments}
                          onClick={() => doDelete(c.id)}
                          title={c.has_enrollments ? "Has enrolled students" : "Delete cohort"}
                          className="rounded-lg border border-transparent p-1.5 text-red hover:bg-red/10 disabled:opacity-40"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </SettingsBody>

      {rosterCohort && (
        <StudentsRosterModal
          courseId={course.id}
          cohortId={rosterCohort.id}
          cohortName={rosterCohort.name}
          onClose={() => setRosterCohort(null)}
        />
      )}
    </SettingsPanel>
  );
}
