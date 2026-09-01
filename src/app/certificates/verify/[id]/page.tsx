import React from 'react';
import { ShieldCheck, ShieldX } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Public certificate verification. No auth: anyone holding the validation id printed on a
// certificate PDF can confirm it. It exposes ONLY what is already printed on that PDF —
// recipient name, course title, issue date, validation id — nothing else (no email, no
// contact/course ids, no progress data). Read via the service-role client because the
// course_certificates RLS policies (student-own / workspace-member) would block an
// anonymous read.

async function lookup(validationId: string) {
  if (!validationId || validationId.length > 128) return null;
  const db = createAdminClient();
  const { data } = await db
    .from('course_certificates')
    .select('validation_id, student_name_snapshot, course_title_snapshot, issued_at')
    .eq('validation_id', validationId)
    .maybeSingle();
  return data || null;
}

export default async function VerifyCertificatePage({ params }: { params: { id: string } }) {
  const cert = await lookup(decodeURIComponent(params.id));
  const issued = cert
    ? new Date(cert.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-dash-bg px-4 py-16 font-body">
      <div className="w-full max-w-md rounded-2xl border border-dash-border bg-white p-8 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-2">
          <span className="h-1 w-1 rounded-full bg-dash-accent" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] !text-dash-accent">
            LeadsMind
          </span>
        </div>

        {cert ? (
          <>
            <div className="mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-500/15">
              <ShieldCheck size={26} />
            </div>
            <h1 className="mt-4 font-display text-[20px] font-semibold tracking-[-0.01em] !text-dash-text">
              Certificate verified
            </h1>
            <p className="mt-1 text-[13px] leading-relaxed !text-dash-textMuted">
              This is a genuine certificate issued by LeadsMind.
            </p>

            <dl className="mt-6 space-y-3 border-t border-dash-border pt-5 text-[13px]">
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 !text-dash-textMuted">Issued to</dt>
                <dd className="text-right font-semibold !text-dash-text">
                  {cert.student_name_snapshot}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 !text-dash-textMuted">Course</dt>
                <dd className="text-right font-semibold !text-dash-text">
                  {cert.course_title_snapshot}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 !text-dash-textMuted">Issued on</dt>
                <dd className="text-right font-semibold !text-dash-text">{issued}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 !text-dash-textMuted">Validation ID</dt>
                <dd className="text-right font-mono text-[12px] !text-dash-text">
                  {cert.validation_id}
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <>
            <div className="mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 ring-1 ring-inset ring-rose-500/15">
              <ShieldX size={26} />
            </div>
            <h1 className="mt-4 font-display text-[20px] font-semibold tracking-[-0.01em] !text-dash-text">
              Certificate not found
            </h1>
            <p className="mt-1 text-[13px] leading-relaxed !text-dash-textMuted">
              No certificate matches this validation ID. Check the ID printed on the
              certificate and try again.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
