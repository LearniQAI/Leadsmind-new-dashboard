'use client'
import { useEffect, useState } from 'react'
import Wrapper from '@/components/layouts/DefaultWrapper'
import { useDashboardContext } from '@/components/layouts/DashboardProvider'
import { Plus, Edit2, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

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
      <div className="min-h-screen bg-[#04091a] px-6 py-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <Link href="/hr" className="text-[#4a5a82] hover:text-[#eef2ff] text-[12px] font-semibold">
              ← Overview
            </Link>
            <h1 className="text-[20px] font-bold text-[#eef2ff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Schedules
            </h1>
          </div>
          {canManage && (
            <button
              onClick={openAddModal}
              className="h-9 px-4 rounded-[8px] bg-[#2563eb] text-white hover:bg-[#2563eb]/95 text-[12px] font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-[#2563eb]/10"
            >
              <Plus size={14} /> New Schedule
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20 text-[#4a5a82] animate-pulse">Loading schedules...</div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-20 bg-[rgba(12,21,53,0.3)] border border-white/5 rounded-2xl p-8">
            <p className="text-[13px] text-[#4a5a82]">No schedules yet. Create one to assign to employees.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schedules.map((s) => (
              <div key={s.id} className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="text-[13.5px] font-bold text-[#eef2ff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {s.name}
                  </h3>
                  {canManage && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEditModal(s)} className="w-7 h-7 rounded-lg bg-white/5 border border-white/5 text-[#94a3c8] hover:text-[#eef2ff] flex items-center justify-center">
                        <Edit2 size={12} />
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 text-[#ef4444] hover:bg-red-500/20 flex items-center justify-center">
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
                          ? 'bg-[#2563eb]/15 text-[#2563eb] border border-[#2563eb]/30'
                          : 'bg-white/[0.02] text-[#4a5a82] border border-white/5'
                      }`}
                    >
                      {DAY_LABELS[d]}
                    </span>
                  ))}
                </div>
                <div className="text-[11.5px] text-[#94a3c8] space-y-1">
                  <div><span className="text-[#4a5a82]">Hours:</span> {s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)}</div>
                  <div><span className="text-[#4a5a82]">Standard hours/day:</span> {s.standard_hours_per_day}</div>
                  <div><span className="text-[#4a5a82]">Overtime threshold:</span> {s.overtime_threshold_hours}h/week</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {modalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-[#0b122b] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-white/5">
                <h3 className="text-[15px] font-bold text-[#eef2ff]">{editing ? 'Edit Schedule' : 'New Schedule'}</h3>
                <button onClick={() => setModalOpen(false)} className="text-[#4a5a82] hover:text-[#eef2ff]">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleSave} className="p-5 space-y-4">
                <div>
                  <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Name *</label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-10 rounded-lg bg-white/[0.03] border border-white/10 px-3 text-[12.5px] text-[#eef2ff] focus:outline-none focus:border-[#2563eb]"
                    placeholder="e.g. Standard Weekday Shift"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Days</label>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_DAYS.map((d) => (
                      <button
                        type="button"
                        key={d}
                        onClick={() => toggleDay(d)}
                        className={`text-[10.5px] font-bold px-2.5 py-1.5 rounded-md transition-colors ${
                          days.includes(d)
                            ? 'bg-[#2563eb] text-white'
                            : 'bg-white/[0.03] text-[#4a5a82] border border-white/10'
                        }`}
                      >
                        {DAY_LABELS[d]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Start Time</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full h-10 rounded-lg bg-white/[0.03] border border-white/10 px-3 text-[12.5px] text-[#eef2ff] focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">End Time</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full h-10 rounded-lg bg-white/[0.03] border border-white/10 px-3 text-[12.5px] text-[#eef2ff] focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Standard Hours/Day</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={standardHours}
                      onChange={(e) => setStandardHours(Number(e.target.value))}
                      className="w-full h-10 rounded-lg bg-white/[0.03] border border-white/10 px-3 text-[12.5px] text-[#eef2ff] focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Overtime Threshold (h/wk)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={overtimeThreshold}
                      onChange={(e) => setOvertimeThreshold(Number(e.target.value))}
                      className="w-full h-10 rounded-lg bg-white/[0.03] border border-white/10 px-3 text-[12.5px] text-[#eef2ff] focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>
                </div>
                <button type="submit" className="w-full h-10 rounded-lg bg-[#2563eb] hover:bg-[#2563eb]/90 text-white text-[12.5px] font-bold transition-all">
                  {editing ? 'Save Changes' : 'Create Schedule'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </Wrapper>
  )
}
