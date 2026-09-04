'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getMessageDeliveryLog } from '@/app/admin/message-delivery/actions';
import type { DeliveryLogRow, DeliveryLogSummary } from '@/lib/messaging/deliveryLog';

const STATUS_STYLES: Record<string, string> = {
  queued: 'bg-gray-100 text-gray-700',
  sending: 'bg-blue-50 text-blue-700',
  sent: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  read: 'bg-green-100 text-green-800',
  retrying: 'bg-amber-100 text-amber-800',
  failed: 'bg-red-100 text-red-800',
};

const CHANNEL_LABEL: Record<string, string> = {
  facebook: 'Messenger',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
};

function toIsoStart(d: string) {
  return d ? `${d}T00:00:00.000Z` : undefined;
}
function toIsoEnd(d: string) {
  return d ? `${d}T23:59:59.999Z` : undefined;
}
function ymd(iso: string) {
  return iso ? iso.slice(0, 10) : '';
}

export default function MessageDeliveryPanel({
  initialRows,
  initialSummary,
  initialFrom,
  loadError,
}: {
  initialRows: DeliveryLogRow[];
  initialSummary: DeliveryLogSummary | null;
  initialFrom: string;
  loadError: string | null;
}) {
  const [rows, setRows] = useState<DeliveryLogRow[]>(initialRows);
  const [summary, setSummary] = useState<DeliveryLogSummary | null>(initialSummary);
  const [loading, setLoading] = useState(false);

  const [fromDate, setFromDate] = useState(ymd(initialFrom));
  const [toDate, setToDate] = useState('');
  const [platform, setPlatform] = useState('all');
  const [status, setStatus] = useState('all');

  const firstRender = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getMessageDeliveryLog({
      from: toIsoStart(fromDate),
      to: toIsoEnd(toDate),
      platform,
      status,
    });
    setLoading(false);
    if ('error' in res) {
      toast.error(res.error || 'Failed to load');
      return;
    }
    setRows(res.rows);
    setSummary(res.summary);
  }, [fromDate, toDate, platform, status]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      if (loadError) toast.error(loadError);
      return;
    }
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load, loadError]);

  const rate = summary ? Math.round(summary.failureRate * 1000) / 10 : 0;
  const rateHot = summary ? summary.failureRate > 0.1 && summary.total >= 5 : false;

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Stat label="Messages" value={summary?.total ?? 0} />
        <Stat label="Settled" value={summary?.settled ?? 0} tone="green" />
        <Stat label="In flight / retrying" value={summary?.inFlight ?? 0} tone="amber" />
        <Stat label="Failed" value={summary?.failed ?? 0} tone="red" />
        <Stat
          label="Failure rate"
          value={`${rate}%`}
          tone={rateHot ? 'red' : 'default'}
          hint={rateHot ? 'above 10% threshold' : undefined}
        />
      </div>
      {summary && summary.authErrors > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[13px] text-amber-800">
          {summary.authErrors} failure{summary.authErrors > 1 ? 's' : ''} in this window look like an expired/invalid
          token — the affected channel needs re-authorization.
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3 items-end bg-gray-50">
          <label className="text-xs text-gray-500 flex flex-col gap-1">
            From
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900" />
          </label>
          <label className="text-xs text-gray-500 flex flex-col gap-1">
            To
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900" />
          </label>
          <label className="text-xs text-gray-500 flex flex-col gap-1">
            Channel
            <select value={platform} onChange={(e) => setPlatform(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900">
              <option value="all">All channels</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Messenger</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </label>
          <label className="text-xs text-gray-500 flex flex-col gap-1">
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900">
              <option value="all">All statuses</option>
              <option value="sending">Sending</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
              <option value="read">Read</option>
              <option value="retrying">Retrying</option>
              <option value="failed">Failed</option>
            </select>
          </label>
          <button onClick={load} disabled={loading}
            className="ml-auto text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50">
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs border-b">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Attempts</th>
                <th className="px-4 py-3">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{new Date(r.sent_at).toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{CHANNEL_LABEL[r.platform] || r.platform}</td>
                  <td className="px-4 py-3 max-w-[180px] truncate" title={r.recipient}>{r.recipient}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[r.status] || 'bg-gray-100 text-gray-700'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.attempts ?? '—'}</td>
                  <td className="px-4 py-3 max-w-sm">
                    {r.error_message ? (
                      <span className="text-red-600">
                        {r.error_message}
                        {r.error_code != null && <span className="text-gray-400"> · code {r.error_code}</span>}
                        {r.failure_class && <span className="text-gray-400"> · {r.failure_class}</span>}
                      </span>
                    ) : (
                      <span className="text-gray-400 truncate block" title={r.content_preview}>{r.content_preview || '—'}</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {loading ? 'Loading…' : 'No outbound messages in this window.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'default',
  hint,
}: {
  label: string;
  value: string | number;
  tone?: 'default' | 'green' | 'amber' | 'red';
  hint?: string;
}) {
  const toneCls =
    tone === 'green' ? 'text-green-700' :
    tone === 'amber' ? 'text-amber-700' :
    tone === 'red' ? 'text-red-700' : 'text-gray-900';
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`text-xl font-semibold ${toneCls}`}>{value}</div>
      {hint && <div className="text-[10px] text-red-500 mt-0.5">{hint}</div>}
    </div>
  );
}
