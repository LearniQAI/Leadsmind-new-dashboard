'use client'
import React, { useEffect, useState } from 'react'
import Wrapper from '@/components/layouts/DefaultWrapper'
import { useDashboardContext } from '@/components/layouts/DashboardProvider'
import { Landmark, RefreshCw, X, Eye, EyeOff, Upload, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { DashButton } from '@/components/dashboard-ui/Button'

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
      <div className="min-h-screen bg-white px-6 py-6 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[22px] font-bold !text-dash-text">
              Connected <span className="text-dash-accent">Accounts</span>
            </h1>
            <p className="text-[12px] font-medium mt-1 !text-dash-textMuted">
              Link your bank account to import transactions automatically
            </p>
          </div>
          {activeConnections.length > 0 && (
            <DashButton onClick={handleSync} disabled={syncing} variant="secondary" size="sm">
              <RefreshCw size={13} className={syncing ? 'animate-spin motion-reduce:animate-none' : ''} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </DashButton>
          )}
        </div>

        {/* Connected accounts list */}
        {loading ? (
          <div className="space-y-3 mb-6">
            {[1,2].map(i => (
              <div key={i} className="h-[88px] rounded-xl bg-dash-surface animate-pulse motion-reduce:animate-none" />
            ))}
          </div>
        ) : activeConnections.length > 0 ? (
          <div className="flex flex-col gap-3 mb-8">
            {activeConnections.map(conn => (
              <div key={conn.id}
                className="bg-white border border-dash-border rounded-xl p-5 flex items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: '#004f9f1F' }}>
                    <span className="text-[11px] font-bold" style={{ color: '#004f9f' }}>
                      INV
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold !text-dash-text">
                        {conn.bank_name}
                      </span>
                      <span className="bg-green/10 border border-green/20 text-green text-[10px] font-semibold rounded-full px-2 py-0.5">
                        ● Connected
                      </span>
                    </div>
                    <p className="text-[12px] mt-0.5 !text-dash-textMuted">
                      {conn.account_name} — {conn.account_type} •••• {conn.account_number_last4}
                    </p>
                    <p className="text-[13px] font-bold mt-1 text-green">
                      {formatCurrency(conn.balance)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {conn.last_synced_at && (
                    <span className="text-[10px] !text-dash-textMuted">
                      Synced {new Date(conn.last_synced_at).toLocaleDateString()}
                    </span>
                  )}
                  <button onClick={() => handleDisconnect(conn.bank_name)}
                    className="bg-red/10 border border-red/20 text-red text-[11px] font-semibold rounded-lg px-3 py-1.5 hover:bg-red/20 transition-colors motion-reduce:transition-none">
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Available banks to connect */}
        <p className="text-[11px] font-semibold mb-3 !text-dash-textMuted">
          Available bank connections
        </p>

        <div className="flex flex-col gap-3 mb-8">

          {/* Investec */}
          <div className="bg-white border border-dash-border rounded-xl p-5 flex items-center justify-between gap-4 hover:border-dash-text/15 transition-colors shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: '#004f9f1F' }}>
                <span className="text-[11px] font-bold" style={{ color: '#004f9f' }}>INV</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold !text-dash-text">
                    Investec
                  </span>
                  <span className="bg-green/10 border border-green/20 text-green text-[10px] font-semibold rounded-full px-2 py-0.5">
                    Available Now
                  </span>
                </div>
                <p className="text-[12px] mt-0.5 !text-dash-textMuted">
                  Private Banking and Business Banking — self-service API access
                </p>
              </div>
            </div>
            {activeConnections.some(c => c.bank_name === 'Investec') ? (
              <span className="text-[11px] text-green font-semibold">Connected</span>
            ) : (
              <button onClick={() => setShowInvestecModal(true)}
                className="text-white text-[11.5px] font-semibold rounded-lg px-4 py-2 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#004f9f' }}>
                Connect
              </button>
            )}
          </div>

          {/* Absa */}
          <div className="bg-white border border-dash-border rounded-xl p-5 flex items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: '#dc00001F' }}>
                <span className="text-[11px] font-bold" style={{ color: '#dc0000' }}>AB</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold !text-dash-text">
                    Absa
                  </span>
                  <span className="bg-amber-50 border border-amber-200 text-amber-600 text-[10px] font-semibold rounded-full px-2 py-0.5">
                    Registration Required
                  </span>
                </div>
                <p className="text-[12px] mt-0.5 !text-dash-textMuted">
                  Register at developer.absa.africa as an AISP — coming once approved
                </p>
              </div>
            </div>
            <button disabled
              className="!text-dash-textMuted text-[11.5px] font-semibold rounded-lg px-4 py-2 cursor-not-allowed opacity-50 border border-dash-border">
              Coming Soon
            </button>
          </div>

          {/* Capitec */}
          <div className="bg-white border border-dash-border rounded-xl p-5 flex items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: '#0033a01F' }}>
                <span className="text-[11px] font-bold" style={{ color: '#0033a0' }}>CAP</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold !text-dash-text">
                    Capitec Business
                  </span>
                  <span className="bg-amber-50 border border-amber-200 text-amber-600 text-[10px] font-semibold rounded-full px-2 py-0.5">
                    Pilot Programme
                  </span>
                </div>
                <p className="text-[12px] mt-0.5 !text-dash-textMuted">
                  Apply via openbanking@capitecbank.co.za — pilot access available
                </p>
              </div>
            </div>
            <button disabled
              className="!text-dash-textMuted text-[11.5px] font-semibold rounded-lg px-4 py-2 cursor-not-allowed opacity-50 border border-dash-border">
              Coming Soon
            </button>
          </div>
        </div>

        {/* CSV Upload Section */}
        <p className="text-[11px] font-semibold mb-3 !text-dash-textMuted">
          Upload a bank statement
        </p>
        <div className="bg-dash-surface border border-dashed border-dash-border rounded-xl p-8 flex flex-col items-center text-center gap-3">
          <Upload size={28} className="!text-dash-textMuted opacity-60" />
          <p className="text-[13px] font-medium !text-dash-text">
            Works with any SA bank
          </p>
          <p className="text-[12px] max-w-xs !text-dash-textMuted">
            Upload a CSV bank statement and LeadsMind will import your transactions automatically.
            Supports FNB, Standard Bank, Nedbank, Discovery, and any bank that exports CSV.
          </p>
          <button onClick={() => setShowCSVModal(true)}
            className="bg-white border border-dash-border !text-dash-textMuted text-[12px] font-semibold rounded-lg px-4 py-2 hover:!text-dash-text hover:border-dash-text/20 transition-colors motion-reduce:transition-none">
            Choose File
          </button>
          <p className="text-[11px] !text-dash-textMuted italic">
            Your statement is processed privately inside your workspace and never shared.
          </p>
        </div>

        {/* Investec Connect Modal */}
        {showInvestecModal && (
          <div className="fixed inset-0 bg-dash-text/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-dash-border rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-[17px] font-semibold !text-dash-text">
                    Connect Investec
                  </h3>
                  <p className="text-[12px] !text-dash-textMuted mt-1">
                    Enter your Investec API credentials
                  </p>
                </div>
                <button onClick={() => setShowInvestecModal(false)}
                  className="!text-dash-textMuted hover:!text-dash-text transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* How to get credentials */}
              <div className="bg-dash-accent/5 border border-dash-accent/20 rounded-xl p-4 mb-5">
                <p className="text-[12px] font-semibold !text-dash-text mb-1">
                  How to get your Investec API credentials
                </p>
                <ol className="text-[11.5px] !text-dash-textMuted space-y-1 list-decimal list-inside">
                  <li>Log in to Investec Online Banking at invest.investec.com</li>
                  <li>Go to Manage → Developer → Programmable Banking</li>
                  <li>Enable API access — generates your 3 credentials instantly</li>
                  <li>Copy Client ID, Client Secret, and API Key below</li>
                </ol>
              </div>

              <form onSubmit={handleInvestecConnect} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold !text-dash-textMuted mb-1.5">
                    Client ID
                  </label>
                  <input type="text" value={clientId} onChange={e => setClientId(e.target.value)}
                    placeholder="Your Investec Client ID"
                    className="w-full bg-dash-surface border border-dash-border rounded-lg px-4 py-2.5 !text-dash-text text-[13px] outline-none focus:border-dash-accent transition-colors"
                    required />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold !text-dash-textMuted mb-1.5">
                    Client Secret
                  </label>
                  <div className="relative">
                    <input type={showSecret ? 'text' : 'password'} value={clientSecret}
                      onChange={e => setClientSecret(e.target.value)}
                      placeholder="Your Investec Client Secret"
                      className="w-full bg-dash-surface border border-dash-border rounded-lg px-4 py-2.5 pr-10 !text-dash-text text-[13px] outline-none focus:border-dash-accent transition-colors"
                      required />
                    <button type="button" onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 !text-dash-textMuted hover:!text-dash-text">
                      {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold !text-dash-textMuted mb-1.5">
                    API Key
                  </label>
                  <input type="text" value={apiKey} onChange={e => setApiKey(e.target.value)}
                    placeholder="Your Investec API Key"
                    className="w-full bg-dash-surface border border-dash-border rounded-lg px-4 py-2.5 !text-dash-text text-[13px] outline-none focus:border-dash-accent transition-colors"
                    required />
                </div>
                <p className="text-[11px] !text-dash-textMuted italic">
                  Your credentials are encrypted and stored securely. LeadsMind only reads your transactions — it cannot move money.
                </p>
                <div className="flex gap-3 pt-2">
                  <DashButton type="button" variant="secondary" className="flex-1" onClick={() => setShowInvestecModal(false)}>
                    Cancel
                  </DashButton>
                  <DashButton type="submit" variant="primary" className="flex-1" disabled={connecting}>
                    {connecting ? 'Connecting...' : 'Connect Investec'}
                  </DashButton>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CSV Upload Modal */}
        {showCSVModal && (
          <div className="fixed inset-0 bg-dash-text/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-dash-border rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-[17px] font-semibold !text-dash-text">
                    Upload Bank Statement
                  </h3>
                  <p className="text-[12px] !text-dash-textMuted mt-1">
                    Works with any SA bank — FNB, Absa, Nedbank, Standard Bank, Discovery
                  </p>
                </div>
                <button onClick={() => setShowCSVModal(false)}
                  className="!text-dash-textMuted hover:!text-dash-text transition-colors">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCSVUpload} className="space-y-4">
                <div className="border-2 border-dashed border-dash-border rounded-xl p-6 text-center">
                  <Upload size={24} className="mx-auto mb-2 !text-dash-textMuted" />
                  <input type="file" accept=".csv,.ofx,.qif"
                    onChange={e => setCsvFile(e.target.files?.[0] || null)}
                    className="hidden" id="csv-file" />
                  <label htmlFor="csv-file"
                    className="cursor-pointer text-dash-accent text-[13px] font-semibold hover:text-dash-accent/80 transition-colors">
                    {csvFile ? csvFile.name : 'Choose CSV file'}
                  </label>
                  <p className="text-[11px] !text-dash-textMuted mt-1">
                    Supports CSV, OFX, and QIF formats
                  </p>
                </div>
                {csvFile && (
                  <div className="flex items-center gap-2 bg-green/10 border border-green/20 rounded-lg px-3 py-2">
                    <CheckCircle size={14} className="text-green" />
                    <span className="text-[12px] text-green">
                      {csvFile.name} selected
                    </span>
                  </div>
                )}
                <div className="flex gap-3">
                  <DashButton type="button" variant="secondary" className="flex-1" onClick={() => setShowCSVModal(false)}>
                    Cancel
                  </DashButton>
                  <DashButton type="submit" variant="primary" className="flex-1" disabled={!csvFile || csvParsing}>
                    {csvParsing ? 'Importing...' : 'Import Transactions'}
                  </DashButton>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </Wrapper>
  )
}
