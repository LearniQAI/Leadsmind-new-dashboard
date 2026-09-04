"use client";

import React, { useEffect, useState } from "react";
import { X, Loader2, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Avatar, StatusPill, EmptyState } from "./settings/primitives";

interface Enrollment {
  id: string;
  contact_id: string;
  status: string | null;
  active: boolean | null;
  enrolled_at: string | null;
  access_type: string | null;
  contact: { id: string; first_name: string | null; last_name: string | null; email: string } | null;
}

interface StudentsRosterModalProps {
  courseId: string;
  onClose: () => void;
  /** Cohorts, Part 1: when set, the roster is scoped to one cohort's enrolments. */
  cohortId?: string;
  cohortName?: string;
}

export default function StudentsRosterModal({ courseId, onClose, cohortId, cohortName }: StudentsRosterModalProps) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    const qs = `courseId=${courseId}${cohortId ? `&cohortId=${cohortId}` : ""}`;
    fetch(`/api/lms/enrollments?${qs}`)
      .then((res) => res.json())
      .then((data) => setEnrollments(data.data || []))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
  }, [courseId, cohortId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleRemove = async (enrollmentId: string) => {
    if (!window.confirm("Remove this student's enrollment?")) return;
    setRemovingId(enrollmentId);
    try {
      const res = await fetch(`/api/lms/enrollments?id=${enrollmentId}`, { method: "DELETE" });
      const dataJson = await res.json();
      if (dataJson.error) toast.error(dataJson.error);
      else {
        toast.success("Enrollment removed.");
        setEnrollments((prev) => prev.filter((e) => e.id !== enrollmentId));
      }
    } catch {
      toast.error("Failed to remove enrollment");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[600] flex items-start justify-center overflow-y-auto bg-slate-900/45 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="my-auto flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-dash-border bg-white shadow-[0_24px_64px_-16px_rgba(15,23,42,0.35)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-dash-border px-6 py-5">
          <div className="space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-600">
              {cohortName ? "Cohort roster" : "Enrolment"}
            </div>
            <h2 className="font-display text-[17px] font-semibold leading-tight tracking-[-0.01em] text-dash-text">
              {cohortName ? cohortName : "Students"}
            </h2>
            <p className="text-[12px] text-dash-textMuted">
              {enrollments.length} {enrollments.length === 1 ? "student" : "students"} enrolled
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-lg p-1.5 text-dash-textMuted transition-colors hover:bg-dash-surface hover:text-dash-text"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-14 text-[12px] text-dash-textMuted">
              <Loader2 size={14} className="animate-spin" /> Loading students…
            </div>
          ) : enrollments.length === 0 ? (
            <EmptyState
              icon={<Users />}
              title="No students yet"
              description="Enrol someone from the Add a student panel and they’ll show up here."
            />
          ) : (
            <div className="divide-y divide-dash-border overflow-hidden rounded-xl border border-dash-border">
              {enrollments.map((e) => {
                const name = e.contact
                  ? [e.contact.first_name, e.contact.last_name].filter(Boolean).join(" ") ||
                    "Unnamed contact"
                  : "Unknown contact";
                return (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 bg-white px-4 py-3 transition-colors hover:bg-dash-surface/60"
                  >
                    <Avatar name={name} email={e.contact?.email} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-dash-text">{name}</div>
                      <div className="truncate text-[11px] text-dash-textMuted">
                        {e.contact?.email || "—"}
                      </div>
                    </div>
                    <StatusPill tone={e.active ? "green" : "slate"}>
                      {e.status || (e.active ? "active" : "inactive")}
                    </StatusPill>
                    <button
                      disabled={removingId === e.id}
                      onClick={() => handleRemove(e.id)}
                      aria-label="Remove enrolment"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-dash-textMuted transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
                    >
                      {removingId === e.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
