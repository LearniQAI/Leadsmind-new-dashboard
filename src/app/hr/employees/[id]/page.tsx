'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Wrapper from '@/components/layouts/DefaultWrapper'
import { useDashboardContext } from '@/components/layouts/DashboardProvider'
import { AlertTriangle, ArrowLeft, Ban, Download, FileText, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  department: string
  status: 'active' | 'inactive' | 'terminated'
  schedule_id: string | null
}

interface Schedule {
  id: string
  name: string
  days_of_week: string[]
  start_time: string
  end_time: string
  standard_hours_per_day: number
  overtime_threshold_hours: number
}

interface Warning {
  id: string
  reason: string
  notes: string | null
  warning_date: string
}

interface Termination {
  id: string
  termination_date: string
  last_working_day: string | null
  reason: string
  rehire_eligible: boolean
  notes: string | null
}

interface EmployeeDocument {
  id: string
  label: string
  category: string | null
  file_name: string
  file_size: number | null
  mime_type: string | null
  created_at: string
}

export default function EmployeeDetailPage() {
  const params = useParams()
  const employeeId = params?.id as string
  const { workspace, role } = useDashboardContext() as any
  const workspaceId = workspace?.id
  const canManage = role === 'admin' || role === 'owner' || role === 'hr'

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [termination, setTermination] = useState<Termination | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingSchedule, setSavingSchedule] = useState(false)

  const [warningModalOpen, setWarningModalOpen] = useState(false)
  const [warningReason, setWarningReason] = useState('')
  const [warningNotes, setWarningNotes] = useState('')

  const [terminateModalOpen, setTerminateModalOpen] = useState(false)
  const [terminationReason, setTerminationReason] = useState('')
  const [lastWorkingDay, setLastWorkingDay] = useState('')
  const [rehireEligible, setRehireEligible] = useState(true)

  const [documents, setDocuments] = useState<EmployeeDocument[]>([])
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadLabel, setUploadLabel] = useState('')
  const [uploadCategory, setUploadCategory] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const fetchAll = async () => {
    if (!workspaceId || !employeeId) return
    setLoading(true)
    try {
      const [empRes, schedRes, warnRes, termRes, docRes] = await Promise.all([
        fetch(`/api/hr/employees?workspaceId=${workspaceId}`),
        fetch(`/api/hr/schedules?workspaceId=${workspaceId}`),
        fetch(`/api/hr/warnings?workspaceId=${workspaceId}&employeeId=${employeeId}`),
        fetch(`/api/hr/terminations?workspaceId=${workspaceId}&employeeId=${employeeId}`),
        fetch(`/api/hr/employees/${employeeId}/documents`),
      ])
      const empData = await empRes.json()
      const found = (empData.employees ?? []).find((e: Employee) => e.id === employeeId)
      setEmployee(found ?? null)

      const schedData = await schedRes.json()
      setSchedules(schedData.schedules ?? [])

      const warnData = await warnRes.json()
      setWarnings(warnData.warnings ?? [])

      const termData = await termRes.json()
      setTermination((termData.terminations ?? [])[0] ?? null)

      const docData = await docRes.json()
      setDocuments(docData.documents ?? [])
    } catch {
      toast.error('Failed to load employee')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, employeeId])

  const handleAssignSchedule = async (scheduleId: string) => {
    if (!employee) return
    setSavingSchedule(true)
    try {
      const res = await fetch(`/api/hr/employees?id=${employee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_id: scheduleId || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEmployee(data.employee)
      toast.success('Schedule updated')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update schedule')
    } finally {
      setSavingSchedule(false)
    }
  }

  const handleAddWarning = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee) return
    try {
      const res = await fetch('/api/hr/warnings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: employee.id, reason: warningReason, notes: warningNotes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Warning issued')
      setWarningModalOpen(false)
      setWarningReason('')
      setWarningNotes('')
      fetchAll()
    } catch (err: any) {
      toast.error(err.message || 'Failed to issue warning')
    }
  }

  const handleTerminate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee) return
    if (!confirm(`Terminate ${employee.first_name} ${employee.last_name}? This cannot be undone from this screen.`)) return
    try {
      const res = await fetch(`/api/hr/employees/${employee.id}/terminate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: terminationReason, lastWorkingDay: lastWorkingDay || undefined, rehireEligible }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Employee terminated')
      setTerminateModalOpen(false)
      setTerminationReason('')
      setLastWorkingDay('')
      fetchAll()
    } catch (err: any) {
      toast.error(err.message || 'Failed to terminate employee')
    }
  }

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee || !uploadFile) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('label', uploadLabel)
      if (uploadCategory) formData.append('category', uploadCategory)

      const res = await fetch(`/api/hr/employees/${employee.id}/documents`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Document uploaded')
      setUploadModalOpen(false)
      setUploadLabel('')
      setUploadCategory('')
      setUploadFile(null)
      fetchAll()
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteDocument = async (docId: string) => {
    if (!employee) return
    if (!confirm('Delete this document? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/hr/employees/${employee.id}/documents/${docId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Document deleted')
      fetchAll()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete document')
    }
  }

  const handleDownloadDocument = async (doc: EmployeeDocument) => {
    if (!employee) return
    try {
      const res = await fetch(`/api/hr/employees/${employee.id}/documents/${doc.id}/download`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to download document')
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.file_name
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      toast.error(err.message || 'Failed to download document')
    }
  }

  if (loading) {
    return (
      <Wrapper>
        <div className="min-h-screen bg-[#04091a] px-6 py-6 max-w-4xl mx-auto text-center text-[#4a5a82] animate-pulse">
          Loading employee...
        </div>
      </Wrapper>
    )
  }

  if (!employee) {
    return (
      <Wrapper>
        <div className="min-h-screen bg-[#04091a] px-6 py-6 max-w-4xl mx-auto text-center text-[#4a5a82]">
          Employee not found.
        </div>
      </Wrapper>
    )
  }

  return (
    <Wrapper>
      <div className="min-h-screen bg-[#04091a] px-6 py-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
          <Link href="/hr/employees" className="text-[#4a5a82] hover:text-[#eef2ff] text-[12px] font-semibold flex items-center gap-1">
            <ArrowLeft size={14} /> Employees
          </Link>
        </div>

        <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[15px] shrink-0">
              {employee.first_name[0]}{employee.last_name[0]}
            </div>
            <div>
              <h1 className="text-[18px] font-bold text-[#eef2ff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {employee.first_name} {employee.last_name}
              </h1>
              <p className="text-[11.5px] text-[#94a3c8] mt-0.5">{employee.role} — {employee.department}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {employee.status === 'terminated' ? (
              <span className="text-[#ef4444] text-[11px] font-bold uppercase tracking-wide bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-full">
                Terminated
              </span>
            ) : canManage ? (
              <button
                onClick={() => setTerminateModalOpen(true)}
                className="h-9 px-4 rounded-[8px] bg-red-500/10 border border-red-500/20 text-[#ef4444] hover:bg-red-500/20 text-[12px] font-bold flex items-center gap-1.5 transition-all"
              >
                <Ban size={14} /> Terminate Employee
              </button>
            ) : null}
          </div>
        </div>

        {/* Schedule assignment */}
        <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-5 space-y-3">
          <h2 className="text-[13.5px] font-bold text-[#eef2ff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Assigned Schedule
          </h2>
          {canManage ? (
            <select
              value={employee.schedule_id ?? ''}
              disabled={savingSchedule || employee.status === 'terminated'}
              onChange={(e) => handleAssignSchedule(e.target.value)}
              className="w-full h-10 rounded-lg bg-white/[0.03] border border-white/10 px-3 text-[12.5px] text-[#eef2ff] focus:outline-none focus:border-[#2563eb]"
            >
              <option value="">No schedule assigned</option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.start_time}–{s.end_time}, {s.standard_hours_per_day}h/day)
                </option>
              ))}
            </select>
          ) : (
            <p className="text-[12.5px] text-[#94a3c8]">
              {schedules.find((s) => s.id === employee.schedule_id)?.name ?? 'No schedule assigned'}
            </p>
          )}
          {schedules.length === 0 && (
            <p className="text-[11px] text-[#4a5a82]">
              No schedules exist yet. <Link href="/hr/schedules" className="text-[#2563eb] hover:underline">Create one</Link>.
            </p>
          )}
        </div>

        {/* Termination record, if any */}
        {termination && (
          <div className="bg-red-500/[0.04] border border-red-500/20 rounded-2xl p-5 space-y-2">
            <h2 className="text-[13.5px] font-bold text-[#ef4444] flex items-center gap-1.5">
              <Ban size={14} /> Termination Record
            </h2>
            <div className="text-[12px] text-[#94a3c8] space-y-1">
              <div><span className="text-[#4a5a82]">Date:</span> {termination.termination_date}</div>
              {termination.last_working_day && <div><span className="text-[#4a5a82]">Last working day:</span> {termination.last_working_day}</div>}
              <div><span className="text-[#4a5a82]">Reason:</span> {termination.reason}</div>
              <div><span className="text-[#4a5a82]">Rehire eligible:</span> {termination.rehire_eligible ? 'Yes' : 'No'}</div>
              {termination.notes && <div><span className="text-[#4a5a82]">Notes:</span> {termination.notes}</div>}
            </div>
          </div>
        )}

        {/* Warnings */}
        <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[13.5px] font-bold text-[#eef2ff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Warnings
            </h2>
            {canManage && employee.status !== 'terminated' && (
              <button
                onClick={() => setWarningModalOpen(true)}
                className="h-8 px-3 rounded-[8px] bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 text-[11.5px] font-bold flex items-center gap-1.5 transition-all"
              >
                <Plus size={13} /> Issue Warning
              </button>
            )}
          </div>

          {warnings.length === 0 ? (
            <p className="text-[12px] text-[#4a5a82]">No warnings on record.</p>
          ) : (
            <div className="space-y-2">
              {warnings.map((w) => (
                <div key={w.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11.5px] font-bold text-[#eef2ff] flex items-center gap-1.5">
                      <AlertTriangle size={12} className="text-amber-400" /> {w.reason}
                    </span>
                    <span className="text-[10.5px] text-[#4a5a82]">{w.warning_date}</span>
                  </div>
                  {w.notes && <p className="text-[11px] text-[#94a3c8] mt-1.5">{w.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Documents */}
        <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[13.5px] font-bold text-[#eef2ff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Documents
            </h2>
            {canManage && employee.status !== 'terminated' && (
              <button
                onClick={() => setUploadModalOpen(true)}
                className="h-8 px-3 rounded-[8px] bg-[#2563eb]/10 border border-[#2563eb]/20 text-[#2563eb] hover:bg-[#2563eb]/20 text-[11.5px] font-bold flex items-center gap-1.5 transition-all"
              >
                <Plus size={13} /> Upload Document
              </button>
            )}
          </div>

          {documents.length === 0 ? (
            <p className="text-[12px] text-[#4a5a82]">No documents on file.</p>
          ) : (
            <div className="space-y-2">
              {documents.map((d) => (
                <div key={d.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText size={14} className="text-[#4a5a82] shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[11.5px] font-bold text-[#eef2ff] truncate">
                        {d.label}{d.category ? ` · ${d.category}` : ''}
                      </div>
                      <div className="text-[10.5px] text-[#4a5a82] truncate">
                        {d.file_name}{d.file_size ? ` · ${(d.file_size / 1024).toFixed(0)} KB` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleDownloadDocument(d)}
                      className="w-7 h-7 rounded-lg bg-white/5 border border-white/5 text-[#94a3c8] hover:text-[#eef2ff] flex items-center justify-center transition-colors"
                      title="Download"
                    >
                      <Download size={12} />
                    </button>
                    {canManage && (
                      <button
                        onClick={() => handleDeleteDocument(d.id)}
                        className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 text-[#ef4444] hover:bg-red-500/20 flex items-center justify-center transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upload document modal */}
        {uploadModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-[#0b122b] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-5 border-b border-white/5">
                <h3 className="text-[15px] font-bold text-[#eef2ff]">Upload Document</h3>
                <button onClick={() => setUploadModalOpen(false)} className="text-[#4a5a82] hover:text-[#eef2ff]">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleUploadDocument} className="p-5 space-y-4">
                <div>
                  <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Label *</label>
                  <input
                    required
                    value={uploadLabel}
                    onChange={(e) => setUploadLabel(e.target.value)}
                    className="w-full h-10 rounded-lg bg-white/[0.03] border border-white/10 px-3 text-[12.5px] text-[#eef2ff] focus:outline-none focus:border-[#2563eb]"
                    placeholder="e.g. Signed Employment Contract"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Category</label>
                  <input
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full h-10 rounded-lg bg-white/[0.03] border border-white/10 px-3 text-[12.5px] text-[#eef2ff] focus:outline-none focus:border-[#2563eb]"
                    placeholder="e.g. Contract, ID, Certification (optional)"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">File * (PDF, PNG, JPEG — max 15MB)</label>
                  <input
                    required
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                    className="w-full text-[12px] text-[#94a3c8] file:mr-3 file:h-8 file:px-3 file:rounded-lg file:border-0 file:bg-[#2563eb] file:text-white file:text-[11.5px] file:font-bold"
                  />
                </div>
                <p className="text-[11px] text-[#4a5a82]">Stored encrypted at rest (AES-256-GCM).</p>
                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full h-10 rounded-lg bg-[#2563eb] hover:bg-[#2563eb]/90 disabled:opacity-50 text-white text-[12.5px] font-bold transition-all"
                >
                  {uploading ? 'Uploading…' : 'Upload'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Issue warning modal */}
        {warningModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-[#0b122b] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-5 border-b border-white/5">
                <h3 className="text-[15px] font-bold text-[#eef2ff]">Issue Warning</h3>
                <button onClick={() => setWarningModalOpen(false)} className="text-[#4a5a82] hover:text-[#eef2ff]">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleAddWarning} className="p-5 space-y-4">
                <div>
                  <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Reason *</label>
                  <input
                    required
                    value={warningReason}
                    onChange={(e) => setWarningReason(e.target.value)}
                    className="w-full h-10 rounded-lg bg-white/[0.03] border border-white/10 px-3 text-[12.5px] text-[#eef2ff] focus:outline-none focus:border-[#2563eb]"
                    placeholder="e.g. Repeated late arrival"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Notes</label>
                  <textarea
                    value={warningNotes}
                    onChange={(e) => setWarningNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg bg-white/[0.03] border border-white/10 px-3 py-2 text-[12.5px] text-[#eef2ff] focus:outline-none focus:border-[#2563eb]"
                  />
                </div>
                <p className="text-[11px] text-[#4a5a82]">The employee will be emailed a copy of this warning, if they have an email on file.</p>
                <button type="submit" className="w-full h-10 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[12.5px] font-bold transition-all">
                  Issue Warning
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Terminate modal */}
        {terminateModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-[#0b122b] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-5 border-b border-white/5">
                <h3 className="text-[15px] font-bold text-[#ef4444]">Terminate Employee</h3>
                <button onClick={() => setTerminateModalOpen(false)} className="text-[#4a5a82] hover:text-[#eef2ff]">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleTerminate} className="p-5 space-y-4">
                <div>
                  <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Reason *</label>
                  <input
                    required
                    value={terminationReason}
                    onChange={(e) => setTerminationReason(e.target.value)}
                    className="w-full h-10 rounded-lg bg-white/[0.03] border border-white/10 px-3 text-[12.5px] text-[#eef2ff] focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Last Working Day</label>
                  <input
                    type="date"
                    value={lastWorkingDay}
                    onChange={(e) => setLastWorkingDay(e.target.value)}
                    className="w-full h-10 rounded-lg bg-white/[0.03] border border-white/10 px-3 text-[12.5px] text-[#eef2ff] focus:outline-none focus:border-red-500"
                  />
                </div>
                <label className="flex items-center gap-2 text-[12px] text-[#94a3c8]">
                  <input type="checkbox" checked={rehireEligible} onChange={(e) => setRehireEligible(e.target.checked)} />
                  Eligible for rehire
                </label>
                <button type="submit" className="w-full h-10 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[12.5px] font-bold transition-all">
                  Confirm Termination
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </Wrapper>
  )
}
