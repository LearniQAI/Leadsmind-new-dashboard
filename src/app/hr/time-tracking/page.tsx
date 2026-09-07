'use client'
import { useEffect, useState } from 'react'
import Wrapper from '@/components/layouts/DefaultWrapper'
import { useDashboardContext } from '@/components/layouts/DashboardProvider'
import { Plus, Edit2, Trash2, Clock, DollarSign, ChevronDown } from 'lucide-react'
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
  DashTable,
  DashTableContainer,
  DashTableHead,
  DashTableHeadCell,
  DashTableBody,
  DashTableRow,
  DashTableCell,
  CurrencyValue,
} from '@/components/dashboard-ui'

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

const selectClass =
  'w-full h-10 rounded-xl border border-dash-border bg-white pl-3 pr-8 text-[12.5px] !text-dash-text appearance-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent'

function DashSelect({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={`${selectClass} ${className ?? ''}`} {...props} />
      <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-dash-textMuted" />
    </div>
  )
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
      <div className="min-h-screen bg-dash-bg px-6 py-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/hr" className="text-dash-textMuted hover:text-dash-text text-[13px] font-semibold">
              ← Overview
            </Link>
            <h1 className="font-display text-[22px] font-bold text-dash-text ml-1">Time Tracking</h1>
          </div>
          <DashButton size="sm" onClick={openAddModal}>
            <Plus size={14} /> Log Time
          </DashButton>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <DashCard className="p-5 flex items-center justify-between">
            <div>
              <span className="text-[12px] font-medium text-dash-textMuted block mb-1">Total Logged Hours</span>
              <span className="font-display text-[20px] font-bold text-dash-text">{totalHours} hrs</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-dash-accent/10 flex items-center justify-center">
              <Clock size={18} className="text-dash-accent" />
            </div>
          </DashCard>
          <DashCard className="p-5 flex items-center justify-between">
            <div>
              <span className="text-[12px] font-medium text-dash-textMuted block mb-1">Billable Hours</span>
              <span className="font-display text-[20px] font-bold text-dash-text">{billableHours} hrs</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple/10 flex items-center justify-center">
              <Clock size={18} className="text-purple" />
            </div>
          </DashCard>
          <DashCard className="p-5 flex items-center justify-between">
            <div>
              <span className="text-[12px] font-medium text-dash-textMuted block mb-1">Billable Amount</span>
              <CurrencyValue value={billableValue} className="font-display text-[20px] font-bold !text-green block" />
            </div>
            <div className="w-10 h-10 rounded-xl bg-green/10 flex items-center justify-center">
              <DollarSign size={18} className="text-green" />
            </div>
          </DashCard>
        </div>

        {/* Filters */}
        <DashCard interactive={false} className="p-4 flex flex-wrap gap-4 items-end">
          {isTimeManager && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-dash-textMuted font-bold uppercase tracking-wide">Employee</span>
              <DashSelect value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} className="w-48">
                <option value="all">All Employees</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                ))}
              </DashSelect>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-dash-textMuted font-bold uppercase tracking-wide">Billable Status</span>
            <DashSelect value={filterBillable} onChange={e => setFilterBillable(e.target.value)} className="w-44">
              <option value="all">All Entries</option>
              <option value="true">Billable Only</option>
              <option value="false">Non-Billable Only</option>
            </DashSelect>
          </div>
        </DashCard>

        {/* Time Entries */}
        {loading ? (
          <div className="text-center py-20 text-dash-textMuted animate-pulse">Loading time log sheets...</div>
        ) : timeEntries.length === 0 ? (
          <DashCard interactive={false}>
            <DashEmptyState icon={Clock} title="No time sheets recorded" description="No time sheets recorded yet." />
          </DashCard>
        ) : (
          <>
            {/* Desktop: table */}
            <DashTableContainer className="hidden md:block">
              <DashTable>
                <DashTableHead>
                  <tr>
                    <DashTableHeadCell>Date</DashTableHeadCell>
                    <DashTableHeadCell>Employee</DashTableHeadCell>
                    <DashTableHeadCell>Project</DashTableHeadCell>
                    <DashTableHeadCell>Description</DashTableHeadCell>
                    <DashTableHeadCell className="text-center">Hours</DashTableHeadCell>
                    <DashTableHeadCell className="text-center">Billable</DashTableHeadCell>
                    <DashTableHeadCell className="text-right">Rate</DashTableHeadCell>
                    <DashTableHeadCell className="text-right">Total</DashTableHeadCell>
                    <DashTableHeadCell className="text-center">Actions</DashTableHeadCell>
                  </tr>
                </DashTableHead>
                <DashTableBody>
                  {timeEntries.map(entry => {
                    const totalVal = entry.billable ? (entry.hours * entry.hourly_rate) : 0
                    return (
                      <DashTableRow key={entry.id}>
                        <DashTableCell className="whitespace-nowrap">{new Date(entry.date).toLocaleDateString()}</DashTableCell>
                        <DashTableCell className="whitespace-nowrap">
                          {entry.employees ? `${entry.employees.first_name} ${entry.employees.last_name}` : 'Deleted Employee'}
                        </DashTableCell>
                        <DashTableCell className="font-medium whitespace-nowrap">{entry.project_name || 'N/A'}</DashTableCell>
                        <DashTableCell className="max-w-xs truncate" title={entry.description}>{entry.description}</DashTableCell>
                        <DashTableCell className="text-center font-bold">{entry.hours} hrs</DashTableCell>
                        <DashTableCell className="text-center">
                          <DashStatusPill variant={entry.billable ? 'success' : 'neutral'}>{entry.billable ? 'Yes' : 'No'}</DashStatusPill>
                        </DashTableCell>
                        <DashTableCell className="text-right whitespace-nowrap">
                          {entry.billable ? <CurrencyValue value={entry.hourly_rate} /> : '-'}
                        </DashTableCell>
                        <DashTableCell className="text-right font-semibold whitespace-nowrap">
                          {entry.billable ? <CurrencyValue value={totalVal} /> : '-'}
                        </DashTableCell>
                        <DashTableCell>
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => openEditModal(entry)} className="w-7 h-7 rounded-md bg-dash-surface text-dash-textMuted hover:text-dash-text flex items-center justify-center transition-colors">
                              <Edit2 size={11} />
                            </button>
                            <button onClick={() => handleDelete(entry.id)} className="w-7 h-7 rounded-md bg-red/10 text-red hover:bg-red/20 flex items-center justify-center transition-colors">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </DashTableCell>
                      </DashTableRow>
                    )
                  })}
                </DashTableBody>
              </DashTable>
            </DashTableContainer>

            {/* Mobile: card list */}
            <div className="md:hidden space-y-3">
              {timeEntries.map(entry => {
                const totalVal = entry.billable ? (entry.hours * entry.hourly_rate) : 0
                return (
                  <DashCard key={entry.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-[13px] font-bold text-dash-text">{entry.project_name || 'N/A'}</span>
                      <DashStatusPill variant={entry.billable ? 'success' : 'neutral'}>{entry.billable ? 'Billable' : 'Non-billable'}</DashStatusPill>
                    </div>
                    <p className="text-[12px] text-dash-textMuted">{entry.description}</p>
                    <div className="flex items-center justify-between text-[12px] text-dash-textMuted pt-1 border-t border-dash-border">
                      <span>{new Date(entry.date).toLocaleDateString()}</span>
                      <span>{entry.employees ? `${entry.employees.first_name} ${entry.employees.last_name}` : 'Deleted Employee'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-dash-text font-bold">{entry.hours} hrs</span>
                      {entry.billable && <CurrencyValue value={totalVal} className="font-semibold text-dash-text" />}
                    </div>
                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <button onClick={() => openEditModal(entry)} className="w-7 h-7 rounded-md bg-dash-surface text-dash-textMuted flex items-center justify-center">
                        <Edit2 size={11} />
                      </button>
                      <button onClick={() => handleDelete(entry.id)} className="w-7 h-7 rounded-md bg-red/10 text-red flex items-center justify-center">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </DashCard>
                )
              })}
            </div>
          </>
        )}

        {/* Modal */}
        <DashModal open={modalOpen} onOpenChange={setModalOpen}>
          <DashModalContent className="max-w-md">
            <DashModalHeader>
              <DashModalTitle>{editingEntry ? 'Edit Logged Time' : 'Log Hours'}</DashModalTitle>
            </DashModalHeader>

            <form onSubmit={handleSave} className="space-y-4">
              <DashFormField label={isTimeManager ? 'Select Employee' : 'Employee'}>
                {employees.length === 0 ? (
                  <div className="text-[12px] text-red mt-1">
                    {isTimeManager
                      ? 'Please register employees first in the Employee Directory.'
                      : 'Your account is not registered in the Employee Directory. Please ask an administrator to add you.'}
                  </div>
                ) : !isTimeManager ? (
                  <div className="w-full h-11 rounded-xl border border-dash-border bg-dash-surface px-3.5 flex items-center text-sm font-semibold text-dash-text">
                    {employees[0].first_name} {employees[0].last_name}
                  </div>
                ) : (
                  <DashSelect required value={employeeId} onChange={e => setEmployeeId(e.target.value)} className="h-11 text-sm">
                    <option value="">-- Select Employee --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                    ))}
                  </DashSelect>
                )}
              </DashFormField>

              <div className="grid grid-cols-2 gap-4">
                <DashFormField label="Date">
                  <DashInput type="date" required value={date} onChange={e => setDate(e.target.value)} />
                </DashFormField>
                <DashFormField label="Project Name">
                  <DashInput required value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. Acme Website Redesign" />
                </DashFormField>
              </div>

              <DashFormField label="Logged Hours">
                <DashInput type="number" required step={0.5} min={0.5} value={hours} onChange={e => setHours(Number(e.target.value))} />
              </DashFormField>

              <DashFormField label="Task Description">
                <DashTextarea rows={3} required value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the tasks completed..." />
              </DashFormField>

              {/* Billable Section */}
              <div className="border border-dash-border bg-dash-surface rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-dash-text font-semibold">Billable Task</span>
                  <input type="checkbox" checked={billable} onChange={e => setBillable(e.target.checked)} className="accent-dash-accent" />
                </div>

                {billable && (
                  <DashFormField label="Hourly Billing Rate (ZAR)">
                    <DashInput type="number" min={0} required value={hourlyRate} onChange={e => setHourlyRate(Number(e.target.value))} className="bg-white" />
                  </DashFormField>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-dash-border">
                <DashButton type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </DashButton>
                <DashButton type="submit">
                  Save Entry
                </DashButton>
              </div>
            </form>
          </DashModalContent>
        </DashModal>
      </div>
    </Wrapper>
  )
}
