'use client'
import { useEffect, useState } from 'react'
import Wrapper from '@/components/layouts/DefaultWrapper'
import { useDashboardContext } from '@/components/layouts/DashboardProvider'
import { Plus, Edit2, Trash2, ArrowLeft, CalendarClock } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  DashCard,
  DashButton,
  DashEmptyState,
  DashModal,
  DashModalContent,
  DashModalHeader,
  DashModalTitle,
  DashFormField,
  DashInput,
} from '@/components/dashboard-ui'

interface Schedule {
  id: string
  name: string
  days_of_week: string[]
  start_time: string
  end_time: string
  standard_hours_per_day: number
  overtime_threshold_hours: number
  is_default: boolean
}

const ALL_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_LABELS: Record<string, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }

export default function SchedulesPage() {
  const { workspace, role } = useDashboardContext() as any
  const workspaceId = workspace?.id
  const canManage = role === 'admin' || role === 'owner' || role === 'hr'

  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Schedule | null>(null)

  const [name, setName] = useState('')
  const [days, setDays] = useState<string[]>(['mon', 'tue', 'wed', 'thu', 'fri'])
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [standardHours, setStandardHours] = useState(8)
  const [overtimeThreshold, setOvertimeThreshold] = useState(40)

  const fetchSchedules = async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/hr/schedules?workspaceId=${workspaceId}`)
      const data = await res.json()
      setSchedules(data.schedules ?? [])
    } catch {
      toast.error('Failed to load schedules')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSchedules()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId])

  const openAddModal = () => {
    setEditing(null)
    setName('')
    setDays(['mon', 'tue', 'wed', 'thu', 'fri'])
    setStartTime('09:00')
    setEndTime('17:00')
    setStandardHours(8)
    setOvertimeThreshold(40)
    setModalOpen(true)
  }

  const openEditModal = (s: Schedule) => {
    setEditing(s)
    setName(s.name)
    setDays(s.days_of_week)
    setStartTime(s.start_time?.slice(0, 5) ?? '09:00')
    setEndTime(s.end_time?.slice(0, 5) ?? '17:00')
    setStandardHours(Number(s.standard_hours_per_day))
    setOvertimeThreshold(Number(s.overtime_threshold_hours))
    setModalOpen(true)
  }

  const toggleDay = (day: string) => {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      name,
      days_of_week: days,
      start_time: startTime,
      end_time: endTime,
      standard_hours_per_day: standardHours,
      overtime_threshold_hours: overtimeThreshold,
    }
    try {
      const res = editing
        ? await fetch(`/api/hr/schedules?id=${editing.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/hr/schedules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(editing ? 'Schedule updated' : 'Schedule created')
      setModalOpen(false)
      fetchSchedules()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save schedule')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this schedule? This is blocked if any employees are still assigned to it.')) return
    try {
      const res = await fetch(`/api/hr/schedules?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Schedule deleted')
      fetchSchedules()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete schedule')
    }
  }

  return (
    <Wrapper>
      <div className="min-h-screen bg-dash-bg px-6 py-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/hr" className="text-dash-textMuted hover:text-dash-text text-[13px] font-semibold flex items-center gap-1">
              <ArrowLeft size={14} /> Overview
            </Link>
            <h1 className="font-display text-[22px] font-bold text-dash-text ml-1">Schedules</h1>
          </div>
          {canManage && (
            <DashButton size="sm" onClick={openAddModal}>
              <Plus size={14} /> New Schedule
            </DashButton>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20 text-dash-textMuted animate-pulse">Loading schedules...</div>
        ) : schedules.length === 0 ? (
          <DashCard interactive={false}>
            <DashEmptyState
              icon={CalendarClock}
              title="No schedules yet"
              description="Create a schedule to assign to employees."
              actionLabel={canManage ? 'New Schedule' : undefined}
              onAction={canManage ? openAddModal : undefined}
            />
          </DashCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schedules.map((s) => (
              <DashCard key={s.id} interactive={false} className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-display text-[14.5px] font-bold text-dash-text">{s.name}</h3>
                  {canManage && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEditModal(s)} className="w-7 h-7 rounded-lg bg-dash-surface text-dash-textMuted hover:text-dash-text flex items-center justify-center transition-colors">
                        <Edit2 size={12} />
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="w-7 h-7 rounded-lg bg-red/10 text-red hover:bg-red/20 flex items-center justify-center transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_DAYS.map((d) => (
                    <span
                      key={d}
                      className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                        s.days_of_week?.includes(d)
                          ? 'bg-dash-accent/10 text-dash-accent'
                          : 'bg-dash-surface text-dash-textMuted'
                      }`}
                    >
                      {DAY_LABELS[d]}
                    </span>
                  ))}
                </div>
                <div className="text-[12px] text-dash-textMuted space-y-1">
                  <div><span className="text-dash-text/70 font-medium">Hours:</span> {s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)}</div>
                  <div><span className="text-dash-text/70 font-medium">Standard hours/day:</span> {s.standard_hours_per_day}</div>
                  <div><span className="text-dash-text/70 font-medium">Overtime threshold:</span> {s.overtime_threshold_hours}h/week</div>
                </div>
              </DashCard>
            ))}
          </div>
        )}

        <DashModal open={modalOpen} onOpenChange={setModalOpen}>
          <DashModalContent className="max-w-lg">
            <DashModalHeader>
              <DashModalTitle>{editing ? 'Edit Schedule' : 'New Schedule'}</DashModalTitle>
            </DashModalHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <DashFormField label="Name" required>
                <DashInput
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Standard Weekday Shift"
                />
              </DashFormField>
              <DashFormField label="Days">
                <div className="flex flex-wrap gap-1.5">
                  {ALL_DAYS.map((d) => (
                    <button
                      type="button"
                      key={d}
                      onClick={() => toggleDay(d)}
                      className={`text-[11px] font-bold px-2.5 py-1.5 rounded-md transition-colors ${
                        days.includes(d)
                          ? 'bg-dash-accent text-white'
                          : 'bg-dash-surface text-dash-textMuted border border-dash-border'
                      }`}
                    >
                      {DAY_LABELS[d]}
                    </button>
                  ))}
                </div>
              </DashFormField>
              <div className="grid grid-cols-2 gap-3">
                <DashFormField label="Start Time">
                  <DashInput type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </DashFormField>
                <DashFormField label="End Time">
                  <DashInput type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </DashFormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <DashFormField label="Standard Hours/Day">
                  <DashInput
                    type="number"
                    step="0.5"
                    min="0"
                    value={standardHours}
                    onChange={(e) => setStandardHours(Number(e.target.value))}
                  />
                </DashFormField>
                <DashFormField label="Overtime Threshold (h/wk)">
                  <DashInput
                    type="number"
                    step="0.5"
                    min="0"
                    value={overtimeThreshold}
                    onChange={(e) => setOvertimeThreshold(Number(e.target.value))}
                  />
                </DashFormField>
              </div>
              <DashButton type="submit" className="w-full">
                {editing ? 'Save Changes' : 'Create Schedule'}
              </DashButton>
            </form>
          </DashModalContent>
        </DashModal>
      </div>
    </Wrapper>
  )
}
