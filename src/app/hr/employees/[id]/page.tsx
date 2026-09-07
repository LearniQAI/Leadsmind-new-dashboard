'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Wrapper from '@/components/layouts/DefaultWrapper'
import { useDashboardContext } from '@/components/layouts/DashboardProvider'
import { AlertTriangle, ArrowLeft, Ban, Download, FileText, Plus, Trash2, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  DashCard,
  DashButton,
  DashStatusPill,
  DashModal,
  DashModalContent,
  DashModalHeader,
  DashModalTitle,
  DashFormField,
  DashInput,
  DashTextarea,
} from '@/components/dashboard-ui'

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

const selectClass =
  'w-full h-11 rounded-xl border border-dash-border bg-white pl-3.5 pr-9 text-sm !text-dash-text appearance-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent disabled:cursor-not-allowed disabled:opacity-50'

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
        <div className="min-h-screen bg-dash-bg px-6 py-6 max-w-4xl mx-auto text-center text-dash-textMuted animate-pulse">
          Loading employee...
        </div>
      </Wrapper>
    )
  }

  if (!employee) {
    return (
      <Wrapper>
        <div className="min-h-screen bg-dash-bg px-6 py-6 max-w-4xl mx-auto text-center text-dash-textMuted">
          Employee not found.
        </div>
      </Wrapper>
    )
  }

  return (
    <Wrapper>
      <div className="min-h-screen bg-dash-bg px-6 py-6 max-w-4xl mx-auto space-y-6">
        <Link href="/hr/employees" className="text-dash-textMuted hover:text-dash-text text-[13px] font-semibold flex items-center gap-1 w-fit">
          <ArrowLeft size={14} /> Employees
        </Link>

        <DashCard className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-dash-accent/10 text-dash-accent flex items-center justify-center font-bold text-[16px] shrink-0">
              {employee.first_name[0]}{employee.last_name[0]}
            </div>
            <div>
              <h1 className="font-display text-[19px] font-bold text-dash-text">
                {employee.first_name} {employee.last_name}
              </h1>
              <p className="text-[12px] text-dash-textMuted mt-0.5">{employee.role} — {employee.department}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {employee.status === 'terminated' ? (
              <DashStatusPill variant="danger" className="uppercase tracking-wide">Terminated</DashStatusPill>
            ) : canManage ? (
              <DashButton variant="destructive" size="sm" onClick={() => setTerminateModalOpen(true)}>
                <Ban size={14} /> Terminate Employee
              </DashButton>
            ) : null}
          </div>
        </DashCard>

        {/* Schedule assignment */}
        <DashCard interactive={false}>
          <div className="p-5 space-y-3">
            <h2 className="font-display text-[14.5px] font-bold text-dash-text">Assigned Schedule</h2>
            {canManage ? (
              <div className="relative">
                <select
                  value={employee.schedule_id ?? ''}
                  disabled={savingSchedule || employee.status === 'terminated'}
                  onChange={(e) => handleAssignSchedule(e.target.value)}
                  className={selectClass}
                >
                  <option value="">No schedule assigned</option>
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.start_time}–{s.end_time}, {s.standard_hours_per_day}h/day)
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-dash-textMuted" />
              </div>
            ) : (
              <p className="text-[13px] text-dash-textMuted">
                {schedules.find((s) => s.id === employee.schedule_id)?.name ?? 'No schedule assigned'}
              </p>
            )}
            {schedules.length === 0 && (
              <p className="text-[12px] text-dash-textMuted">
                No schedules exist yet. <Link href="/hr/schedules" className="text-dash-accent hover:underline">Create one</Link>.
              </p>
            )}
          </div>
        </DashCard>

        {/* Termination record, if any */}
        {termination && (
          <DashCard interactive={false} className="border-red/20 bg-red/[0.03]">
            <div className="p-5 space-y-2">
              <h2 className="font-display text-[14.5px] font-bold text-red flex items-center gap-1.5">
                <Ban size={14} /> Termination Record
              </h2>
              <div className="text-[13px] text-dash-textMuted space-y-1">
                <div><span className="text-dash-text/70 font-medium">Date:</span> {termination.termination_date}</div>
                {termination.last_working_day && <div><span className="text-dash-text/70 font-medium">Last working day:</span> {termination.last_working_day}</div>}
                <div><span className="text-dash-text/70 font-medium">Reason:</span> {termination.reason}</div>
                <div><span className="text-dash-text/70 font-medium">Rehire eligible:</span> {termination.rehire_eligible ? 'Yes' : 'No'}</div>
                {termination.notes && <div><span className="text-dash-text/70 font-medium">Notes:</span> {termination.notes}</div>}
              </div>
            </div>
          </DashCard>
        )}

        {/* Warnings */}
        <DashCard interactive={false}>
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[14.5px] font-bold text-dash-text">Warnings</h2>
              {canManage && employee.status !== 'terminated' && (
                <DashButton size="sm" variant="secondary" onClick={() => setWarningModalOpen(true)}>
                  <Plus size={13} /> Issue Warning
                </DashButton>
              )}
            </div>

            {warnings.length === 0 ? (
              <p className="text-[13px] text-dash-textMuted">No warnings on record.</p>
            ) : (
              <div className="space-y-2">
                {warnings.map((w) => (
                  <div key={w.id} className="bg-dash-surface rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[12.5px] font-bold text-dash-text flex items-center gap-1.5">
                        <AlertTriangle size={12} className="text-amber" /> {w.reason}
                      </span>
                      <span className="text-[11px] text-dash-textMuted">{w.warning_date}</span>
                    </div>
                    {w.notes && <p className="text-[12px] text-dash-textMuted mt-1.5">{w.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DashCard>

        {/* Documents */}
        <DashCard interactive={false}>
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[14.5px] font-bold text-dash-text">Documents</h2>
              {canManage && employee.status !== 'terminated' && (
                <DashButton size="sm" variant="secondary" onClick={() => setUploadModalOpen(true)}>
                  <Plus size={13} /> Upload Document
                </DashButton>
              )}
            </div>

            {documents.length === 0 ? (
              <p className="text-[13px] text-dash-textMuted">No documents on file.</p>
            ) : (
              <div className="space-y-2">
                {documents.map((d) => (
                  <div key={d.id} className="bg-dash-surface rounded-xl p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText size={14} className="text-dash-textMuted shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-bold text-dash-text truncate">
                          {d.label}{d.category ? ` · ${d.category}` : ''}
                        </div>
                        <div className="text-[11px] text-dash-textMuted truncate">
                          {d.file_name}{d.file_size ? ` · ${(d.file_size / 1024).toFixed(0)} KB` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleDownloadDocument(d)}
                        className="w-7 h-7 rounded-lg bg-white border border-dash-border text-dash-textMuted hover:text-dash-text flex items-center justify-center transition-colors"
                        title="Download"
                      >
                        <Download size={12} />
                      </button>
                      {canManage && (
                        <button
                          onClick={() => handleDeleteDocument(d.id)}
                          className="w-7 h-7 rounded-lg bg-red/10 text-red hover:bg-red/20 flex items-center justify-center transition-colors"
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
        </DashCard>

        {/* Upload document modal */}
        <DashModal open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
          <DashModalContent className="max-w-md">
            <DashModalHeader>
              <DashModalTitle>Upload Document</DashModalTitle>
            </DashModalHeader>
            <form onSubmit={handleUploadDocument} className="space-y-4">
              <DashFormField label="Label" required>
                <DashInput
                  required
                  value={uploadLabel}
                  onChange={(e) => setUploadLabel(e.target.value)}
                  placeholder="e.g. Signed Employment Contract"
                />
              </DashFormField>
              <DashFormField label="Category">
                <DashInput
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  placeholder="e.g. Contract, ID, Certification (optional)"
                />
              </DashFormField>
              <DashFormField label="File (PDF, PNG, JPEG — max 15MB)" required>
                <input
                  required
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  className="w-full text-[12px] text-dash-textMuted file:mr-3 file:h-9 file:px-3.5 file:rounded-lg file:border-0 file:bg-dash-accent file:text-white file:text-[12px] file:font-bold"
                />
              </DashFormField>
              <p className="text-[11.5px] text-dash-textMuted">Stored encrypted at rest (AES-256-GCM).</p>
              <DashButton type="submit" disabled={uploading} className="w-full">
                {uploading ? 'Uploading…' : 'Upload'}
              </DashButton>
            </form>
          </DashModalContent>
        </DashModal>

        {/* Issue warning modal */}
        <DashModal open={warningModalOpen} onOpenChange={setWarningModalOpen}>
          <DashModalContent className="max-w-md">
            <DashModalHeader>
              <DashModalTitle>Issue Warning</DashModalTitle>
            </DashModalHeader>
            <form onSubmit={handleAddWarning} className="space-y-4">
              <DashFormField label="Reason" required>
                <DashInput
                  required
                  value={warningReason}
                  onChange={(e) => setWarningReason(e.target.value)}
                  placeholder="e.g. Repeated late arrival"
                />
              </DashFormField>
              <DashFormField label="Notes">
                <DashTextarea value={warningNotes} onChange={(e) => setWarningNotes(e.target.value)} rows={3} />
              </DashFormField>
              <p className="text-[11.5px] text-dash-textMuted">The employee will be emailed a copy of this warning, if they have an email on file.</p>
              <DashButton type="submit" className="w-full">
                Issue Warning
              </DashButton>
            </form>
          </DashModalContent>
        </DashModal>

        {/* Terminate modal */}
        <DashModal open={terminateModalOpen} onOpenChange={setTerminateModalOpen}>
          <DashModalContent className="max-w-md">
            <DashModalHeader>
              <DashModalTitle className="!text-red">Terminate Employee</DashModalTitle>
            </DashModalHeader>
            <form onSubmit={handleTerminate} className="space-y-4">
              <DashFormField label="Reason" required>
                <DashInput required value={terminationReason} onChange={(e) => setTerminationReason(e.target.value)} />
              </DashFormField>
              <DashFormField label="Last Working Day">
                <DashInput type="date" value={lastWorkingDay} onChange={(e) => setLastWorkingDay(e.target.value)} />
              </DashFormField>
              <label className="flex items-center gap-2 text-[13px] text-dash-textMuted">
                <input type="checkbox" checked={rehireEligible} onChange={(e) => setRehireEligible(e.target.checked)} />
                Eligible for rehire
              </label>
              <DashButton type="submit" variant="destructive" className="w-full">
                Confirm Termination
              </DashButton>
            </form>
          </DashModalContent>
        </DashModal>
      </div>
    </Wrapper>
  )
}
