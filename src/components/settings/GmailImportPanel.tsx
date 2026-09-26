'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

// "Import existing conversations" for the signed-in user's own connected Gmail. Starting it only
// queues a background job (the gmail-sync worker imports a page at a time), so this polls progress.

type Job = {
  id: string
  status: 'counting' | 'importing' | 'completed' | 'failed' | 'cancelled'
  since: string | null
  total_messages: number | null
  processed: number
  imported: number
  duplicates: number
  skipped: number
  errors: number
  last_error: string | null
  finished_at: string | null
}

const RANGES: { value: string; label: string }[] = [
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last year' },
  { value: 'all', label: 'All mail' },
]

const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString()
const active = (j: Job | null) => !!j && (j.status === 'counting' || j.status === 'importing')

export default function GmailImportPanel() {
  const [job, setJob] = useState<Job | null>(null)
  const [open, setOpen] = useState(false)
  const [range, setRange] = useState('90')
  const [busy, setBusy] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/gmail/import', { cache: 'no-store' })
      if (!res.ok) return
      const body = await res.json()
      setJob(body.job ?? null)
    } catch {
      /* keep the last known state */
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (active(job)) {
      if (!timer.current) timer.current = setInterval(load, 5000)
    } else if (timer.current) {
      clearInterval(timer.current)
      timer.current = null
    }
    return () => {
      if (timer.current && !active(job)) {
        clearInterval(timer.current)
        timer.current = null
      }
    }
  }, [job, load])

  const start = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/gmail/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ range }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || 'Could not start the import.')
      setJob(body.job)
      setOpen(false)
      toast.success('Import started. It runs in the background, so you can leave this page.')
    } catch (err: any) {
      toast.error(err?.message || 'Could not start the import.')
    } finally {
      setBusy(false)
    }
  }

  const cancel = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/gmail/import', { method: 'DELETE' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || 'Could not cancel.')
      setJob(body.job)
    } catch (err: any) {
      toast.error(err?.message || 'Could not cancel.')
    } finally {
      setBusy(false)
    }
  }

  const total = job?.total_messages ?? 0
  const pct = job && job.status === 'importing' && total > 0 ? Math.min(100, Math.round((job.processed / total) * 100)) : null

  return (
    <div className="-mt-1 rounded-2xl border border-dash-border/80 bg-dash-surface px-5 py-4">
      {active(job) && job ? (
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="!text-dash-text text-[13px] font-semibold">
              {job.status === 'counting'
                ? `Finding your emails… ${fmt(total)} found so far`
                : `Importing: ${fmt(Math.min(job.processed, total))} of ${fmt(total)} emails processed`}
            </p>
            <button onClick={cancel} disabled={busy}
              className="!text-dash-textMuted text-[11.5px] font-semibold rounded-lg px-3 py-1.5 border border-dash-border hover:bg-dash-border/30 disabled:opacity-50">
              Cancel
            </button>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-dash-border/50 overflow-hidden" role="progressbar"
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct ?? undefined}>
            <div className={`h-full bg-dash-accent transition-all duration-500 motion-reduce:transition-none ${pct === null ? 'w-1/4 animate-pulse motion-reduce:animate-none' : ''}`}
              style={pct === null ? undefined : { width: `${pct}%` }} />
          </div>
          {job.status === 'importing' && (
            <p className="!text-dash-textMuted text-[11.5px] mt-2">
              {fmt(job.imported)} imported · {fmt(job.duplicates)} already in LeadsMind · {fmt(job.skipped)} skipped
              {job.errors ? ` · ${fmt(job.errors)} failed` : ''}
            </p>
          )}
          <p className="!text-dash-textMuted text-[11px] mt-1">This can take a while for large mailboxes. It keeps going if you leave this page.</p>
        </div>
      ) : open ? (
        <div>
          <p className="!text-dash-text text-[13px] font-semibold">Import existing conversations</p>
          <p className="!text-dash-textMuted text-[11.5px] mt-1 leading-snug max-w-lg">
            Brings past emails with your contacts into Conversations. People you have emailed from this Gmail become
            contacts if they aren&apos;t already. Newsletters, notifications, promotions and spam are left out.
            Large mailboxes can take a while, and the import keeps running in the background.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label htmlFor="gmail-import-range" className="sr-only">How far back</label>
            <select id="gmail-import-range" value={range} onChange={(e) => setRange(e.target.value)}
              className="rounded-lg border border-dash-border bg-white px-3 py-1.5 text-[12px] !text-dash-text">
              {RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <button onClick={start} disabled={busy}
              className="text-white text-[12px] font-semibold rounded-lg px-4 py-1.5 bg-dash-accent hover:brightness-110 disabled:opacity-50">
              {busy ? 'Starting…' : 'Start import'}
            </button>
            <button onClick={() => setOpen(false)} disabled={busy}
              className="!text-dash-textMuted text-[12px] font-semibold rounded-lg px-3 py-1.5 hover:bg-dash-border/30">
              Not now
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="!text-dash-textMuted text-[12px] leading-snug">
            {job?.status === 'completed'
              ? `Last import finished: ${fmt(job.imported)} imported, ${fmt(job.duplicates)} already in LeadsMind, ${fmt(job.skipped)} skipped${job.errors ? `, ${fmt(job.errors)} failed` : ''}.`
              : job?.status === 'failed'
                ? `Last import stopped: ${job.last_error || 'an error occurred'}.`
                : job?.status === 'cancelled'
                  ? `Last import was cancelled after ${fmt(job.processed)} emails.`
                  : 'New email syncs automatically. You can also bring in past conversations.'}
          </p>
          <button onClick={() => setOpen(true)}
            className="flex-shrink-0 !text-dash-text text-[12px] font-semibold rounded-lg px-3 py-1.5 border border-dash-border hover:bg-dash-border/30">
            {job ? 'Import again' : 'Import existing conversations'}
          </button>
        </div>
      )}
    </div>
  )
}
