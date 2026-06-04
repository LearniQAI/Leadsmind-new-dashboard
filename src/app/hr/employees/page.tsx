'use client'
import { useEffect, useState } from 'react'
import Wrapper from '@/components/layouts/DefaultWrapper'
import { useDashboardContext } from '@/components/layouts/DashboardProvider'
import { Plus, Edit2, Trash2, X, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  id_number: string
  role: string
  department: string
  employment_type: 'full_time' | 'part_time' | 'contractor' | 'intern'
  start_date: string
  salary: number
  salary_frequency: 'monthly' | 'weekly' | 'hourly'
  status: 'active' | 'inactive' | 'terminated'
}

export default function EmployeesPage() {
  const { workspace } = useDashboardContext() as any
  const workspaceId = workspace?.id

  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)

  // Form Fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [role, setRole] = useState('')
  const [department, setDepartment] = useState('')
  const [employmentType, setEmploymentType] = useState<Employee['employment_type']>('full_time')
  const [startDate, setStartDate] = useState('')
  const [salary, setSalary] = useState(0)
  const [salaryFrequency, setSalaryFrequency] = useState<Employee['salary_frequency']>('monthly')
  const [status, setStatus] = useState<Employee['status']>('active')

  const fetchEmployees = async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/hr/employees?workspaceId=${workspaceId}`)
      const data = await res.json()
      setEmployees(data.employees ?? [])
    } catch {
      toast.error('Failed to load employees')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [workspaceId])

  const openAddModal = () => {
    setEditingEmployee(null)
    setFirstName('')
    setLastName('')
    setEmail('')
    setPhone('')
    setIdNumber('')
    setRole('')
    setDepartment('')
    setEmploymentType('full_time')
    setStartDate(new Date().toISOString().split('T')[0])
    setSalary(0)
    setSalaryFrequency('monthly')
    setStatus('active')
    setModalOpen(true)
  }

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp)
    setFirstName(emp.first_name)
    setLastName(emp.last_name)
    setEmail(emp.email || '')
    setPhone(emp.phone || '')
    setIdNumber(emp.id_number || '')
    setRole(emp.role || '')
    setDepartment(emp.department || '')
    setEmploymentType(emp.employment_type)
    setStartDate(emp.start_date || '')
    setSalary(emp.salary)
    setSalaryFrequency(emp.salary_frequency)
    setStatus(emp.status)
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!workspaceId) return

    const payload = {
      workspace_id: workspaceId,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      id_number: idNumber,
      role,
      department,
      employment_type: employmentType,
      start_date: startDate || null,
      salary,
      salary_frequency: salaryFrequency,
      status
    }

    try {
      let res
      if (editingEmployee) {
        res = await fetch(`/api/hr/employees?id=${editingEmployee.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } else {
        res = await fetch('/api/hr/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success(editingEmployee ? 'Employee updated' : 'Employee created')
      setModalOpen(false)
      fetchEmployees()
    } catch (err: any) {
      toast.error(err.message || 'Error saving employee')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return
    try {
      const res = await fetch(`/api/hr/employees?id=${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      toast.success('Employee deleted')
      fetchEmployees()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete employee')
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'full_time':
        return <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-semibold px-2 py-0.5 rounded-full">Full-Time</span>
      case 'part_time':
        return <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-semibold px-2 py-0.5 rounded-full">Part-Time</span>
      case 'contractor':
        return <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-semibold px-2 py-0.5 rounded-full">Contractor</span>
      case 'intern':
        return <span className="bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-semibold px-2 py-0.5 rounded-full">Intern</span>
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="text-[#10b981] text-[10.5px] font-medium flex items-center gap-1">● Active</span>
      case 'inactive':
        return <span className="text-[#94a3c8] text-[10.5px] font-medium flex items-center gap-1">○ Inactive</span>
      case 'terminated':
        return <span className="text-[#ef4444] text-[10.5px] font-medium flex items-center gap-1">✕ Terminated</span>
      default:
        return null
    }
  }

  return (
    <Wrapper>
      <div className="min-h-screen bg-[#04091a] px-6 py-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <Link href="/hr" className="text-[#4a5a82] hover:text-[#eef2ff] text-[12px] font-semibold">
              ← Overview
            </Link>
            <h1 className="text-[20px] font-bold text-[#eef2ff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Employee Directory
            </h1>
          </div>
          <button
            onClick={openAddModal}
            className="h-9 px-4 rounded-[8px] bg-[#2563eb] text-white hover:bg-[#2563eb]/95 text-[12px] font-bold font-dm-sans flex items-center gap-1.5 transition-all shadow-lg shadow-[#2563eb]/10"
          >
            <Plus size={14} /> Add Employee
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-[#4a5a82] animate-pulse">Loading employee directory...</div>
        ) : employees.length === 0 ? (
          <div className="text-center py-20 bg-[rgba(12,21,53,0.3)] border border-white/5 rounded-2xl p-8">
            <p className="text-[13px] text-[#4a5a82]">No employees registered. Click "Add Employee" to register your first team member.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map(emp => (
              <div key={emp.id} className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-5 hover:border-[rgba(255,255,255,0.13)] transition-all flex flex-col justify-between gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[13px] shrink-0">
                      {emp.first_name[0]}{emp.last_name[0]}
                    </div>
                    <div>
                      <h3 className="text-[13.5px] font-bold text-[#eef2ff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {emp.first_name} {emp.last_name}
                      </h3>
                      <p className="text-[11.5px] text-[#94a3c8] mt-0.5 font-medium">{emp.role} — {emp.department}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {getTypeBadge(emp.employment_type)}
                    {getStatusBadge(emp.status)}
                  </div>
                </div>

                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-1.5 text-[11.5px] font-dm-sans">
                  {emp.email && <div className="text-[#94a3c8]"><span className="text-[#4a5a82]">Email:</span> {emp.email}</div>}
                  {emp.phone && <div className="text-[#94a3c8]"><span className="text-[#4a5a82]">Phone:</span> {emp.phone}</div>}
                  {emp.id_number && <div className="text-[#94a3c8]"><span className="text-[#4a5a82]">ID No:</span> {emp.id_number}</div>}
                  <div className="text-[#94a3c8]">
                    <span className="text-[#4a5a82]">Salary:</span> R{Number(emp.salary).toLocaleString()} / {emp.salary_frequency}
                  </div>
                </div>

                <div className="flex justify-end items-center gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => openEditModal(emp)}
                    className="w-7 h-7 rounded-lg bg-white/5 border border-white/5 text-[#94a3c8] hover:text-[#eef2ff] flex items-center justify-center transition-colors"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(emp.id)}
                    className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 text-[#ef4444] hover:bg-red-500/20 flex items-center justify-center transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-[#0b122b] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/[0.01]">
                <h3 className="text-[15px] font-bold text-[#eef2ff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {editingEmployee ? 'Edit Employee Details' : 'Add New Employee'}
                </h3>
                <button onClick={() => setModalOpen(false)} className="text-[#4a5a82] hover:text-[#eef2ff] transition-colors">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto common-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      className="w-full bg-[#070d24] border border-white/5 rounded-xl px-4 py-2 text-[12px] text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Last Name</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      className="w-full bg-[#070d24] border border-white/5 rounded-xl px-4 py-2 text-[12px] text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-[#070d24] border border-white/5 rounded-xl px-4 py-2 text-[12px] text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Phone</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full bg-[#070d24] border border-white/5 rounded-xl px-4 py-2 text-[12px] text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">SA ID Number / Passport</label>
                  <input
                    type="text"
                    value={idNumber}
                    onChange={e => setIdNumber(e.target.value)}
                    className="w-full bg-[#070d24] border border-white/5 rounded-xl px-4 py-2 text-[12px] text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Role Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Software Engineer"
                      value={role}
                      onChange={e => setRole(e.target.value)}
                      className="w-full bg-[#070d24] border border-white/5 rounded-xl px-4 py-2 text-[12px] text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Department</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Engineering"
                      value={department}
                      onChange={e => setDepartment(e.target.value)}
                      className="w-full bg-[#070d24] border border-white/5 rounded-xl px-4 py-2 text-[12px] text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Employment Type</label>
                  <div className="flex gap-2">
                    {(['full_time', 'part_time', 'contractor', 'intern'] as Employee['employment_type'][]).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setEmploymentType(type)}
                        className={`flex-1 py-1.5 border rounded-lg text-[10.5px] font-semibold transition-all ${
                          employmentType === type
                            ? 'bg-[#2563eb] text-white border-[#2563eb]'
                            : 'bg-[#070d24] border-white/5 text-[#94a3c8] hover:border-white/10'
                        }`}
                      >
                        {type.replace('_', ' ').toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Salary Amount (ZAR)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={salary}
                      onChange={e => setSalary(Number(e.target.value))}
                      className="w-full bg-[#070d24] border border-white/5 rounded-xl px-4 py-2 text-[12px] text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Frequency</label>
                    <select
                      value={salaryFrequency}
                      onChange={e => setSalaryFrequency(e.target.value as any)}
                      className="w-full bg-[#070d24] border border-white/5 rounded-xl px-3 py-2 text-[12px] text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="weekly">Weekly</option>
                      <option value="hourly">Hourly</option>
                    </select>
                  </div>
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
                    <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Status</label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as any)}
                      className="w-full bg-[#070d24] border border-white/5 rounded-xl px-3 py-2 text-[12px] text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="terminated">Terminated</option>
                    </select>
                  </div>
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
                    {editingEmployee ? 'Save Changes' : 'Register Employee'}
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
