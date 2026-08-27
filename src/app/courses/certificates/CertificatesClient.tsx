"use client";

import React, { useMemo, useState } from "react";
import {
  Award,
  ShieldCheck,
  Search,
  Copy,
  Eye,
  X,
  Printer,
  GraduationCap,
  Calendar,
  Users,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CertificatesClientProps {
  certificates: any[];
}

/* ------------------------------------------------------------------ */

function recipientOf(c: any): string {
  return (
    c.student_name ||
    [c.students?.first_name, c.students?.last_name].filter(Boolean).join(" ") ||
    c.students?.email ||
    c.recipient_name ||
    c.recipient ||
    "Unknown recipient"
  );
}

function courseOf(c: any): string {
  return c.courses?.name || c.courses?.title || c.course_title || c.course_name || "—";
}

function dateOf(c: any): string | null {
  return c.issued_at || c.created_at || c.completion_date || null;
}

function codeOf(c: any): string {
  return c.verification_code || c.certificate_number || c.code || c.id || "—";
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "?"
  );
}

/* ================================================================== */

export default function CertificatesClient({ certificates }: CertificatesClientProps) {
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<any | null>(null);

  const stats = useMemo(() => {
    const recipients = new Set(certificates.map((c) => c.contact_id || recipientOf(c)));
    const courses = new Set(certificates.map((c) => c.course_id || courseOf(c)));
    const latest = certificates
      .map((c) => dateOf(c))
      .filter(Boolean)
      .sort()
      .pop();
    return {
      total: certificates.length,
      recipients: recipients.size,
      courses: courses.size,
      latest: fmtDate(latest || null),
    };
  }, [certificates]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return certificates;
    return certificates.filter(
      (c) =>
        recipientOf(c).toLowerCase().includes(q) ||
        courseOf(c).toLowerCase().includes(q) ||
        codeOf(c).toLowerCase().includes(q)
    );
  }, [certificates, query]);

  const copyVerify = (c: any) => {
    const url = `${window.location.origin}/verify/${codeOf(c)}`;
    navigator.clipboard?.writeText(url).then(
      () => toast.success("Verification link copied"),
      () => toast.error("Couldn't copy link")
    );
  };

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-sky-500" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-600">
              Learning
            </span>
          </div>
          <h1 className="font-display text-[30px] font-semibold leading-[1.08] tracking-[-0.02em] !text-dash-text">
            Certificates
          </h1>
          <p className="text-[13px] leading-relaxed !text-dash-textMuted">
            Every completion certificate issued across your courses, with verification.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dash-textMuted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipient, course or code…"
            className="h-10 w-full rounded-lg border border-dash-border bg-white pl-9 pr-3 text-[13px] !text-dash-text outline-none transition-colors placeholder:text-dash-textMuted focus:border-sky-500 focus:ring-4 focus:ring-sky-500/12"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Issued" value={stats.total} icon={<Award />} tone="sky" />
        <Stat label="Recipients" value={stats.recipients} icon={<Users />} tone="emerald" />
        <Stat label="Courses" value={stats.courses} icon={<BookOpen />} tone="violet" />
        <Stat label="Latest issue" value={stats.latest} icon={<Calendar />} tone="amber" small />
      </div>

      {/* List */}
      {certificates.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-dash-border bg-dash-surface/40 py-16 text-center text-[13px] !text-dash-textMuted">
          No certificates match “{query}”.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c, i) => (
            <article
              key={c.id || i}
              className="group flex flex-col overflow-hidden rounded-2xl border border-dash-border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_1px_3px_rgba(15,23,42,0.03)] transition-shadow hover:shadow-md"
            >
              <div className="flex items-start gap-3 border-b border-dash-border bg-gradient-to-br from-sky-50/60 to-white px-5 py-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600 ring-1 ring-inset ring-sky-500/15">
                  <Award size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold !text-dash-text">
                    {recipientOf(c)}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 truncate text-[12px] !text-dash-textMuted">
                    <GraduationCap size={12} className="shrink-0" />
                    {courseOf(c)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 px-5 py-3 text-[12px] !text-dash-textMuted">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-emerald-500" />
                  {fmtDate(dateOf(c))}
                </span>
                <span className="truncate font-mono text-[11px]">{codeOf(c)}</span>
              </div>

              <div className="mt-auto grid grid-cols-2 gap-2 border-t border-dash-border p-3">
                <button
                  onClick={() => setPreview(c)}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-dash-border bg-white text-[12px] font-semibold !text-dash-text transition-colors hover:bg-dash-surface [&_svg]:size-3.5"
                >
                  <Eye /> Preview
                </button>
                <button
                  onClick={() => copyVerify(c)}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-sky-500 text-[12px] font-semibold text-white transition-colors hover:bg-sky-600 [&_svg]:size-3.5"
                >
                  <Copy /> Copy link
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {preview && <CertificatePreview cert={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */

const TONES: Record<string, string> = {
  sky: "border-sky-100 bg-sky-50 text-sky-600",
  emerald: "border-emerald-100 bg-emerald-50 text-emerald-600",
  violet: "border-violet-100 bg-violet-50 text-violet-600",
  amber: "border-amber-100 bg-amber-50 text-amber-600",
};

function Stat({
  label,
  value,
  icon,
  tone,
  small,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone: keyof typeof TONES;
  small?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-dash-border bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.1em] !text-dash-textMuted">
          {label}
        </div>
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg border [&_svg]:size-4",
            TONES[tone]
          )}
        >
          {icon}
        </span>
      </div>
      <div
        className={cn(
          "mt-3 font-semibold leading-none tracking-tight !text-dash-text",
          small ? "text-[16px]" : "text-[26px]"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-dash-border bg-dash-surface/40 px-6 py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dash-border bg-white text-sky-500">
        <Award size={26} />
      </span>
      <h3 className="mt-4 text-[15px] font-semibold !text-dash-text">No certificates issued yet</h3>
      <p className="mt-1.5 max-w-md text-[13px] leading-relaxed !text-dash-textMuted">
        A certificate is generated automatically when a student finishes every required lesson and
        passes every quiz in a course. Mark modules as <em>Required for completion</em> in the module
        settings to make a course certificate-eligible.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Premium certificate preview
 * ------------------------------------------------------------------ */

function CertificatePreview({ cert, onClose }: { cert: any; onClose: () => void }) {
  const recipient = recipientOf(cert);
  const course = courseOf(cert);
  const date = fmtDate(dateOf(cert));
  const code = codeOf(cert);

  const printCert = () => {
    const node = document.getElementById("cert-print-area");
    if (!node) return;
    const w = window.open("", "_blank", "width=1100,height=800");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Certificate — ${recipient}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=Source+Sans+3:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Source Sans 3',sans-serif;padding:32px;background:#fff}
        @page{size:A4 landscape;margin:0}
      </style></head><body>${node.outerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
      w.close();
    }, 400);
  };

  return (
    <div
      className="fixed inset-0 z-[600] flex items-start justify-center overflow-y-auto bg-slate-900/55 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="my-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-dash-border bg-white shadow-[0_24px_64px_-16px_rgba(15,23,42,0.4)]">
        <div className="flex items-center justify-between border-b border-dash-border px-6 py-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-600">
              Preview
            </div>
            <h2 className="font-display text-[16px] font-semibold !text-dash-text">Certificate</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={printCert}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-sky-500 px-3 text-[12px] font-semibold text-white transition-colors hover:bg-sky-600 [&_svg]:size-3.5"
            >
              <Printer /> Print / PDF
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 text-dash-textMuted transition-colors hover:bg-dash-surface hover:text-dash-text"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="bg-dash-surface/60 p-6">
          {/* The certificate itself */}
          <div
            id="cert-print-area"
            className="relative mx-auto aspect-[1.414/1] w-full overflow-hidden rounded-xl bg-[#fffdf7] shadow-lg"
            style={{ fontFamily: "'Source Sans 3', sans-serif" }}
          >
            {/* Ornamental frame */}
            <div className="absolute inset-3 rounded-lg border-[3px] border-[#c9a227]" />
            <div className="absolute inset-[18px] rounded-md border border-[#c9a227]/40" />
            {/* Corner flourishes */}
            {[
              "left-3 top-3",
              "right-3 top-3 rotate-90",
              "right-3 bottom-3 rotate-180",
              "left-3 bottom-3 -rotate-90",
            ].map((pos) => (
              <svg
                key={pos}
                className={`absolute ${pos} h-10 w-10 text-[#c9a227]`}
                viewBox="0 0 40 40"
                fill="none"
              >
                <path d="M4 36 V10 Q4 4 10 4 H36" stroke="currentColor" strokeWidth="2" />
                <circle cx="10" cy="10" r="2.5" fill="currentColor" />
              </svg>
            ))}

            <div className="relative flex h-full flex-col items-center justify-center px-[10%] text-center">
              <div
                className="text-[clamp(10px,1.6vw,15px)] font-semibold uppercase tracking-[0.32em] text-[#c9a227]"
              >
                Certificate of Completion
              </div>
              <div className="mt-[3%] h-px w-16 bg-[#c9a227]/50" />

              <p className="mt-[5%] text-[clamp(9px,1.3vw,13px)] uppercase tracking-[0.18em] text-slate-500">
                This is to certify that
              </p>
              <h1
                className="mt-[2%] text-[clamp(20px,4.4vw,44px)] font-semibold text-slate-800"
                style={{ fontFamily: "'Lora', serif" }}
              >
                {recipient}
              </h1>

              <p className="mt-[3%] max-w-[80%] text-[clamp(9px,1.3vw,13px)] leading-relaxed text-slate-500">
                has successfully completed all required coursework and assessments for
              </p>
              <h2
                className="mt-[1.5%] text-[clamp(13px,2.4vw,22px)] font-semibold text-[#1f2937]"
                style={{ fontFamily: "'Lora', serif" }}
              >
                {course}
              </h2>

              {/* Seal */}
              <div className="mt-[4%] flex items-center gap-[6%]">
                <div className="text-center">
                  <div
                    className="text-[clamp(9px,1.2vw,12px)] font-semibold text-slate-700"
                    style={{ fontFamily: "'Lora', serif" }}
                  >
                    {date}
                  </div>
                  <div className="mt-1 h-px w-24 bg-slate-300" />
                  <div className="mt-1 text-[clamp(7px,0.9vw,9px)] uppercase tracking-[0.14em] text-slate-400">
                    Date issued
                  </div>
                </div>

                <div className="relative flex h-[clamp(40px,7vw,68px)] w-[clamp(40px,7vw,68px)] items-center justify-center rounded-full bg-gradient-to-br from-[#e7c766] to-[#b8891f] text-white shadow-md ring-4 ring-[#fffdf7]">
                  <ShieldCheck className="h-1/2 w-1/2" />
                </div>

                <div className="text-center">
                  <div
                    className="text-[clamp(9px,1.2vw,12px)] font-semibold italic text-slate-700"
                    style={{ fontFamily: "'Lora', serif" }}
                  >
                    LeadsMind Academy
                  </div>
                  <div className="mt-1 h-px w-24 bg-slate-300" />
                  <div className="mt-1 text-[clamp(7px,0.9vw,9px)] uppercase tracking-[0.14em] text-slate-400">
                    Authorised by
                  </div>
                </div>
              </div>

              <div className="absolute bottom-[6%] left-0 right-0 text-[clamp(7px,0.9vw,9px)] font-mono uppercase tracking-[0.16em] text-slate-400">
                Verification ID — {code}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
