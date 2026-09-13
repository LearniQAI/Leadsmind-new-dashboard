'use client'
import React, { useEffect, useRef, useState } from 'react'
import Wrapper from '@/components/layouts/DefaultWrapper'
import { useDashboardContext } from '@/components/layouts/DashboardProvider'
import { Landmark, RefreshCw, X, Eye, EyeOff, Upload, CheckCircle, AlertCircle, Lock, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { DashButton } from '@/components/dashboard-ui/Button'

interface FinancialDocument {
  id: string
  file_name: string
  file_size: number
  mime_type: string
  document_kind: string
  status: 'uploaded' | 'processing' | 'processed' | 'password_protected' | 'failed'
  error_message: string | null
  created_at: string
}

const DOCUMENT_MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

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

  // Document upload (PDF/JPG/PNG/XLSX) — async pipeline
  const [documents, setDocuments] = useState<FinancialDocument[]>([])
  const [uploadingCount, setUploadingCount] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const [unlockTargetId, setUnlockTargetId] = useState<string | null>(null)
  const [unlockPassword, setUnlockPassword] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [notifyEmail, setNotifyEmail] = useState('')
  const [useCustomEmail, setUseCustomEmail] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchDocuments = async () => {
    if (!workspaceId) return
    try {
      const res = await fetch('/api/finance/documents')
      const data = await res.json()
      setDocuments(data.documents ?? [])
    } catch {
      // Silent — this is a background status refresh, not a user-initiated action.
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [workspaceId])

  // Poll while anything is still in flight, so uploaded/processing rows flip to their
  // terminal state (processed/failed/password_protected) without a manual refresh.
  useEffect(() => {
    const hasInFlight = documents.some(d => d.status === 'uploaded' || d.status === 'processing')
    if (hasInFlight && !pollRef.current) {
      pollRef.current = setInterval(fetchDocuments, 4000)
    } else if (!hasInFlight && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [documents])

  const uploadDocument = async (file: File, documentKind: string = 'other') => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('documentKind', documentKind)
    if (useCustomEmail && notifyEmail.trim()) formData.append('notifyEmail', notifyEmail.trim())
    const res = await fetch('/api/finance/documents', { method: 'POST', body: formData })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Upload failed')
    return data.document as FinancialDocument
  }

  const handleFilesSelected = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList)
    if (files.length === 0) return

    setUploadingCount(c => c + files.length)
    let uploaded = 0
    let rejected = 0

    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() || ''

      // CSV keeps using the existing, already-working immediate-import path unchanged —
      // this new pipeline is only for the document types that need async processing.
      if (ext === 'csv') {
        setCsvFile(file)
        setShowCSVModal(true)
        setUploadingCount(c => c - 1)
        continue
      }

      const mimeType = DOCUMENT_MIME_TYPES[ext]
      if (!mimeType) {
        toast.error(`${file.name}: unsupported file type. Use CSV, XLSX, PDF, JPG, or PNG.`)
        rejected++
        setUploadingCount(c => c - 1)
        continue
      }

      try {
        await uploadDocument(file, 'bank_statement')
        uploaded++
      } catch (err: any) {
        toast.error(`${file.name}: ${err.message || 'upload failed'}`)
        rejected++
      } finally {
        setUploadingCount(c => c - 1)
      }
    }

    if (uploaded > 0) toast.success(`Uploaded ${uploaded} document${uploaded === 1 ? '' : 's'} — processing in the background`)
    fetchDocuments()
  }

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!unlockTargetId || !unlockPassword) return
    setUnlocking(true)
    try {
      const res = await fetch(`/api/finance/documents/${unlockTargetId}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: unlockPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Document unlocked and processed')
      setUnlockTargetId(null)
      setUnlockPassword('')
      fetchDocuments()
    } catch (err: any) {
      toast.error(err.message || 'Incorrect password')
    } finally {
      setUnlocking(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (!bytes) return ''
    const kb = bytes / 1024
    return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`
  }

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

        </div>

        {/* Document Upload Section */}
        <p className="text-[11px] font-semibold mb-3 !text-dash-textMuted">
          Upload your documents
        </p>
        <div
          onDragOver={e => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={e => {
            e.preventDefault()
            setDragActive(false)
            if (e.dataTransfer.files?.length) handleFilesSelected(e.dataTransfer.files)
          }}
          className={`bg-dash-surface border border-dashed rounded-xl p-8 flex flex-col items-center text-center gap-3 transition-colors motion-reduce:transition-none ${dragActive ? 'border-dash-accent bg-dash-accent/5' : 'border-dash-border'}`}
        >
          <Upload size={28} className="!text-dash-textMuted opacity-60" />
          <p className="text-[13px] font-medium !text-dash-text">
            Upload your documents
          </p>
          <p className="text-[12px] max-w-sm !text-dash-textMuted">
            Bank statements, receipts, invoices, or prior financial records — LeadsMind's AI will organize and analyze them for you.
            Works with statements from any bank, any country. Accepts CSV, XLSX, PDF, JPG, and PNG.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv,.xlsx,.pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={e => { if (e.target.files?.length) handleFilesSelected(e.target.files); e.target.value = '' }}
          />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploadingCount > 0}
            className="bg-white border border-dash-border !text-dash-textMuted text-[12px] font-semibold rounded-lg px-4 py-2 hover:!text-dash-text hover:border-dash-text/20 transition-colors motion-reduce:transition-none disabled:opacity-50">
            {uploadingCount > 0 ? `Uploading ${uploadingCount}...` : 'Choose Files'}
          </button>
          <p className="text-[11px] !text-dash-textMuted italic">
            Your documents are processed privately inside your workspace and never shared.
          </p>
        </div>

        {/* Notification destination — per-upload override, not a permanent account setting */}
        <div className="mt-3 flex flex-col gap-2">
          <label className="flex items-center gap-2 text-[12px] !text-dash-textMuted cursor-pointer">
            <input type="checkbox" checked={useCustomEmail} onChange={e => setUseCustomEmail(e.target.checked)} className="accent-dash-accent" />
            Send the results summary to a different email for this upload
          </label>
          {useCustomEmail && (
            <input
              type="email"
              value={notifyEmail}
              onChange={e => setNotifyEmail(e.target.value)}
              placeholder="e.g. our.accountant@example.com"
              className="w-full max-w-xs bg-white border border-dash-border rounded-lg px-3 py-2 text-[12.5px] !text-dash-text outline-none focus:border-dash-accent transition-colors"
            />
          )}
        </div>

        {/* Per-file status list */}
        {documents.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            {documents.map(doc => (
              <div key={doc.id} className="bg-white border border-dash-border rounded-lg px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-dash-accent/10 text-dash-accent flex items-center justify-center flex-shrink-0">
                  <FileText size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold !text-dash-text truncate">{doc.file_name}</p>
                  <p className="text-[11px] !text-dash-textMuted">
                    {formatFileSize(doc.file_size)}
                    {doc.status === 'failed' && doc.error_message && ` — ${doc.error_message}`}
                    {doc.status === 'password_protected' && ' — password-protected'}
                  </p>
                </div>
                {(doc.status === 'uploaded' || doc.status === 'processing') && (
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-dash-accent flex-shrink-0">
                    <Loader2 size={13} className="animate-spin motion-reduce:animate-none" /> Processing
                  </span>
                )}
                {doc.status === 'processed' && (
                  <a
                    href={`/finance/documents/${doc.id}`}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-green flex-shrink-0 hover:underline"
                  >
                    <CheckCircle size={13} /> Received — View report
                  </a>
                )}
                {doc.status === 'failed' && (
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-red flex-shrink-0">
                    <AlertCircle size={13} /> Failed
                  </span>
                )}
                {doc.status === 'password_protected' && (
                  <button
                    onClick={() => { setUnlockTargetId(doc.id); setUnlockPassword('') }}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 flex-shrink-0 hover:bg-amber-100 transition-colors motion-reduce:transition-none"
                  >
                    <Lock size={12} /> Unlock
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Password unlock inline form */}
        {unlockTargetId && (
          <div className="fixed inset-0 bg-dash-text/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-dash-border rounded-2xl w-full max-w-sm p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[15px] font-semibold !text-dash-text flex items-center gap-2">
                  <Lock size={15} className="text-amber-600" /> Unlock document
                </h3>
                <button onClick={() => setUnlockTargetId(null)} className="!text-dash-textMuted hover:!text-dash-text">
                  <X size={16} />
                </button>
              </div>
              <p className="text-[12px] !text-dash-textMuted mb-4">
                This PDF is password-protected. Enter the password to continue — it's used only to unlock this file and is never stored.
              </p>
              <form onSubmit={handleUnlockSubmit} className="space-y-3">
                <input
                  type="password"
                  value={unlockPassword}
                  onChange={e => setUnlockPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-dash-surface border border-dash-border rounded-lg px-4 py-2.5 !text-dash-text text-[13px] outline-none focus:border-dash-accent transition-colors"
                  autoFocus
                  required
                />
                <div className="flex gap-3">
                  <DashButton type="button" variant="secondary" className="flex-1" onClick={() => setUnlockTargetId(null)}>
                    Cancel
                  </DashButton>
                  <DashButton type="submit" variant="primary" className="flex-1" disabled={unlocking}>
                    {unlocking ? 'Unlocking...' : 'Unlock'}
                  </DashButton>
                </div>
              </form>
            </div>
          </div>
        )}

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
