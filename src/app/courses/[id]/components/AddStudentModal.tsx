"use client";

import React, { useEffect, useState } from "react";
import { X, Search, Loader2, UserPlus, Check } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "./settings/primitives";
import { cn } from "@/lib/utils";
import { getOpenCohorts } from "@/app/actions/courseCohorts";

interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

interface OpenCohort {
  id: string;
  name: string;
  start_date: string;
  seats_left: number;
}

interface AddStudentModalProps {
  courseId: string;
  onClose: () => void;
  onEnrolled: () => void;
  /** Opened from a specific cohort's roster (CourseCohortsTab) — enrolment is locked to this
   *  cohort rather than asking the admin to pick one. */
  cohortId?: string;
  cohortName?: string;
}

export default function AddStudentModal({ courseId, onClose, onEnrolled, cohortId, cohortName }: AddStudentModalProps) {
  const [query, setQuery] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isSearching, setIsSearching] = useState(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);

  // Root cause of "students added via Add a student don't show up in the cohort roster":
  // this modal never asked which cohort to enrol into and never sent cohort_id, so every
  // enrolment made here landed with cohort_id = null regardless of the course having cohorts.
  // Fixed: when the course has cohorts enabled and isn't opened already locked to one
  // (cohortId prop, from a cohort's own Roster button), the admin must pick a real, currently
  // open cohort here too — same rule the student-facing checkout picker already enforces.
  const [openCohorts, setOpenCohorts] = useState<OpenCohort[]>([]);
  const [cohortsEnabled, setCohortsEnabled] = useState(false);
  const [selectedCohortId, setSelectedCohortId] = useState<string>(cohortId || "");
  const [loadingCohorts, setLoadingCohorts] = useState(!cohortId);

  useEffect(() => {
    if (cohortId) return; // already locked to one cohort — nothing to fetch/pick
    getOpenCohorts(courseId)
      .then((r: any) => {
        setCohortsEnabled(!!r.cohortsEnabled);
        setOpenCohorts(r.data || []);
      })
      .finally(() => setLoadingCohorts(false));
  }, [courseId, cohortId]);

  // Mirrors the student-facing checkout rule: only require a pick when there's a real, open
  // cohort to pick from. If every cohort is full, fall through to a cohort-less enrolment
  // rather than hard-blocking the admin (same as Cohorts Part 1's guest/self-serve paths).
  const cohortRequired = !cohortId && cohortsEnabled && openCohorts.length > 0;
  const effectiveCohortId = cohortId || selectedCohortId;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSearching(true);
      fetch(`/api/lms/contacts-search?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data) => setContacts(data.data || []))
        .finally(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleEnroll = async (contact: Contact) => {
    if (cohortRequired && !selectedCohortId) {
      toast.error("Choose a cohort first.");
      return;
    }
    setEnrollingId(contact.id);
    try {
      const res = await fetch("/api/lms/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: courseId,
          contact_id: contact.id,
          cohort_id: effectiveCohortId || null,
        }),
      });
      const dataJson = await res.json();
      if (dataJson.error) {
        toast.error(dataJson.error);
      } else {
        const who = contact.first_name || contact.email;
        toast.success(
          dataJson.emailSent
            ? `${who} enrolled — invitation email sent.`
            : `${who} enrolled. (Invitation email could not be sent — check the workspace email settings.)`
        );
        setEnrolledIds((prev) => [...prev, contact.id]);
        onEnrolled();
      }
    } catch {
      toast.error("Failed to enroll contact");
    } finally {
      setEnrollingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[600] flex items-start justify-center overflow-y-auto bg-slate-900/45 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="my-auto flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-dash-border bg-white shadow-[0_24px_64px_-16px_rgba(15,23,42,0.35)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-dash-border px-6 py-5">
          <div className="space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-600">
              Enrolment
            </div>
            <h2 className="font-display text-[17px] font-semibold leading-tight tracking-[-0.01em] text-dash-text">
              Add a student
            </h2>
            {cohortId && cohortName && (
              <p className="text-[11px] text-dash-textMuted">
                Enrolling into <span className="font-semibold text-dash-text">{cohortName}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-lg p-1.5 text-dash-textMuted transition-colors hover:bg-dash-surface hover:text-dash-text"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cohort picker — required before enrolling whenever this course has cohorts
            enabled, isn't already locked to one, and at least one cohort is still open. */}
        {!loadingCohorts && cohortRequired && (
          <div className="border-b border-dash-border bg-sky-50/40 px-6 py-3">
            <label htmlFor="add-student-cohort" className="mb-1 block text-[11px] font-semibold text-dash-text">
              Cohort
            </label>
            <select
              id="add-student-cohort"
              value={selectedCohortId}
              onChange={(e) => setSelectedCohortId(e.target.value)}
              className="h-9 w-full rounded-lg border border-dash-border bg-white px-2.5 text-[12px] text-dash-text outline-none focus:border-sky-500"
            >
              <option value="">Select a cohort…</option>
              {openCohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — starts {new Date(c.start_date).toLocaleDateString()} ({c.seats_left} seat{c.seats_left === 1 ? "" : "s"} left)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Search */}
        <div className="border-b border-dash-border px-6 py-4">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dash-textMuted" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search contacts by name or email…"
              className="h-10 w-full rounded-lg border border-dash-border bg-white pl-9 pr-3 text-[13px] text-dash-text outline-none transition-colors placeholder:text-dash-textMuted focus:border-sky-500 focus:ring-4 focus:ring-sky-500/12"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2">
          {isSearching ? (
            <div className="flex items-center justify-center gap-2 py-12 text-[12px] text-dash-textMuted">
              <Loader2 size={14} className="animate-spin" /> Searching…
            </div>
          ) : contacts.length === 0 ? (
            <div className="py-12 text-center text-[12px] text-dash-textMuted">
              No contacts match “{query}”.
            </div>
          ) : (
            contacts.map((contact) => {
              const isEnrolled = enrolledIds.includes(contact.id);
              const name =
                [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
                "Unnamed contact";
              return (
                <div
                  key={contact.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-dash-surface"
                >
                  <Avatar name={name} email={contact.email} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-dash-text">{name}</div>
                    <div className="truncate text-[11px] text-dash-textMuted">{contact.email}</div>
                  </div>
                  <button
                    disabled={enrollingId === contact.id || isEnrolled || (cohortRequired && !selectedCohortId)}
                    onClick={() => handleEnroll(contact)}
                    className={cn(
                      "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold transition-colors [&_svg]:size-3.5",
                      isEnrolled
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                        : "bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-60"
                    )}
                  >
                    {enrollingId === contact.id ? (
                      <Loader2 className="animate-spin" />
                    ) : isEnrolled ? (
                      <Check />
                    ) : (
                      <UserPlus />
                    )}
                    {isEnrolled ? "Enrolled" : "Enroll"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
