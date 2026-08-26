"use client";

import React, { useEffect, useState } from "react";
import { X, Search, Loader2, UserPlus, Check } from "lucide-react";
import { toast } from "sonner";

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

  const handleEnroll = async (contact: Contact) => {
    setEnrollingId(contact.id);
    try {
      const res = await fetch("/api/lms/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: courseId, contact_id: contact.id })
      });
      const dataJson = await res.json();
      if (dataJson.error) {
        toast.error(dataJson.error);
      } else {
        toast.success(`${contact.first_name || contact.email} enrolled.`);
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[600] flex items-center justify-center p-4">
      <div className="bg-white border border-dash-border rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="p-5 border-b border-dash-border flex items-center justify-between">
          <h3 className="text-sm font-bold !text-dash-text">Add a student</h3>
          <button onClick={onClose} className="!text-dash-textMuted hover:!text-dash-text transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 border-b border-dash-border">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 !text-dash-textMuted" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search contacts by name or email..."
              className="w-full pl-9 pr-3 py-2 bg-dash-surface border border-dash-border rounded-lg text-xs !text-dash-text placeholder:!text-dash-textMuted focus:outline-none focus:ring-2 focus:ring-dash-accent/30"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isSearching ? (
            <div className="flex items-center justify-center gap-2 !text-dash-textMuted text-xs py-10">
              <Loader2 size={14} className="animate-spin" /> Searching...
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center !text-dash-textMuted text-xs py-10">No contacts found.</div>
          ) : (
            contacts.map((contact) => {
              const isEnrolled = enrolledIds.includes(contact.id);
              return (
                <div key={contact.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-dash-surface">
                  <div className="min-w-0">
                    <div className="text-xs font-bold !text-dash-text truncate">
                      {[contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Unnamed contact"}
                    </div>
                    <div className="text-[10px] !text-dash-textMuted truncate">{contact.email}</div>
                  </div>
                  <button
                    disabled={enrollingId === contact.id || isEnrolled}
                    onClick={() => handleEnroll(contact)}
                    className="shrink-0 h-7 px-3 rounded-lg bg-dash-accent hover:bg-dash-accent/90 disabled:opacity-60 text-white text-[10px] font-bold flex items-center gap-1 transition-colors"
                  >
                    {enrollingId === contact.id ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : isEnrolled ? (
                      <Check size={11} />
                    ) : (
                      <UserPlus size={11} />
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
