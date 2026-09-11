'use client'
import React, { useEffect, useState } from 'react'
import Wrapper from '@/components/layouts/DefaultWrapper'
import { AlertCircle, Download, FileWarning, TrendingUp, TrendingDown } from 'lucide-react'
import { toast } from 'sonner'

interface SummaryData {
  document: { file_name: string; document_kind: string; status: string; error_message: string | null; created_at: string }
  transactions: Array<{
    id: string; date: string; description: string; total_amount: number;
    is_duplicate_flag: boolean; is_anomaly_flag: boolean; anomaly_note: string | null;
    tax_deduction_candidate: boolean; account: { code: string; name: string } | null;
  }>
  receipts: Array<{ id: string; vendor: string | null; receipt_date: string | null; amount: number | null; matched_transaction_id: string | null }>
  summary: { totalIncome: number; totalExpenses: number; net: number; transactionCount: number; duplicateCount: number; anomalyCount: number; taxCandidateCount: number }
  disclaimer: string
}

export default function DocumentReportPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/finance/documents/${params.id}/summary`)
      .then(res => res.json())
      .then(json => {
        if (json.error) throw new Error(json.error)
        setData(json)
      })
      .catch(err => toast.error(err.message || 'Failed to load report'))
      .finally(() => setLoading(false))
  }, [params.id])

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(val)

  const handleExport = (format: 'pdf' | 'xlsx') => {
    window.open(`/api/finance/documents/${params.id}/export?format=${format}`, '_blank')
  }

  if (loading) {
    return <Wrapper><div className="min-h-screen bg-white px-6 py-6 max-w-4xl mx-auto"><div className="h-40 rounded-xl bg-dash-surface animate-pulse motion-reduce:animate-none" /></div></Wrapper>
  }

  if (!data) {
    return <Wrapper><div className="min-h-screen bg-white px-6 py-6 max-w-4xl mx-auto text-[13px] !text-dash-textMuted">Report not found.</div></Wrapper>
  }

  return (
    <Wrapper>
      <div className="min-h-screen bg-white px-6 py-6 max-w-4xl mx-auto">
        <div className="flex items-start justify-between mb-4 gap-4">
          <div>
            <h1 className="text-[20px] font-bold !text-dash-text">{data.document.file_name}</h1>
            <p className="text-[12px] !text-dash-textMuted mt-1">Processed {new Date(data.document.created_at).toLocaleDateString('en-ZA')}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => handleExport('pdf')} className="flex items-center gap-1.5 bg-white border border-dash-border !text-dash-textMuted hover:!text-dash-text text-[12px] font-semibold rounded-lg px-3 py-2">
              <Download size={13} /> PDF
            </button>
            <button onClick={() => handleExport('xlsx')} className="flex items-center gap-1.5 bg-white border border-dash-border !text-dash-textMuted hover:!text-dash-text text-[12px] font-semibold rounded-lg px-3 py-2">
              <Download size={13} /> Excel
            </button>
          </div>
        </div>

        {/* Disclaimer — always rendered, never conditional */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-2.5">
          <AlertCircle size={15} className="text-amber-700 flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-amber-800 leading-relaxed">{data.disclaimer}</p>
        </div>

        {data.document.status === 'failed' && (
          <div className="bg-red/10 border border-red/20 rounded-xl p-4 mb-6 flex items-start gap-2.5">
            <FileWarning size={15} className="text-red flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-red leading-relaxed">{data.document.error_message}</p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-dash-surface rounded-xl p-4">
            <p className="text-[11px] !text-dash-textMuted mb-1">Total Income</p>
            <p className="text-[16px] font-bold text-green flex items-center gap-1"><TrendingUp size={14} /> {formatCurrency(data.summary.totalIncome)}</p>
          </div>
          <div className="bg-dash-surface rounded-xl p-4">
            <p className="text-[11px] !text-dash-textMuted mb-1">Total Expenses</p>
            <p className="text-[16px] font-bold text-red flex items-center gap-1"><TrendingDown size={14} /> {formatCurrency(data.summary.totalExpenses)}</p>
          </div>
          <div className="bg-dash-surface rounded-xl p-4">
            <p className="text-[11px] !text-dash-textMuted mb-1">Net</p>
            <p className="text-[16px] font-bold !text-dash-text">{formatCurrency(data.summary.net)}</p>
          </div>
          <div className="bg-dash-surface rounded-xl p-4">
            <p className="text-[11px] !text-dash-textMuted mb-1">Flagged Items</p>
            <p className="text-[16px] font-bold !text-dash-text">{data.summary.duplicateCount + data.summary.anomalyCount}</p>
          </div>
        </div>

        {data.transactions.length > 0 && (
          <>
            <h2 className="text-[13px] font-semibold !text-dash-text mb-2">Transactions</h2>
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left !text-dash-textMuted border-b border-dash-border">
                    <th className="py-2 pr-3 font-semibold">Date</th>
                    <th className="py-2 pr-3 font-semibold">Description</th>
                    <th className="py-2 pr-3 font-semibold">Category</th>
                    <th className="py-2 pr-3 font-semibold text-right">Amount</th>
                    <th className="py-2 pr-3 font-semibold">Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map(t => (
                    <tr key={t.id} className="border-b border-dash-border/50">
                      <td className="py-2 pr-3 !text-dash-text whitespace-nowrap">{t.date}</td>
                      <td className="py-2 pr-3 !text-dash-text">{t.description}</td>
                      <td className="py-2 pr-3 !text-dash-textMuted">{t.account ? `${t.account.code} ${t.account.name}` : '—'}</td>
                      <td className={`py-2 pr-3 text-right font-semibold ${t.total_amount < 0 ? 'text-red' : 'text-green'}`}>{formatCurrency(t.total_amount)}</td>
                      <td className="py-2 pr-3">
                        <div className="flex gap-1 flex-wrap">
                          {t.is_duplicate_flag && <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">Possible duplicate</span>}
                          {t.is_anomaly_flag && <span className="text-[10px] font-semibold bg-red/10 text-red border border-red/20 rounded-full px-2 py-0.5" title={t.anomaly_note || ''}>Unusual</span>}
                          {t.tax_deduction_candidate && <span className="text-[10px] font-semibold bg-green/10 text-green border border-green/20 rounded-full px-2 py-0.5">Tax candidate</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {data.receipts.length > 0 && (
          <>
            <h2 className="text-[13px] font-semibold !text-dash-text mb-2">Receipts</h2>
            <div className="flex flex-col gap-2">
              {data.receipts.map(r => (
                <div key={r.id} className="bg-white border border-dash-border rounded-lg px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[12.5px] font-semibold !text-dash-text">{r.vendor || 'Unknown vendor'}</p>
                    <p className="text-[11px] !text-dash-textMuted">{r.receipt_date} — {r.amount != null ? formatCurrency(r.amount) : '—'}</p>
                  </div>
                  <span className={`text-[11px] font-semibold rounded-full px-3 py-1 ${r.matched_transaction_id ? 'bg-green/10 text-green' : 'bg-amber-50 text-amber-700'}`}>
                    {r.matched_transaction_id ? 'Matched' : 'Unmatched'}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Wrapper>
  )
}
