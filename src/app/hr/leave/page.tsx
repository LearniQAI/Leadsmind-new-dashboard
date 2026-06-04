'use client'
import { useEffect, useState } from 'react'
import Wrapper from '@/components/layouts/DefaultWrapper'
import { useDashboardContext } from '@/components/layouts/DashboardProvider'
import { Plus, X, Check, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

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

  const getLeaveBadge = (type: string) => {
    switch (type) {
      case 'annual':
        return <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10.5px] font-bold px-2 py-0.5 rounded-full uppercase">Annual</span>
      case 'sick':
        return <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10.5px] font-bold px-2 py-0.5 rounded-full uppercase">Sick</span>
      case 'maternity':
      case 'paternity':
        return <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10.5px] font-bold px-2 py-0.5 rounded-full uppercase">Maternity/Paternity</span>
      case 'study':
        return <span className="bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[10.5px] font-bold px-2 py-0.5 rounded-full uppercase">Study</span>
      default:
        return <span className="bg-white/5 border border-white/10 text-t3 text-[10.5px] font-bold px-2 py-0.5 rounded-full uppercase">Unpaid / Family</span>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.2)] text-[#10b981] text-[10px] font-semibold rounded-full px-2.5 py-0.5">Approved</span>
      case 'rejected':
        return <span className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-[#ef4444] text-[10px] font-semibold rounded-full px-2.5 py-0.5">Rejected</span>
      case 'pending':
        return <span className="bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] text-[#f59e0b] text-[10px] font-semibold rounded-full px-2.5 py-0.5 animate-pulse">Pending</span>
      default:
        return <span className="bg-white/5 border border-white/10 text-[#94a3c8] text-[10px] font-semibold rounded-full px-2.5 py-0.5">Cancelled</span>
    }
  }

  const filteredRequests = leaveRequests.filter(req => {
    if (activeTab === 'all') return true
    if (activeTab === 'balances') return false
    return req.status === activeTab
  })

  return (
    <Wrapper>
      <div className="min-h-screen bg-[#04091a] px-6 py-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <Link href="/hr" className="text-[#4a5a82] hover:text-[#eef2ff] text-[12px] font-semibold">
              ← Overview
            </Link>
            <h1 className="text-[20px] font-bold text-[#eef2ff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Leave Management
            </h1>
          </div>
          <button
            onClick={() => {
              setEmployeeId(employees[0]?.id || '')
              setLeaveType('annual')
              setStartDate(new Date().toISOString().split('T')[0])
              setEndDate(new Date().toISOString().split('T')[0])
              setReason('')
              setModalOpen(true)
            }}
            className="h-9 px-4 rounded-[8px] bg-[#2563eb] text-white hover:bg-[#2563eb]/95 text-[12px] font-bold font-dm-sans flex items-center gap-1.5 transition-all shadow-lg shadow-[#2563eb]/10"
          >
            <Plus size={14} /> Request Leave
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-white/5">
          {(['all', 'pending', 'approved', 'rejected', 'balances'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-all relative ${
                activeTab === tab ? 'text-[#3b82f6]' : 'text-[#4a5a82] hover:text-[#eef2ff]'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-4 right-4 h-[2px] bg-[#2563eb] rounded-t-full shadow-[0_-4px_10px_rgba(37,99,235,0.5)]" />
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-[#4a5a82] animate-pulse">Loading leave records...</div>
        ) : activeTab === 'balances' ? (
          <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[12px] font-dm-sans">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.01] text-[#4a5a82] font-semibold">
                    <th className="p-4">Employee</th>
                    <th className="p-4">Annual Leave (Used/Entitlement/Remaining)</th>
                    <th className="p-4">Sick Leave (Used/Entitlement/Remaining)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {employees.map(emp => {
                    const annual_entitlement = emp.annual_leave_balance ?? 15
                    const annual_used = emp.annual_leave_used ?? 0
                    const annual_remaining = annual_entitlement - annual_used

                    const sick_entitlement = emp.sick_leave_balance ?? 30
                    const sick_used = emp.sick_leave_used ?? 0
                    const sick_remaining = sick_entitlement - sick_used

                    let annualBadgeColor = 'bg-red-500/10 border-red-500/20 text-[#ef4444]'
                    if (annual_remaining >= 10) {
                      annualBadgeColor = 'bg-green-500/10 border-green-500/20 text-[#10b981]'
                    } else if (annual_remaining >= 5) {
                      annualBadgeColor = 'bg-amber-500/10 border-amber-500/20 text-[#f59e0b]'
                    }

                    return (
                      <tr key={emp.id} className="hover:bg-white/[0.01] transition-colors text-[#94a3c8]">
                        <td className="p-4 text-[#eef2ff] font-semibold whitespace-nowrap">
                          {emp.first_name} {emp.last_name}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            <span>Used: {annual_used} / Entitlement: {annual_entitlement} days</span>
                            <div className="flex">
                              <span className={`border text-[10px] font-bold px-2.5 py-0.5 rounded-full ${annualBadgeColor}`}>
                                Remaining: {annual_remaining} days
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            <span>Used: {sick_used} / Entitlement: {sick_entitlement} days</span>
                            <div className="flex">
                              <span className="bg-white/5 border border-white/10 text-[#94a3c8] text-[10px] font-semibold rounded-full px-2.5 py-0.5">
                                Remaining: {sick_remaining} days
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-20 bg-[rgba(12,21,53,0.3)] border border-white/5 rounded-2xl p-8">
            <p className="text-[13px] text-[#4a5a82]">No leave requests found matching this status.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map(req => (
              <div
                key={req.id}
                className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:border-[rgba(255,255,255,0.13)] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[12px]">
                    {req.employees?.first_name[0]}{req.employees?.last_name[0]}
                  </div>
                  <div>
                    <h3 className="text-[12.5px] font-semibold text-[#eef2ff] block">
                      {req.employees?.first_name} {req.employees?.last_name}
                    </h3>
                    {req.reason && <p className="text-[11.5px] text-[#94a3c8] mt-0.5 italic">"{req.reason}"</p>}
                  </div>
                </div>

                <div className="flex items-center gap-6 flex-wrap sm:flex-nowrap">
                  <div>
                    <span className="text-[#4a5a82] text-[9.5px] block font-bold uppercase tracking-[0.5px]">Type</span>
                    <span className="block mt-0.5">{getLeaveBadge(req.leave_type)}</span>
                  </div>
                  <div>
                    <span className="text-[#4a5a82] text-[9.5px] block font-bold uppercase tracking-[0.5px]">Dates</span>
                    <span className="text-[#eef2ff] text-[11.5px] block mt-0.5 font-medium">
                      {new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#4a5a82] text-[9.5px] block font-bold uppercase tracking-[0.5px]">Duration</span>
                    <span className="text-[#eef2ff] text-[11.5px] block mt-0.5 font-bold">
                      {req.days_count} days
                    </span>
                  </div>
                  <div>
                    <span className="text-[#4a5a82] text-[9.5px] block font-bold uppercase tracking-[0.5px]">Status</span>
                    <span className="block mt-0.5">{getStatusBadge(req.status)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:self-center self-end border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5 w-full sm:w-auto justify-end">
                  {isLeaveApprover && req.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(req.id, 'approved')}
                        className="h-8 px-3 rounded-lg bg-green-500/10 border border-green-500/20 text-[#10b981] hover:bg-green-500/20 text-[11px] font-bold transition-all flex items-center gap-1"
                      >
                        <Check size={12} /> Approve
                      </button>
                      {rejectingId === req.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            placeholder="Reason (optional)"
                            className="bg-[#070d24] border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white w-32"
                          />
                          <button
                            onClick={() => {
                              handleUpdateStatus(req.id, 'rejected', rejectReason)
                              setRejectingId(null)
                              setRejectReason('')
                            }}
                            className="h-7 px-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[#ef4444] text-[10px] font-bold"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setRejectingId(null)}
                            className="h-7 px-2 rounded-lg bg-white/5 text-[#4a5a82] text-[10px]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setRejectingId(req.id)}
                          className="h-8 px-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[#ef4444] hover:bg-red-500/20 text-[11px] font-bold transition-all flex items-center gap-1"
                        >
                          <X size={12} /> Reject
                        </button>
                      )}
                    </>
                  )}
                  {isLeaveApprover && req.status !== 'pending' && (
                    <button
                      onClick={() => handleDelete(req.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[#4a5a82] hover:text-[#ef4444] hover:bg-red-500/10 hover:border-red-500/20 text-[10.5px] font-semibold transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-[#0b122b] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/[0.01]">
                <h3 className="text-[15px] font-bold text-[#eef2ff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Request Leave
                </h3>
                <button onClick={() => setModalOpen(false)} className="text-[#4a5a82] hover:text-[#eef2ff] transition-colors">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateLeave} className="p-5 space-y-4">
                <div>
                  <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">
                    {isLeaveApprover ? 'Select Employee' : 'Employee'}
                  </label>
                  {employees.length === 0 ? (
                    <div className="text-[11px] text-[#ef4444] mt-1">
                      {isLeaveApprover 
                        ? "Please register employees first in the Employee Directory."
                        : "Your account is not registered in the Employee Directory. Please ask an administrator to add you."
                      }
                    </div>
                  ) : !isLeaveApprover ? (
                    <div className="w-full bg-[#070d24] border border-white/5 rounded-xl px-4 py-2.5 text-[12px] text-white/90 font-semibold bg-white/[0.01]">
                      {employees[0].first_name} {employees[0].last_name}
                    </div>
                  ) : (
                    <select
                      required
                      value={employeeId}
                      onChange={e => setEmployeeId(e.target.value)}
                      className="w-full bg-[#070d24] border border-white/5 rounded-xl px-3 py-2 text-[12px] text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- Choose Employee --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Leave Type</label>
                  <select
                    value={leaveType}
                    onChange={e => setLeaveType(e.target.value as any)}
                    className="w-full bg-[#070d24] border border-white/5 rounded-xl px-3 py-2 text-[12px] text-white focus:outline-none"
                  >
                    <option value="annual">Annual Leave</option>
                    <option value="sick">Sick Leave</option>
                    <option value="maternity">Maternity Leave</option>
                    <option value="paternity">Paternity Leave</option>
                    <option value="family">Family Responsibility Leave</option>
                    <option value="study">Study Leave</option>
                    <option value="unpaid">Unpaid Leave</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full bg-[#070d24] border border-white/5 rounded-xl px-4 py-2 text-[12px] text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">End Date</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full bg-[#070d24] border border-white/5 rounded-xl px-4 py-2 text-[12px] text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="bg-[#070d24] border border-white/5 rounded-xl p-3 flex justify-between items-center text-[12px]">
                  <span className="text-[#94a3c8] flex items-center gap-1.5"><Calendar size={14} /> Total Duration:</span>
                  <span className="text-[#eef2ff] font-bold">{daysCount} Days</span>
                </div>

                <div>
                  <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Reason / Notes (Optional)</label>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    className="w-full bg-[#070d24] border border-white/5 rounded-xl px-4 py-2 text-[12px] text-white focus:outline-none focus:border-blue-500 resize-none"
                    placeholder="Provide a reason for the leave request..."
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 border border-white/5 hover:bg-white/5 text-[11px] font-bold rounded-xl text-t3 hover:text-t1 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!employeeId || daysCount <= 0}
                    className="px-5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-blue-500/50 disabled:opacity-50 text-[11px] font-bold rounded-xl text-white transition-colors"
                  >
                    Submit Request
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
