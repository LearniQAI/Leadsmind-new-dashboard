'use client'
import { useEffect, useState } from 'react'
import Wrapper from '@/components/layouts/DefaultWrapper'
import { useDashboardContext } from '@/components/layouts/DashboardProvider'
import { Plus, X, Edit2, Trash2, Calendar, Clock, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface TimeEntry {
  id: string
  employee_id: string
  project_name: string
  description: string
  date: string
  hours: number
  billable: boolean
  hourly_rate: number
  billed: boolean
  employees?: {
    first_name: string
    last_name: string
  }
}

interface Employee {
  id: string
  first_name: string
  last_name: string
}

export default function TimeTrackingPage() {
  const { workspace, role } = useDashboardContext() as any
  const workspaceId = workspace?.id
  const isTimeManager = role === 'admin' || role === 'owner' || role === 'hr' || role === 'payroll'

  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterEmployee, setFilterEmployee] = useState('all')
  const [filterBillable, setFilterBillable] = useState('all')

  // Modals
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)

  // Form Fields
  const [employeeId, setEmployeeId] = useState('')
  const [date, setDate] = useState('')
  const [projectName, setProjectName] = useState('')
  const [description, setDescription] = useState('')
  const [hours, setHours] = useState(1)
  const [billable, setBillable] = useState(true)
  const [hourlyRate, setHourlyRate] = useState(0)

  useEffect(() => {
    if (employees.length > 0 && !employeeId) {
      setEmployeeId(employees[0].id)
    }
  }, [employees, employeeId])

  const fetchTimeData = async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/hr/time-tracking?workspaceId=${workspaceId}&employeeId=${filterEmployee}&billable=${filterBillable}`)
      const data = await res.json()
      setTimeEntries(data.timeEntries ?? [])

      const empRes = await fetch(`/api/hr/employees?workspaceId=${workspaceId}`)
      const empData = await empRes.json()
      setEmployees(empData.employees ?? [])
    } catch {
      toast.error('Failed to load time entries')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTimeData()
  }, [workspaceId, filterEmployee, filterBillable])

  const openAddModal = () => {
    setEditingEntry(null)
    setEmployeeId(employees[0]?.id || '')
    setDate(new Date().toISOString().split('T')[0])
    setProjectName('')
    setDescription('')
    setHours(1)
    setBillable(true)
    setHourlyRate(0)
    setModalOpen(true)
  }

  const openEditModal = (entry: TimeEntry) => {
    setEditingEntry(entry)
    setEmployeeId(entry.employee_id)
    setDate(entry.date)
    setProjectName(entry.project_name || '')
    setDescription(entry.description)
    setHours(Number(entry.hours))
    setBillable(entry.billable)
    setHourlyRate(Number(entry.hourly_rate))
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!workspaceId) return

    const payload = {
      workspace_id: workspaceId,
      employee_id: employeeId || null,
      project_name: projectName,
      description,
      date,
      hours,
      billable,
      hourly_rate: billable ? hourlyRate : 0
    }

    try {
      let res
      if (editingEntry) {
        res = await fetch(`/api/hr/time-tracking?id=${editingEntry.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } else {
        res = await fetch('/api/hr/time-tracking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success(editingEntry ? 'Time entry updated' : 'Time entry logged')
      setModalOpen(false)
      fetchTimeData()
    } catch (err: any) {
      toast.error(err.message || 'Error saving time entry')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this time entry?')) return
    try {
      const res = await fetch(`/api/hr/time-tracking?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      toast.success('Time entry deleted')
      fetchTimeData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete time entry')
    }
  }

  // Summary Metrics Computations
  const totalHours = timeEntries.reduce((sum, t) => sum + Number(t.hours), 0)
  const billableHours = timeEntries.filter(t => t.billable).reduce((sum, t) => sum + Number(t.hours), 0)
  const billableValue = timeEntries.filter(t => t.billable).reduce((sum, t) => sum + (Number(t.hours) * Number(t.hourly_rate)), 0)

  return (
    <Wrapper>
      <div className="min-h-screen bg-[#04091a] px-6 py-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <Link href="/hr" className="text-[#4a5a82] hover:text-[#eef2ff] text-[12px] font-semibold">
              ← Overview
            </Link>
            <h1 className="text-[20px] font-bold text-[#eef2ff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Time Tracking
            </h1>
          </div>
          <button
            onClick={openAddModal}
            className="h-9 px-4 rounded-[8px] bg-[#2563eb] text-white hover:bg-[#2563eb]/95 text-[12px] font-bold font-dm-sans flex items-center gap-1.5 transition-all shadow-lg shadow-[#2563eb]/10"
          >
            <Plus size={14} /> Log Time
          </button>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-[11.5px] font-medium text-[#4a5a82] uppercase tracking-[0.8px] block mb-1">Total Logged Hours</span>
              <span className="text-[20px] font-bold text-[#eef2ff] font-space-grotesk">{totalHours} hrs</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Clock size={18} className="text-[#3b82f6]" />
            </div>
          </div>
          <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-[11.5px] font-medium text-[#4a5a82] uppercase tracking-[0.8px] block mb-1">Billable Hours</span>
              <span className="text-[20px] font-bold text-[#eef2ff] font-space-grotesk">{billableHours} hrs</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <Clock size={18} className="text-[#6366f1]" />
            </div>
          </div>
          <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-[11.5px] font-medium text-[#4a5a82] uppercase tracking-[0.8px] block mb-1">Billable Amount</span>
              <span className="text-[20px] font-bold text-[#10b981] font-space-grotesk">R{billableValue.toLocaleString()}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <DollarSign size={18} className="text-[#10b981]" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[rgba(12,21,53,0.85)] border border-white/5 rounded-2xl p-4 flex flex-wrap gap-4 items-center">
          {isTimeManager && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-[#4a5a82] font-bold uppercase">Employee</span>
              <select
                value={filterEmployee}
                onChange={e => setFilterEmployee(e.target.value)}
                className="bg-[#070d24] border border-white/5 rounded-xl px-3 py-1.5 text-[11.5px] text-white focus:outline-none"
              >
                <option value="all">All Employees</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-[#4a5a82] font-bold uppercase">Billable Status</span>
            <select
              value={filterBillable}
              onChange={e => setFilterBillable(e.target.value)}
              className="bg-[#070d24] border border-white/5 rounded-xl px-3 py-1.5 text-[11.5px] text-white focus:outline-none"
            >
              <option value="all">All Entries</option>
              <option value="true">Billable Only</option>
              <option value="false">Non-Billable Only</option>
            </select>
          </div>
        </div>

        {/* Time Entries Table */}
        {loading ? (
          <div className="text-center py-20 text-[#4a5a82] animate-pulse">Loading time log sheets...</div>
        ) : timeEntries.length === 0 ? (
          <div className="text-center py-20 bg-[rgba(12,21,53,0.3)] border border-white/5 rounded-2xl p-8">
            <p className="text-[13px] text-[#4a5a82]">No time sheets recorded yet.</p>
          </div>
        ) : (
          <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[12px] font-dm-sans">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.01] text-[#4a5a82] font-semibold">
                    <th className="p-4">Date</th>
                    <th className="p-4">Employee</th>
                    <th className="p-4">Project</th>
                    <th className="p-4">Description</th>
                    <th className="p-4 text-center">Hours</th>
                    <th className="p-4 text-center">Billable</th>
                    <th className="p-4 text-right">Rate</th>
                    <th className="p-4 text-right">Total</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {timeEntries.map(entry => {
                    const totalVal = entry.billable ? (entry.hours * entry.hourly_rate) : 0
                    return (
                      <tr key={entry.id} className="hover:bg-white/[0.01] transition-colors text-[#94a3c8]">
                        <td className="p-4 text-[#eef2ff] whitespace-nowrap">
                          {new Date(entry.date).toLocaleDateString()}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          {entry.employees ? `${entry.employees.first_name} ${entry.employees.last_name}` : 'Deleted Employee'}
                        </td>
                        <td className="p-4 text-[#eef2ff] font-medium whitespace-nowrap">{entry.project_name || 'N/A'}</td>
                        <td className="p-4 max-w-xs truncate" title={entry.description}>{entry.description}</td>
                        <td className="p-4 text-center font-bold text-[#eef2ff]">{entry.hours} hrs</td>
                        <td className="p-4 text-center">
                          {entry.billable ? (
                            <span className="text-[#10b981] bg-green-500/10 border border-green-500/20 text-[10px] font-semibold px-2 py-0.5 rounded-full">Yes</span>
                          ) : (
                            <span className="text-[#4a5a82] bg-white/5 border border-white/10 text-[10px] font-semibold px-2 py-0.5 rounded-full">No</span>
                          )}
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          {entry.billable ? `R${Number(entry.hourly_rate).toLocaleString()}` : '-'}
                        </td>
                        <td className="p-4 text-right text-[#eef2ff] font-semibold whitespace-nowrap">
                          {entry.billable ? `R${totalVal.toLocaleString()}` : '-'}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEditModal(entry)}
                              className="w-6 h-6 rounded-md bg-white/5 text-[#94a3c8] hover:text-[#eef2ff] flex items-center justify-center transition-colors"
                            >
                              <Edit2 size={11} />
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="w-6 h-6 rounded-md bg-red-500/10 text-[#ef4444] hover:bg-red-500/20 flex items-center justify-center transition-colors"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-[#0b122b] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/[0.01]">
                <h3 className="text-[15px] font-bold text-[#eef2ff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {editingEntry ? 'Edit Logged Time' : 'Log Hours'}
                </h3>
                <button onClick={() => setModalOpen(false)} className="text-[#4a5a82] hover:text-[#eef2ff] transition-colors">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-5 space-y-4">
                <div>
                  <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">
                    {isTimeManager ? 'Select Employee' : 'Employee'}
                  </label>
                  {employees.length === 0 ? (
                    <div className="text-[11px] text-[#ef4444] mt-1">
                      {isTimeManager 
                        ? "Please register employees first in the Employee Directory."
                        : "Your account is not registered in the Employee Directory. Please ask an administrator to add you."
                      }
                    </div>
                  ) : !isTimeManager ? (
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
                      <option value="">-- Select Employee --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full bg-[#070d24] border border-white/5 rounded-xl px-4 py-2 text-[12px] text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Project Name</label>
                    <input
                      type="text"
                      required
                      value={projectName}
                      onChange={e => setProjectName(e.target.value)}
                      className="w-full bg-[#070d24] border border-white/5 rounded-xl px-4 py-2 text-[12px] text-white focus:outline-none"
                      placeholder="e.g. Acme Website Redesign"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Logged Hours</label>
                  <input
                    type="number"
                    required
                    step={0.5}
                    min={0.5}
                    value={hours}
                    onChange={e => setHours(Number(e.target.value))}
                    className="w-full bg-[#070d24] border border-white/5 rounded-xl px-4 py-2 text-[12px] text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Task Description</label>
                  <textarea
                    rows={3}
                    required
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full bg-[#070d24] border border-white/5 rounded-xl px-4 py-2 text-[12px] text-white focus:outline-none resize-none"
                    placeholder="Describe the tasks completed..."
                  />
                </div>

                {/* Billable Section */}
                <div className="border border-white/5 bg-[#070d24]/50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11.5px] text-[#94a3c8] font-semibold">Billable Task</span>
                    <input
                      type="checkbox"
                      checked={billable}
                      onChange={e => setBillable(e.target.checked)}
                      className="accent-[#2563eb]"
                    />
                  </div>

                  {billable && (
                    <div>
                      <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Hourly Billing Rate (ZAR)</label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={hourlyRate}
                        onChange={e => setHourlyRate(Number(e.target.value))}
                        className="w-full bg-[#070d24] border border-white/5 rounded-xl px-4 py-2 text-[12px] text-white focus:outline-none"
                      />
                    </div>
                  )}
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
                    className="px-5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-[11px] font-bold rounded-xl text-white transition-colors"
                  >
                    Save Entry
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
