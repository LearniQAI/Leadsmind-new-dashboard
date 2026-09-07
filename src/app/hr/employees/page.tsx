'use client'
import { useEffect, useState } from 'react'
import Wrapper from '@/components/layouts/DefaultWrapper'
import { useDashboardContext } from '@/components/layouts/DashboardProvider'
import { Plus, Edit2, Trash2, Users, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { getWorkspaceMembers } from '@/app/actions/settings'
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
  CurrencyValue,
} from '@/components/dashboard-ui'

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

const TYPE_LABEL: Record<Employee['employment_type'], string> = {
  full_time: 'Full-Time',
  part_time: 'Part-Time',
  contractor: 'Contractor',
  intern: 'Intern',
}

const STATUS_VARIANT: Record<Employee['status'], 'success' | 'neutral' | 'danger'> = {
  active: 'success',
  inactive: 'neutral',
  terminated: 'danger',
}

// Same select-control shape as DashInput (dashboard-ui/FormField.tsx) — that file's own
// comment says to wrap a real <select> with this className rather than re-implementing
// Radix Select for a plain dropdown.
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

export default function EmployeesPage() {
  const { workspace } = useDashboardContext() as any
  const workspaceId = workspace?.id

  const [employees, setEmployees] = useState<Employee[]>([])
  const [members, setMembers] = useState<any[]>([])
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

  const fetchMembers = async () => {
    if (!workspaceId) return
    try {
      const res = await getWorkspaceMembers()
      if (res.data) {
        setMembers(res.data)
      }
    } catch (err) {
      console.error('Failed to load workspace members', err)
    }
  }

  useEffect(() => {
    fetchEmployees()
    fetchMembers()
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

  return (
    <Wrapper>
      <div className="min-h-screen bg-dash-bg px-6 py-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/hr" className="text-dash-textMuted hover:text-dash-text text-[13px] font-semibold">
              ← Overview
            </Link>
            <h1 className="font-display text-[22px] font-bold text-dash-text ml-1">Employee Directory</h1>
          </div>
          <DashButton size="sm" onClick={openAddModal}>
            <Plus size={14} /> Add Employee
          </DashButton>
        </div>

        {loading ? (
          <div className="text-center py-20 text-dash-textMuted animate-pulse">Loading employee directory...</div>
        ) : employees.length === 0 ? (
          <DashCard interactive={false}>
            <DashEmptyState
              icon={Users}
              title="No employees registered"
              description='Click "Add Employee" to register your first team member.'
              actionLabel="Add Employee"
              onAction={openAddModal}
            />
          </DashCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map(emp => (
              <DashCard key={emp.id} className="p-5 flex flex-col justify-between gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-dash-accent/10 text-dash-accent flex items-center justify-center font-bold text-[13px] shrink-0">
                      {emp.first_name[0]}{emp.last_name[0]}
                    </div>
                    <div>
                      <h3 className="font-display text-[14px] font-bold text-dash-text">
                        {emp.first_name} {emp.last_name}
                      </h3>
                      <p className="text-[12px] text-dash-textMuted mt-0.5">{emp.role} — {emp.department}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <DashStatusPill variant="accent">{TYPE_LABEL[emp.employment_type]}</DashStatusPill>
                    <DashStatusPill variant={STATUS_VARIANT[emp.status]} dot className="capitalize">{emp.status}</DashStatusPill>
                  </div>
                </div>

                <div className="bg-dash-surface rounded-xl p-3 space-y-1.5 text-[12px]">
                  {emp.email && <div className="text-dash-textMuted"><span className="text-dash-text/70 font-medium">Email:</span> {emp.email}</div>}
                  {emp.phone && <div className="text-dash-textMuted"><span className="text-dash-text/70 font-medium">Phone:</span> {emp.phone}</div>}
                  {emp.id_number && <div className="text-dash-textMuted"><span className="text-dash-text/70 font-medium">ID No:</span> {emp.id_number}</div>}
                  <div className="text-dash-textMuted flex items-center gap-1">
                    <span className="text-dash-text/70 font-medium">Salary:</span> <CurrencyValue value={emp.salary} /> / {emp.salary_frequency}
                  </div>
                </div>

                <div className="flex justify-end items-center gap-2 pt-2 border-t border-dash-border">
                  <Link
                    href={`/hr/employees/${emp.id}`}
                    className="h-7 px-3 rounded-lg bg-dash-surface text-dash-textMuted hover:text-dash-text flex items-center justify-center transition-colors text-[11px] font-semibold mr-auto"
                  >
                    Manage
                  </Link>
                  <button
                    onClick={() => openEditModal(emp)}
                    className="w-7 h-7 rounded-lg bg-dash-surface text-dash-textMuted hover:text-dash-text flex items-center justify-center transition-colors"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(emp.id)}
                    className="w-7 h-7 rounded-lg bg-red/10 text-red hover:bg-red/20 flex items-center justify-center transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </DashCard>
            ))}
          </div>
        )}

        <DashModal open={modalOpen} onOpenChange={setModalOpen}>
          <DashModalContent className="max-w-lg">
            <DashModalHeader>
              <DashModalTitle>{editingEmployee ? 'Edit Employee Details' : 'Add New Employee'}</DashModalTitle>
            </DashModalHeader>

            <form onSubmit={handleSave} className="space-y-4 max-h-[70vh] overflow-y-auto common-scrollbar pr-1">
              {!editingEmployee && members.length > 0 && (
                <DashFormField label="Autofill from Workspace Member">
                  <DashSelect
                    onChange={(e) => {
                      const val = e.target.value
                      if (val) {
                        const m = members.find(x => x.id === val)
                        if (m && m.user) {
                          setFirstName(m.user.first_name || '')
                          setLastName(m.user.last_name || '')
                          setEmail(m.user.email || '')
                          setRole(m.role || '')
                        }
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="">-- Select Member --</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.user?.first_name} {m.user?.last_name} ({m.user?.email})
                      </option>
                    ))}
                  </DashSelect>
                </DashFormField>
              )}
              <div className="grid grid-cols-2 gap-4">
                <DashFormField label="First Name" required>
                  <DashInput required value={firstName} onChange={e => setFirstName(e.target.value)} />
                </DashFormField>
                <DashFormField label="Last Name" required>
                  <DashInput required value={lastName} onChange={e => setLastName(e.target.value)} />
                </DashFormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <DashFormField label="Email">
                  <DashInput type="email" value={email} onChange={e => setEmail(e.target.value)} />
                </DashFormField>
                <DashFormField label="Phone">
                  <DashInput value={phone} onChange={e => setPhone(e.target.value)} />
                </DashFormField>
              </div>

              <DashFormField label="SA ID Number / Passport">
                <DashInput value={idNumber} onChange={e => setIdNumber(e.target.value)} />
              </DashFormField>

              <div className="grid grid-cols-2 gap-4">
                <DashFormField label="Role Title" required>
                  <DashInput required placeholder="e.g. Software Engineer" value={role} onChange={e => setRole(e.target.value)} />
                </DashFormField>
                <DashFormField label="Department" required>
                  <DashInput required placeholder="e.g. Engineering" value={department} onChange={e => setDepartment(e.target.value)} />
                </DashFormField>
              </div>

              <DashFormField label="Employment Type">
                <div className="flex gap-2">
                  {(['full_time', 'part_time', 'contractor', 'intern'] as Employee['employment_type'][]).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEmploymentType(type)}
                      className={`flex-1 py-2 border rounded-lg text-[11px] font-semibold transition-colors ${
                        employmentType === type
                          ? 'bg-dash-accent text-white border-dash-accent'
                          : 'bg-white border-dash-border text-dash-textMuted hover:border-dash-text/20'
                      }`}
                    >
                      {TYPE_LABEL[type]}
                    </button>
                  ))}
                </div>
              </DashFormField>

              <div className="grid grid-cols-3 gap-4">
                <DashFormField label="Salary Amount (ZAR)" required className="col-span-2">
                  <DashInput type="number" required min={0} value={salary} onChange={e => setSalary(Number(e.target.value))} />
                </DashFormField>
                <DashFormField label="Frequency">
                  <DashSelect value={salaryFrequency} onChange={e => setSalaryFrequency(e.target.value as any)}>
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="hourly">Hourly</option>
                  </DashSelect>
                </DashFormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <DashFormField label="Start Date" required>
                  <DashInput type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} />
                </DashFormField>
                <DashFormField label="Status">
                  <DashSelect value={status} onChange={e => setStatus(e.target.value as any)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="terminated">Terminated</option>
                  </DashSelect>
                </DashFormField>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-dash-border">
                <DashButton type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </DashButton>
                <DashButton type="submit">
                  {editingEmployee ? 'Save Changes' : 'Register Employee'}
                </DashButton>
              </div>
            </form>
          </DashModalContent>
        </DashModal>
      </div>
    </Wrapper>
  )
}
