'use client'
import { useEffect, useState } from 'react'
import Wrapper from '@/components/layouts/DefaultWrapper'
import { useDashboardContext } from '@/components/layouts/DashboardProvider'
import { Users, Clock, CreditCard, Calendar, Check, X, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface StatCardProps {
  title: string
  value: string | number
  icon: any
  color: string
}

function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-5 flex items-center justify-between">
      <div>
        <span className="text-[11.5px] font-medium text-[#4a5a82] uppercase tracking-[0.8px] font-dm-sans block mb-1">
          {title}
        </span>
        <span className="text-[20px] font-bold text-[#eef2ff] font-space-grotesk">
          {value}
        </span>
      </div>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}1F` }}>
        <Icon size={18} style={{ color: color }} />
      </div>
    </div>
  )
}

export default function HRPage() {
  const { workspace, role } = useDashboardContext() as any
  const workspaceId = workspace?.id

  const isLeaveApprover = role === 'admin' || role === 'owner' || role === 'hr'
  const canManageTeam = role === 'admin' || role === 'owner' || role === 'hr'
  const canRunPayroll = role === 'admin' || role === 'owner' || role === 'hr' || role === 'payroll'

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalEmployees: 0,
    pendingLeave: 0,
    hoursThisMonth: 0,
    lastPayrollDate: 'Never'
  })
  const [recentEmployees, setRecentEmployees] = useState<any[]>([])
  const [pendingLeaveRequests, setPendingLeaveRequests] = useState<any[]>([])

  const fetchHRData = async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      // 1. Fetch employees
      const empRes = await fetch(`/api/hr/employees?workspaceId=${workspaceId}`)
      const empData = await empRes.json()
      const employees = empData.employees ?? []

      // 2. Fetch leave requests
      const leaveRes = await fetch(`/api/hr/leave?workspaceId=${workspaceId}`)
      const leaveData = await leaveRes.json()
      const leaves = leaveData.leaveRequests ?? []

      // 3. Fetch time entries
      const timeRes = await fetch(`/api/hr/time-tracking?workspaceId=${workspaceId}`)
      const timeData = await timeRes.json()
      const times = timeData.timeEntries ?? []

      // 4. Fetch payroll runs
      const payRes = await fetch(`/api/hr/payroll?workspaceId=${workspaceId}`)
      const payData = await payRes.json()
      const payrolls = payData.payrollRuns ?? []

      // Calculations
      const pendingLeaves = leaves.filter((l: any) => l.status === 'pending')
      
      // Hours logged this month (filter times where date is current month)
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() // 0-indexed
      const hoursMonth = times
        .filter((t: any) => {
          const d = new Date(t.date)
          return d.getFullYear() === currentYear && d.getMonth() === currentMonth
        })
        .reduce((sum: number, t: any) => sum + Number(t.hours), 0)

      const lastPayDate = payrolls.length > 0 
        ? new Date(payrolls[0].created_at).toLocaleDateString()
        : 'Never'

      setStats({
        totalEmployees: employees.length,
        pendingLeave: pendingLeaves.length,
        hoursThisMonth: hoursMonth,
        lastPayrollDate: lastPayDate
      })

      // Last 5 employees added
      setRecentEmployees(employees.slice(0, 5))
      // Pending leave requests
      setPendingLeaveRequests(pendingLeaves)

    } catch (err) {
      toast.error('Failed to load HR dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHRData()
  }, [workspaceId])

  const handleUpdateLeaveStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/hr/leave?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Leave request ${status} successfully`)
      fetchHRData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update leave request')
    }
  }

  return (
    <Wrapper>
      <div className="min-h-screen bg-[#04091a] px-6 py-6 max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold"
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#eef2ff' }}>
              HR & <span style={{ color: '#3b82f6' }}>Payroll</span>
            </h1>
            <p className="text-[11px] uppercase tracking-[0.8px] font-medium mt-1"
              style={{ color: '#4a5a82', fontFamily: "'DM Sans', sans-serif" }}>
              Workforce, Payroll Calculations, Leave Records, and Timesheets
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canManageTeam && (
              <Link href="/hr/employees" className="h-9 px-4 rounded-[8px] bg-white/5 border border-white/5 text-[#eef2ff] hover:bg-white/10 text-[12px] font-bold font-dm-sans flex items-center gap-2 transition-all">
                Manage Team
              </Link>
            )}
            {canRunPayroll && (
              <Link href="/hr/payroll" className="h-9 px-4 rounded-[8px] bg-[#10b981] text-white hover:opacity-90 text-[12px] font-bold font-dm-sans flex items-center gap-2 transition-all shadow-lg shadow-[#10b981]/10">
                Run Payroll
              </Link>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Employees" value={stats.totalEmployees} icon={Users} color="#6366f1" />
          <StatCard title="Pending Leave" value={stats.pendingLeave} icon={Calendar} color="#f59e0b" />
          <StatCard title="Hours This Month" value={`${stats.hoursThisMonth} hrs`} icon={Clock} color="#3b82f6" />
          <StatCard title="Last Payroll Run" value={stats.lastPayrollDate} icon={CreditCard} color="#10b981" />
        </div>

        {loading ? (
          <div className="text-center py-20 text-[#4a5a82] animate-pulse">Loading dashboard...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left: Recent Employees */}
            <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-6">
              <h2 className="text-[15px] font-bold text-[#eef2ff] mb-4 font-space-grotesk">
                Recent Employees
              </h2>
              {recentEmployees.length === 0 ? (
                <p className="text-[12px] text-[#4a5a82]">No employees added yet.</p>
              ) : (
                <div className="space-y-4">
                  {recentEmployees.map(emp => (
                    <div key={emp.id} className="flex items-center justify-between pb-3 border-b border-white/5 last:border-b-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[12px]">
                          {emp.first_name[0]}{emp.last_name[0]}
                        </div>
                        <div>
                          <span className="text-[12.5px] font-semibold text-[#eef2ff] block">
                            {emp.first_name} {emp.last_name}
                          </span>
                          <span className="text-[11px] text-[#4a5a82] block">
                            {emp.role} • {emp.department}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11.5px] text-[#94a3c8] font-medium font-dm-sans">
                        Start: {emp.start_date ? new Date(emp.start_date).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Pending Leave Requests */}
            <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-6">
              <h2 className="text-[15px] font-bold text-[#eef2ff] mb-4 font-space-grotesk">
                Pending Leave Requests
              </h2>
              {pendingLeaveRequests.length === 0 ? (
                <p className="text-[12px] text-[#4a5a82]">No pending leave requests.</p>
              ) : (
                <div className="space-y-4">
                  {pendingLeaveRequests.map(leave => (
                    <div key={leave.id} className="flex items-center justify-between pb-3 border-b border-white/5 last:border-b-0 last:pb-0 gap-4">
                      <div>
                        <span className="text-[12.5px] font-semibold text-[#eef2ff] block">
                          {leave.employees?.first_name} {leave.employees?.last_name}
                        </span>
                        <span className="text-[11px] text-[#94a3c8] block mt-0.5 capitalize">
                          Type: <strong className="text-[#3b82f6]">{leave.leave_type}</strong> • {leave.days_count} days
                        </span>
                        <span className="text-[10px] text-[#4a5a82] block mt-0.5">
                          {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isLeaveApprover ? (
                          <>
                            <button
                              onClick={() => handleUpdateLeaveStatus(leave.id, 'approved')}
                              className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/20 text-[#10b981] flex items-center justify-center hover:bg-green-500/20 transition-colors"
                              title="Approve"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => handleUpdateLeaveStatus(leave.id, 'rejected')}
                              className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 text-[#ef4444] flex items-center justify-center hover:bg-red-500/20 transition-colors"
                              title="Reject"
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-bold uppercase tracking-widest font-dm-sans">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </Wrapper>
  )
}
