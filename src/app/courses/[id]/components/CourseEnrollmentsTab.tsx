"use client";

import React, { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, X, UserCheck, Clock } from "lucide-react";
import {
  SettingsPanel,
  SettingsHeader,
  SettingsBody,
  EmptyState,
  LoadingState,
} from "./settings/primitives";
import {
  getPendingEnrollmentsForCourse,
  approvePendingEnrollment,
  rejectPendingEnrollment,
  type PendingEnrollmentItem,
} from "@/app/actions/courseEnrollmentApproval";

interface CourseEnrollmentsTabProps {
  courseId: string;
  /** Only 'email_access_link' courses can ever produce a pending_approval row — shown so the
   *  empty state explains WHY, rather than looking like a broken/always-empty tab. */
  startMethod: string;
}

export default function CourseEnrollmentsTab({ courseId, startMethod }: CourseEnrollmentsTabProps) {
  const [items, setItems] = useState<PendingEnrollmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [workingId, setWorkingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await getPendingEnrollmentsForCourse(courseId);
    if ("error" in res) toast.error(res.error);
    else setItems(res.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const handleApprove = (id: string) => {
    setWorkingId(id);
    startTransition(async () => {
      const res = await approvePendingEnrollment(id);
      if ("error" in res) toast.error(res.error);
      else {
        toast.success("Approved — access link sent.");
        await load();
      }
      setWorkingId(null);
    });
  };

  const handleReject = (id: string) => {
    setWorkingId(id);
    startTransition(async () => {
      const res = await rejectPendingEnrollment(id);
      if ("error" in res) toast.error(res.error);
      else {
        toast.success("Signup rejected.");
        await load();
      }
      setWorkingId(null);
    });
  };

  if (loading) return <LoadingState label="Loading pending enrollments…" />;

  return (
    <SettingsPanel>
      <SettingsHeader
        eyebrow="Enrollments"
        title="Pending approval"
        description="Real signups waiting on a manual Approve before they get access — Course start method: Email access link, held for manual approval."
      />
      <SettingsBody>
        {startMethod !== "email_access_link" ? (
          <EmptyState
            icon={<UserCheck />}
            title="Not used by this course's start method"
            description="Pending approvals only happen when this course's start method (in Pricing) is set to Email access link with manual approval. This course currently uses a different method, so there is nothing to hold here."
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Clock />}
            title="Nothing pending"
            description="Every real signup for this course has already been approved or rejected."
          />
        ) : (
          <div className="space-y-2.5">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-dash-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-dash-text">{item.studentName}</div>
                  <div className="truncate text-[12px] text-dash-textMuted">{item.studentEmail || "No email on file"}</div>
                  {item.enrolledAt && (
                    <div className="mt-0.5 text-[11px] text-dash-textMuted">
                      Signed up {new Date(item.enrolledAt).toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={isPending && workingId === item.id}
                    onClick={() => handleApprove(item.id)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-[12px] font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Check size={13} /> Approve
                  </button>
                  <button
                    type="button"
                    disabled={isPending && workingId === item.id}
                    onClick={() => handleReject(item.id)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-dash-border bg-white px-3.5 text-[12px] font-semibold text-dash-textMuted transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                  >
                    <X size={13} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SettingsBody>
    </SettingsPanel>
  );
}
