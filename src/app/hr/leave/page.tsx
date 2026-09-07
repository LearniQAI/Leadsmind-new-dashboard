'use client'
import { useEffect, useState } from 'react'
import Wrapper from '@/components/layouts/DefaultWrapper'
import { useDashboardContext } from '@/components/layouts/DashboardProvider'
import { Plus, X, Check, Calendar, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  DashCard,
  DashButton,
  DashEmptyState,
  DashStatusPill,
  DashModal,
  DashModalContent,
  DashModalHeader,
  DashModalTitle,
  DashFormField,
  DashInput,
  DashTextarea,
  DashTabs,
  DashTabsList,
  DashTabsTrigger,
  DashTabsContent,
  DashTable,
  DashTableContainer,
  DashTableHead,
  DashTableHeadCell,
  DashTableBody,
  DashTableRow,
  DashTableCell,
} from '@/components/dashboard-ui'

interface LeaveRequest {
  id: string
  employee_id: string
  leave_type: 'annual' | 'sick' | 'maternity' | 'paternity' | 'family' | 'unpaid' | 'study'
  start_date: string
  end_date: string
  days_count: number
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  employees?: {
    first_name: string
    last_name: string
    avatar_url?: string
  }
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  annual_leave_balance?: number
  annual_leave_used?: number
  sick_leave_balance?: number
  sick_leave_used?: number
}

const LEAVE_TYPE_LABEL: Record<string, string> = {
  annual: 'Annual',
  sick: 'Sick',
  maternity: 'Maternity/Paternity',
  paternity: 'Maternity/Paternity',
  study: 'Study',
}

const STATUS_VARIANT: Record<string, 'success' | 'danger' | 'warning' | 'neutral'> = {
  approved: 'success',
  rejected: 'danger',
  pending: 'warning',
  cancelled: 'neutral',
}

const selectClass =
  'w-full h-11 rounded-xl border border-dash-border bg-white pl-3.5 pr-9 text-sm !text-dash-text appearance-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent'

function DashSelect({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={`${selectClass} ${className ?? ''}`} {...props} />
      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-dash-textMuted" />
    </div>
  )
}

