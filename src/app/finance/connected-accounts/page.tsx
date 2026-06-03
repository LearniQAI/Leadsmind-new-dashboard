'use client'
import React, { useEffect, useState } from 'react'
import Wrapper from '@/components/layouts/DefaultWrapper'
import { useDashboardContext } from '@/components/layouts/DashboardProvider'
import { Landmark, RefreshCw, X, Eye, EyeOff, Upload, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface BankConnection {
  id: string
  bank_name: string
  account_name: string
  account_type: string
  account_number_last4: string
  balance: number
  status: string
  last_synced_at: string
}

export default function ConnectedAccountsPage() {
  const { workspace } = useDashboardContext() as any
  const workspaceId = workspace?.id || null

  const [connections, setConnections] = useState<BankConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [showInvestecModal, setShowInvestecModal] = useState(false)
  const [showCSVModal, setShowCSVModal] = useState(false)
  const [connecting, setConnecting] = useState(false)

  // Investec form
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [showSecret, setShowSecret] = useState(false)

  // CSV
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvParsing, setCsvParsing] = useState(false)

  const fetchConnections = async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/finance/banks/investec?workspaceId=${workspaceId}`)
      const data = await res.json()
      setConnections(data.connections ?? [])
    } catch {
      toast.error('Failed to load bank connections')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchConnections() }, [workspaceId])

  const handleInvestecConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId || !clientSecret || !apiKey) {
      toast.error('Please fill in all 3 fields')
      return
    }
    setConnecting(true)
    try {
      const res = await fetch('/api/finance/banks/investec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, clientId, clientSecret, apiKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Investec connected — ${data.accountName}`)
      setShowInvestecModal(false)
      setClientId('')
      setClientSecret('')
      setApiKey('')
      fetchConnections()
    } catch (err: any) {
      toast.error(err.message || 'Failed to connect Investec')
    } finally {
      setConnecting(false)
    }
  }

  const handleSync = async () => {
    if (!workspaceId) return
    setSyncing(true)
    try {
      const res = await fetch('/api/finance/banks/investec/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Synced ${data.imported} new transactions`)
      fetchConnections()
    } catch (err: any) {
      toast.error(err.message || 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const handleDisconnect = async (bankName: string) => {
    if (!confirm(`Disconnect ${bankName}?`)) return
    try {
      await fetch(`/api/finance/banks/investec?workspaceId=${workspaceId}`, { method: 'DELETE' })
      toast.success(`${bankName} disconnected`)
      fetchConnections()
    } catch {
      toast.error('Failed to disconnect')
    }
  }

  const handleCSVUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!csvFile || !workspaceId) return
    setCsvParsing(true)
    try {
      const text = await csvFile.text()
      const lines = text.split('\n').filter(l => l.trim())
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))
      
      let imported = 0
      const rows = lines.slice(1)

      for (const line of rows) {
        const cols = line.split(',').map(c => c.trim().replace(/"/g, ''))
        if (cols.length < 2) continue

        const dateIdx = headers.findIndex(h => h.includes('date'))
        const descIdx = headers.findIndex(h => h.includes('desc') || h.includes('narr') || h.includes('ref'))
        const amtIdx = headers.findIndex(h => h.includes('amount') || h.includes('debit') || h.includes('credit'))

        if (dateIdx === -1 || amtIdx === -1) continue

        const date = cols[dateIdx]
        const description = cols[descIdx] ?? 'Bank Statement Entry'
        const rawAmount = parseFloat(cols[amtIdx].replace(/[^0-9.-]/g, ''))

        if (isNaN(rawAmount) || !date) continue

        await fetch('/api/finance/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId,
            date,
            description,
            amount: Math.abs(rawAmount),
            type: rawAmount >= 0 ? 'income' : 'expense',
            reference: `csv-import-${Date.now()}-${imported}`,
          }),
        })
        imported++
      }

      toast.success(`Imported ${imported} transactions from statement`)
      setShowCSVModal(false)
      setCsvFile(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to parse CSV')
    } finally {
      setCsvParsing(false)
    }
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(val)

  const activeConnections = connections.filter(c => c.status === 'active')

  return (
    <Wrapper>
      <div className="min-h-screen bg-[#04091a] px-6 py-6 max-w-4xl mx-auto font-sans">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[22px] font-bold"
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#eef2ff' }}>
              Connected <span style={{ color: '#3b82f6' }}>Accounts</span>
            </h1>
            <p className="text-[11px] uppercase tracking-[0.8px] font-medium mt-1"
              style={{ color: '#4a5a82', fontFamily: "'DM Sans', sans-serif" }}>
              Link your bank account to import transactions automatically
            </p>
          </div>
          {activeConnections.length > 0 && (
            <button onClick={handleSync} disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[12px] font-semibold text-[#eef2ff] hover:bg-white/10 transition-all disabled:opacity-50"
              style={{ fontFamily: "'DM Sans', sans-serif" }}>
              <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
          )}
        </div>

        {/* Connected accounts list */}
        {loading ? (
          <div className="space-y-3 mb-6">
            {[1,2].map(i => (
              <div key={i} className="h-[88px] rounded-xl bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : activeConnections.length > 0 ? (
          <div className="flex flex-col gap-3 mb-8">
            {activeConnections.map(conn => (
              <div key={conn.id}
                className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: '#004f9f1F' }}>
                    <span className="text-[11px] font-bold" style={{ color: '#004f9f', fontFamily: "'Space Grotesk', sans-serif" }}>
                      INV
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold text-[#eef2ff]"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {conn.bank_name}
                      </span>
                      <span className="bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.2)] text-[#10b981] text-[10px] font-semibold rounded-full px-2 py-0.5"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        ● Connected
                      </span>
                    </div>
                    <p className="text-[12px] mt-0.5" style={{ color: '#94a3c8', fontFamily: "'DM Sans', sans-serif" }}>
                      {conn.account_name} — {conn.account_type} •••• {conn.account_number_last4}
                    </p>
                    <p className="text-[13px] font-bold mt-1"
                      style={{ color: '#10b981', fontFamily: "'Space Grotesk', sans-serif" }}>
                      {formatCurrency(conn.balance)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {conn.last_synced_at && (
                    <span className="text-[10px] text-[#4a5a82]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Synced {new Date(conn.last_synced_at).toLocaleDateString()}
                    </span>
                  )}
                  <button onClick={() => handleDisconnect(conn.bank_name)}
                    className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-[#ef4444] text-[11px] font-semibold rounded-lg px-3 py-1.5 hover:bg-[rgba(239,68,68,0.18)] transition-all"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Available banks to connect */}
        <p className="text-[10px] font-semibold uppercase tracking-[1.2px] mb-3"
          style={{ color: '#4a5a82', fontFamily: "'DM Sans', sans-serif" }}>
          Available Bank Connections
        </p>

        <div className="flex flex-col gap-3 mb-8">

          {/* Investec */}
          <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 flex items-center justify-between gap-4 hover:border-[rgba(255,255,255,0.13)] transition-all">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: '#004f9f1F' }}>
                <span className="text-[11px] font-bold" style={{ color: '#004f9f', fontFamily: "'Space Grotesk', sans-serif" }}>INV</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-[#eef2ff]"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Investec
                  </span>
                  <span className="bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] text-[#10b981] text-[10px] font-semibold rounded-full px-2 py-0.5">
                    Available Now
                  </span>
                </div>
                <p className="text-[12px] mt-0.5" style={{ color: '#94a3c8', fontFamily: "'DM Sans', sans-serif" }}>
                  Private Banking and Business Banking — self-service API access
                </p>
              </div>
            </div>
            {activeConnections.some(c => c.bank_name === 'Investec') ? (
              <span className="text-[11px] text-[#10b981] font-semibold">Connected</span>
            ) : (
              <button onClick={() => setShowInvestecModal(true)}
                className="text-white text-[11.5px] font-semibold rounded-lg px-4 py-2 hover:opacity-90 transition-all"
                style={{ backgroundColor: '#004f9f', fontFamily: "'DM Sans', sans-serif" }}>
                Connect
              </button>
            )}
          </div>

          {/* Absa */}
          <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: '#dc00001F' }}>
                <span className="text-[11px] font-bold" style={{ color: '#dc0000', fontFamily: "'Space Grotesk', sans-serif" }}>AB</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-[#eef2ff]"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Absa
                  </span>
                  <span className="bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] text-[#f59e0b] text-[10px] font-semibold rounded-full px-2 py-0.5">
                    Registration Required
                  </span>
                </div>
                <p className="text-[12px] mt-0.5" style={{ color: '#94a3c8', fontFamily: "'DM Sans', sans-serif" }}>
                  Register at developer.absa.africa as an AISP — coming once approved
                </p>
              </div>
            </div>
            <button disabled
              className="text-[#4a5a82] text-[11.5px] font-semibold rounded-lg px-4 py-2 cursor-not-allowed opacity-50 border border-white/10"
              style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Coming Soon
            </button>
          </div>

          {/* Capitec */}
          <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: '#0033a01F' }}>
                <span className="text-[11px] font-bold" style={{ color: '#0033a0', fontFamily: "'Space Grotesk', sans-serif" }}>CAP</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-[#eef2ff]"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Capitec Business
                  </span>
                  <span className="bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] text-[#f59e0b] text-[10px] font-semibold rounded-full px-2 py-0.5">
                    Pilot Programme
                  </span>
                </div>
                <p className="text-[12px] mt-0.5" style={{ color: '#94a3c8', fontFamily: "'DM Sans', sans-serif" }}>
                  Apply via openbanking@capitecbank.co.za — pilot access available
                </p>
              </div>
            </div>
            <button disabled
              className="text-[#4a5a82] text-[11.5px] font-semibold rounded-lg px-4 py-2 cursor-not-allowed opacity-50 border border-white/10"
              style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Coming Soon
            </button>
          </div>
        </div>

        {/* CSV Upload Section */}
        <p className="text-[10px] font-semibold uppercase tracking-[1.2px] mb-3"
          style={{ color: '#4a5a82', fontFamily: "'DM Sans', sans-serif" }}>
          Upload a Bank Statement
        </p>
        <div className="bg-[rgba(255,255,255,0.02)] border border-dashed border-[rgba(255,255,255,0.12)] rounded-xl p-8 flex flex-col items-center text-center gap-3">
          <Upload size={28} style={{ color: '#4a5a82', opacity: 0.5 }} />
          <p className="text-[13px] font-medium text-[#eef2ff]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Works with any SA bank
          </p>
          <p className="text-[12px] max-w-xs text-[#94a3c8]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Upload a CSV bank statement and LeadsMind will import your transactions automatically.
            Supports FNB, Standard Bank, Nedbank, Discovery, and any bank that exports CSV.
          </p>
          <button onClick={() => setShowCSVModal(true)}
            className="bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.07)] text-[#94a3c8] text-[12px] font-semibold rounded-lg px-4 py-2 hover:text-[#eef2ff] hover:border-[rgba(255,255,255,0.13)] transition-all"
            style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Choose File
          </button>
          <p className="text-[11px] text-[#4a5a82] italic"
            style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Your statement is processed privately inside your workspace and never shared.
          </p>
        </div>

        {/* Investec Connect Modal */}
        {showInvestecModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#080f28] border border-[rgba(255,255,255,0.13)] rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-[17px] font-semibold text-[#eef2ff]"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Connect Investec
                  </h3>
                  <p className="text-[12px] text-[#4a5a82] mt-1"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Enter your Investec API credentials
                  </p>
                </div>
                <button onClick={() => setShowInvestecModal(false)}
                  className="text-[#4a5a82] hover:text-[#eef2ff] transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* How to get credentials */}
              <div className="bg-[rgba(37,99,235,0.06)] border border-[rgba(37,99,235,0.12)] rounded-xl p-4 mb-5">
                <p className="text-[12px] font-semibold text-[#eef2ff] mb-1"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  How to get your Investec API credentials
                </p>
                <ol className="text-[11.5px] text-[#94a3c8] space-y-1 list-decimal list-inside"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  <li>Log in to Investec Online Banking at invest.investec.com</li>
                  <li>Go to Manage → Developer → Programmable Banking</li>
                  <li>Enable API access — generates your 3 credentials instantly</li>
                  <li>Copy Client ID, Client Secret, and API Key below</li>
                </ol>
              </div>

              <form onSubmit={handleInvestecConnect} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-[0.8px] text-[#4a5a82] mb-1.5"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Client ID
                  </label>
                  <input type="text" value={clientId} onChange={e => setClientId(e.target.value)}
                    placeholder="Your Investec Client ID"
                    className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-2.5 text-[#eef2ff] text-[13px] outline-none focus:border-[#2563eb] transition-all"
                    style={{ fontFamily: "'DM Sans', sans-serif" }} required />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-[0.8px] text-[#4a5a82] mb-1.5"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Client Secret
                  </label>
                  <div className="relative">
                    <input type={showSecret ? 'text' : 'password'} value={clientSecret}
                      onChange={e => setClientSecret(e.target.value)}
                      placeholder="Your Investec Client Secret"
                      className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-2.5 pr-10 text-[#eef2ff] text-[13px] outline-none focus:border-[#2563eb] transition-all"
                      style={{ fontFamily: "'DM Sans', sans-serif" }} required />
                    <button type="button" onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a5a82] hover:text-[#eef2ff]">
                      {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-[0.8px] text-[#4a5a82] mb-1.5"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    API Key
                  </label>
                  <input type="text" value={apiKey} onChange={e => setApiKey(e.target.value)}
                    placeholder="Your Investec API Key"
                    className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-lg px-4 py-2.5 text-[#eef2ff] text-[13px] outline-none focus:border-[#2563eb] transition-all"
                    style={{ fontFamily: "'DM Sans', sans-serif" }} required />
                </div>
                <p className="text-[11px] text-[#4a5a82] italic"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Your credentials are encrypted and stored securely. LeadsMind only reads your transactions — it cannot move money.
                </p>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowInvestecModal(false)}
                    className="flex-1 py-2.5 border border-[rgba(255,255,255,0.07)] rounded-lg text-[#4a5a82] text-[13px] font-semibold hover:text-[#eef2ff] transition-all"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={connecting}
                    className="flex-1 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] rounded-lg text-white text-[13px] font-semibold transition-all disabled:opacity-50"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {connecting ? 'Connecting...' : 'Connect Investec'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CSV Upload Modal */}
        {showCSVModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#080f28] border border-[rgba(255,255,255,0.13)] rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-[17px] font-semibold text-[#eef2ff]"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Upload Bank Statement
                  </h3>
                  <p className="text-[12px] text-[#4a5a82] mt-1"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Works with any SA bank — FNB, Absa, Nedbank, Standard Bank, Discovery
                  </p>
                </div>
                <button onClick={() => setShowCSVModal(false)}
                  className="text-[#4a5a82] hover:text-[#eef2ff] transition-colors">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCSVUpload} className="space-y-4">
                <div className="border-2 border-dashed border-[rgba(255,255,255,0.12)] rounded-xl p-6 text-center">
                  <Upload size={24} className="mx-auto mb-2 text-[#4a5a82]" />
                  <input type="file" accept=".csv,.ofx,.qif"
                    onChange={e => setCsvFile(e.target.files?.[0] || null)}
                    className="hidden" id="csv-file" />
                  <label htmlFor="csv-file"
                    className="cursor-pointer text-[#3b82f6] text-[13px] font-semibold hover:text-[#2563eb] transition-colors"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {csvFile ? csvFile.name : 'Choose CSV file'}
                  </label>
                  <p className="text-[11px] text-[#4a5a82] mt-1"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Supports CSV, OFX, and QIF formats
                  </p>
                </div>
                {csvFile && (
                  <div className="flex items-center gap-2 bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.15)] rounded-lg px-3 py-2">
                    <CheckCircle size={14} className="text-[#10b981]" />
                    <span className="text-[12px] text-[#10b981]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {csvFile.name} selected
                    </span>
                  </div>
                )}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowCSVModal(false)}
                    className="flex-1 py-2.5 border border-[rgba(255,255,255,0.07)] rounded-lg text-[#4a5a82] text-[13px] font-semibold hover:text-[#eef2ff] transition-all"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={!csvFile || csvParsing}
                    className="flex-1 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] rounded-lg text-white text-[13px] font-semibold transition-all disabled:opacity-50"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {csvParsing ? 'Importing...' : 'Import Transactions'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </Wrapper>
  )
}
