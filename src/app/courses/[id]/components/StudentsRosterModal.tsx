"use client";

import React, { useEffect, useState } from "react";
import { X, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

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
}

export default function StudentsRosterModal({ courseId, onClose }: StudentsRosterModalProps) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    fetch(`/api/lms/enrollments?courseId=${courseId}`)
      .then((res) => res.json())
      .then((data) => setEnrollments(data.data || []))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
  }, [courseId]);

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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[600] flex items-center justify-center p-4">
      <div className="bg-white border border-dash-border rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="p-5 border-b border-dash-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold !text-dash-text">Students</h3>
            <span className="text-[10px] !text-dash-textMuted font-mono">{enrollments.length} enrolled</span>
          </div>
          <button onClick={onClose} className="!text-dash-textMuted hover:!text-dash-text transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 !text-dash-textMuted text-xs py-10">
              <Loader2 size={14} className="animate-spin" /> Loading students...
            </div>
          ) : enrollments.length === 0 ? (
            <div className="text-center !text-dash-textMuted text-xs py-10">No students enrolled in this course yet.</div>
          ) : (
            <div className="space-y-2">
              {enrollments.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-3 bg-dash-surface border border-dash-border rounded-xl p-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold !text-dash-text truncate">
                      {e.contact ? [e.contact.first_name, e.contact.last_name].filter(Boolean).join(" ") || "Unnamed contact" : "Unknown contact"}
                    </div>
                    <div className="text-[10px] !text-dash-textMuted truncate">{e.contact?.email}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`text-[9px] font-bold px-2 py-0.5 rounded-md capitalize ${e.active ? "bg-green/10 text-green border border-green/20" : "bg-dash-surface !text-dash-textMuted border border-dash-border"}`}>
                      {e.status || (e.active ? "active" : "inactive")}
                    </Badge>
                    <button
                      disabled={removingId === e.id}
                      onClick={() => handleRemove(e.id)}
                      className="h-7 w-7 rounded-lg hover:bg-red/10 flex items-center justify-center text-red transition-colors disabled:opacity-60"
                    >
                      {removingId === e.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