export default function LeavePage() {
  const { workspace, role } = useDashboardContext() as any
  const workspaceId = workspace?.id
  const isLeaveApprover = role === 'admin' || role === 'owner' || role === 'hr'

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'balances'>('all')

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [employeeId, setEmployeeId] = useState('')
  const [leaveType, setLeaveType] = useState<LeaveRequest['leave_type']>('annual')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [daysCount, setDaysCount] = useState(0)
  const [reason, setReason] = useState('')

  // Rejection State
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    if (employees.length > 0 && !employeeId) {
      setEmployeeId(employees[0].id)
    }
  }, [employees, employeeId])

  const fetchLeaveData = async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      const leaveRes = await fetch(`/api/hr/leave?workspaceId=${workspaceId}`)
      const leaveData = await leaveRes.json()
      setLeaveRequests(leaveData.leaveRequests ?? [])

      const empRes = await fetch(`/api/hr/employees?workspaceId=${workspaceId}`)
      const empData = await empRes.json()
      setEmployees(empData.employees ?? [])
    } catch {
      toast.error('Failed to load leave records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaveData()
  }, [workspaceId])

  // Automatically calculate days count when dates change
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      setDaysCount(isNaN(diffDays) ? 0 : diffDays)
    } else {
      setDaysCount(0)
    }
  }, [startDate, endDate])

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!workspaceId || !employeeId) return

    const payload = {
      workspace_id: workspaceId,
      employee_id: employeeId,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      days_count: daysCount,
      reason,
      status: 'pending'
    }

    try {
      const res = await fetch('/api/hr/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success('Leave request submitted')
      setModalOpen(false)
      fetchLeaveData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit leave request')
    }
  }

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected', rejectedReason?: string) => {
    try {
      const body: any = { status }
      if (rejectedReason) body.rejected_reason = rejectedReason

      const res = await fetch(`/api/hr/leave?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success(`Leave request ${status}`)
      fetchLeaveData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this leave record?')) return
    try {
      const res = await fetch(`/api/hr/leave?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      toast.success('Record deleted')
      fetchLeaveData()
    } catch (err: any) {
      toast.error(err.message || 'Error deleting record')
    }
  }

  const filteredRequests = leaveRequests.filter(req => {
    if (activeTab === 'all') return true
    if (activeTab === 'balances') return false
    return req.status === activeTab
  })

  return (
    <Wrapper>
      <div className="min-h-screen bg-dash-bg px-6 py-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/hr" className="text-dash-textMuted hover:text-dash-text text-[13px] font-semibold">
              ← Overview
            </Link>
            <h1 className="font-display text-[22px] font-bold text-dash-text ml-1">Leave Management</h1>
          </div>
          <DashButton
            size="sm"
            onClick={() => {
              setEmployeeId(employees[0]?.id || '')
              setLeaveType('annual')
              setStartDate(new Date().toISOString().split('T')[0])
              setEndDate(new Date().toISOString().split('T')[0])
              setReason('')
              setModalOpen(true)
            }}
          >
            <Plus size={14} /> Request Leave
          </DashButton>
        </div>

        <DashTabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <DashTabsList>
            {(['all', 'pending', 'approved', 'rejected', 'balances'] as const).map(tab => (
              <DashTabsTrigger key={tab} value={tab} className="capitalize">
                {tab}
              </DashTabsTrigger>
            ))}
          </DashTabsList>

          <DashTabsContent value={activeTab}>
            {loading ? (
              <div className="text-center py-20 text-dash-textMuted animate-pulse">Loading leave records...</div>
            ) : activeTab === 'balances' ? (
              <DashTableContainer>
                <DashTable>
                  <DashTableHead>
                    <tr>
                      <DashTableHeadCell>Employee</DashTableHeadCell>
                      <DashTableHeadCell>Annual Leave (Used / Entitlement / Remaining)</DashTableHeadCell>
                      <DashTableHeadCell>Sick Leave (Used / Entitlement / Remaining)</DashTableHeadCell>
                    </tr>
                  </DashTableHead>
                  <DashTableBody>
                    {employees.map(emp => {
                      const annual_entitlement = emp.annual_leave_balance ?? 15
                      const annual_used = emp.annual_leave_used ?? 0
                      const annual_remaining = annual_entitlement - annual_used

                      const sick_entitlement = emp.sick_leave_balance ?? 30
                      const sick_used = emp.sick_leave_used ?? 0
                      const sick_remaining = sick_entitlement - sick_used

                      const annualVariant: 'success' | 'warning' | 'danger' =
                        annual_remaining >= 10 ? 'success' : annual_remaining >= 5 ? 'warning' : 'danger'

                      return (
                        <DashTableRow key={emp.id}>
                          <DashTableCell className="font-semibold whitespace-nowrap">
                            {emp.first_name} {emp.last_name}
                          </DashTableCell>
                          <DashTableCell>
                            <div className="flex flex-col gap-1.5">
                              <span className="text-dash-textMuted">Used: {annual_used} / Entitlement: {annual_entitlement} days</span>
                              <DashStatusPill variant={annualVariant} className="w-fit">Remaining: {annual_remaining} days</DashStatusPill>
                            </div>
                          </DashTableCell>
                          <DashTableCell>
                            <div className="flex flex-col gap-1.5">
                              <span className="text-dash-textMuted">Used: {sick_used} / Entitlement: {sick_entitlement} days</span>
                              <DashStatusPill variant="neutral" className="w-fit">Remaining: {sick_remaining} days</DashStatusPill>
                            </div>
                          </DashTableCell>
                        </DashTableRow>
                      )
                    })}
                  </DashTableBody>
                </DashTable>
              </DashTableContainer>
            ) : filteredRequests.length === 0 ? (
              <DashCard interactive={false}>
                <DashEmptyState icon={Calendar} title="No leave requests" description="No leave requests found matching this status." />
              </DashCard>
            ) : (
              <div className="space-y-3">
                {filteredRequests.map(req => (
                  <DashCard key={req.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-dash-accent/10 text-dash-accent flex items-center justify-center font-bold text-[12px] shrink-0">
                        {req.employees?.first_name[0]}{req.employees?.last_name[0]}
                      </div>
                      <div>
                        <h3 className="text-[13px] font-semibold text-dash-text block">
                          {req.employees?.first_name} {req.employees?.last_name}
                        </h3>
                        {req.reason && <p className="text-[12px] text-dash-textMuted mt-0.5 italic">"{req.reason}"</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-6 flex-wrap sm:flex-nowrap">
                      <div>
                        <span className="text-dash-textMuted text-[10px] block font-bold uppercase tracking-wide">Type</span>
                        <DashStatusPill variant="accent" className="mt-1">{LEAVE_TYPE_LABEL[req.leave_type] ?? 'Unpaid / Family'}</DashStatusPill>
                      </div>
                      <div>
                        <span className="text-dash-textMuted text-[10px] block font-bold uppercase tracking-wide">Dates</span>
                        <span className="text-dash-text text-[12px] block mt-1 font-medium">
                          {new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-dash-textMuted text-[10px] block font-bold uppercase tracking-wide">Duration</span>
                        <span className="text-dash-text text-[12px] block mt-1 font-bold">{req.days_count} days</span>
                      </div>
                      <div>
                        <span className="text-dash-textMuted text-[10px] block font-bold uppercase tracking-wide">Status</span>
                        <DashStatusPill variant={STATUS_VARIANT[req.status]} className="mt-1 capitalize">{req.status}</DashStatusPill>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:self-center self-end border-t sm:border-t-0 pt-2 sm:pt-0 border-dash-border w-full sm:w-auto justify-end">
                      {isLeaveApprover && req.status === 'pending' && (
                        <>
                          <DashButton size="sm" variant="secondary" onClick={() => handleUpdateStatus(req.id, 'approved')} className="!text-green">
                            <Check size={12} /> Approve
                          </DashButton>
                          {rejectingId === req.id ? (
                            <div className="flex items-center gap-2">
                              <DashInput
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                placeholder="Reason (optional)"
                                className="h-9 w-32 text-[12px]"
                              />
                              <DashButton
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  handleUpdateStatus(req.id, 'rejected', rejectReason)
                                  setRejectingId(null)
                                  setRejectReason('')
                                }}
                              >
                                Confirm
                              </DashButton>
                              <DashButton size="sm" variant="ghost" onClick={() => setRejectingId(null)}>
                                Cancel
                              </DashButton>
                            </div>
                          ) : (
                            <DashButton size="sm" variant="secondary" onClick={() => setRejectingId(req.id)} className="!text-red">
                              <X size={12} /> Reject
                            </DashButton>
                          )}
                        </>
                      )}
                      {isLeaveApprover && req.status !== 'pending' && (
                        <button
                          onClick={() => handleDelete(req.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-dash-surface text-dash-textMuted hover:text-red hover:bg-red/10 text-[11px] font-semibold transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </DashCard>
                ))}
              </div>
            )}
          </DashTabsContent>
        </DashTabs>

        {/* Modal */}
        <DashModal open={modalOpen} onOpenChange={setModalOpen}>
          <DashModalContent className="max-w-md">
            <DashModalHeader>
              <DashModalTitle>Request Leave</DashModalTitle>
            </DashModalHeader>

            <form onSubmit={handleCreateLeave} className="space-y-4">
              <DashFormField label={isLeaveApprover ? 'Select Employee' : 'Employee'}>
                {employees.length === 0 ? (
                  <div className="text-[12px] text-red mt-1">
                    {isLeaveApprover
                      ? 'Please register employees first in the Employee Directory.'
                      : 'Your account is not registered in the Employee Directory. Please ask an administrator to add you.'}
                  </div>
                ) : !isLeaveApprover ? (
                  <div className="w-full h-11 rounded-xl border border-dash-border bg-dash-surface px-3.5 flex items-center text-sm font-semibold text-dash-text">
                    {employees[0].first_name} {employees[0].last_name}
                  </div>
                ) : (
                  <DashSelect required value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
                    <option value="">-- Choose Employee --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                    ))}
                  </DashSelect>
                )}
              </DashFormField>

              <DashFormField label="Leave Type">
                <DashSelect value={leaveType} onChange={e => setLeaveType(e.target.value as any)}>
                  <option value="annual">Annual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="maternity">Maternity Leave</option>
                  <option value="paternity">Paternity Leave</option>
                  <option value="family">Family Responsibility Leave</option>
                  <option value="study">Study Leave</option>
                  <option value="unpaid">Unpaid Leave</option>
                </DashSelect>
              </DashFormField>

              <div className="grid grid-cols-2 gap-4">
                <DashFormField label="Start Date">
                  <DashInput type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} />
                </DashFormField>
                <DashFormField label="End Date">
                  <DashInput type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} />
                </DashFormField>
              </div>

              <div className="bg-dash-surface rounded-xl p-3 flex justify-between items-center text-[13px]">
                <span className="text-dash-textMuted flex items-center gap-1.5"><Calendar size={14} /> Total Duration:</span>
                <span className="text-dash-text font-bold">{daysCount} Days</span>
              </div>

              <DashFormField label="Reason / Notes (Optional)">
                <DashTextarea
                  rows={3}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Provide a reason for the leave request..."
                />
              </DashFormField>

              <div className="pt-2 flex justify-end gap-3 border-t border-dash-border">
                <DashButton type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </DashButton>
                <DashButton type="submit" disabled={!employeeId || daysCount <= 0}>
                  Submit Request
                </DashButton>
              </div>
            </form>
          </DashModalContent>
        </DashModal>
      </div>
    </Wrapper>
  )
}
