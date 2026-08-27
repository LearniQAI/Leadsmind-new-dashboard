"use client";

import React, { useEffect, useState } from "react";
import { X, Search, Loader2, UserPlus, Check } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "./settings/primitives";
import { cn } from "@/lib/utils";

interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

interface AddStudentModalProps {
  courseId: string;
  onClose: () => void;
  onEnrolled: () => void;
}

export default function AddStudentModal({ courseId, onClose, onEnrolled }: AddStudentModalProps) {
  const [query, setQuery] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isSearching, setIsSearching] = useState(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);

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
    setEnrollingId(contact.id);
    try {
      const res = await fetch("/api/lms/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: courseId, contact_id: contact.id }),
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
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-lg p-1.5 text-dash-textMuted transition-colors hover:bg-dash-surface hover:text-dash-text"
          >
            <X size={18} />
          </button>
        </div>

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
                    disabled={enrollingId === contact.id || isEnrolled}
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
