'use client'
import { useEffect, useState } from 'react'
import Wrapper from '@/components/layouts/DefaultWrapper'
import { useDashboardContext } from '@/components/layouts/DashboardProvider'
import { Plus, X, Receipt, Landmark, Info } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import MyPayslipsView from './MyPayslipsView'
import { PayslipBreakdown } from './PayslipBreakdown'
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

interface Payslip {
  id: string
  employee_id: string
  gross_salary: number
  paye: number
  uif_employee: number
  uif_employer: number
  sdl: number
  net_salary: number
  employees?: {
    first_name: string
    last_name: string
    email?: string
  }
}

interface PayrollRun {
  id: string
  period_start: string
  period_end: string
  period_label: string
  status: 'draft' | 'processing' | 'paid' | 'cancelled'
  total_gross: number
  total_paye: number
  total_uif: number
  total_sdl: number
  total_net: number
  created_at: string
  payslips?: Payslip[]
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  role: string
  salary: number
  status: string
}

const STATUS_VARIANT: Record<PayrollRun['status'], 'success' | 'warning' | 'danger' | 'neutral'> = {
  paid: 'success',
  processing: 'warning',
  cancelled: 'danger',
  draft: 'neutral',
}

function calculatePAYE(monthlyGross: number): number {
  const annual = monthlyGross * 12
  let annualTax = 0

  // 2024/25 SA tax brackets
  if (annual <= 237100) annualTax = annual * 0.18
  else if (annual <= 370500) annualTax = 42678 + (annual - 237100) * 0.26
  else if (annual <= 512800) annualTax = 77362 + (annual - 370500) * 0.31
  else if (annual <= 673000) annualTax = 121475 + (annual - 512800) * 0.36
  else if (annual <= 857900) annualTax = 179147 + (annual - 673000) * 0.39
  else if (annual <= 1817000) annualTax = 251258 + (annual - 857900) * 0.41
  else annualTax = 644489 + (annual - 1817000) * 0.45

  // Primary rebate 2024/25
  annualTax = Math.max(0, annualTax - 17235)

  return Math.round((annualTax / 12) * 100) / 100
}

function PayrollAdminView() {
  const { workspace } = useDashboardContext() as any
  const workspaceId = workspace?.id

  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [runModalOpen, setRunModalOpen] = useState(false)
  const [payslipsOpen, setPayslipsOpen] = useState<PayrollRun | null>(null)

  // Run Payroll Form
  const [periodLabel, setPeriodLabel] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [submittingRun, setSubmittingRun] = useState(false)

  const fetchPayrollData = async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      const payRes = await fetch(`/api/hr/payroll?workspaceId=${workspaceId}`)
      const payData = await payRes.json()
      setPayrollRuns(payData.payrollRuns ?? [])

      const empRes = await fetch(`/api/hr/employees?workspaceId=${workspaceId}`)
      const empData = await empRes.json()
      setEmployees((empData.employees ?? []).filter((e: any) => e.status === 'active'))
    } catch {
      toast.error('Failed to load payroll data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayrollData()
  }, [workspaceId])

  const handleRunPayroll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!workspaceId) return
    setSubmittingRun(true)

    try {
      const res = await fetch('/api/hr/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          periodStart,
          periodEnd,
          periodLabel
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success('Payroll run created successfully!')
      setRunModalOpen(false)
      fetchPayrollData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to run payroll')
    } finally {
      setSubmittingRun(false)
    }
  }

  const handleMarkAsPaid = async (id: string) => {
    if (!confirm('Are you sure you want to mark this payroll run as Paid? This will record payslips permanently.')) return
    try {
      const res = await fetch(`/api/hr/payroll?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid', paid_at: new Date().toISOString() })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      toast.success('Payroll run marked as Paid')
      fetchPayrollData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update payroll status')
    }
  }

  const handleDeleteRun = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payroll run? This will remove all calculated payslips.')) return
    try {
      const res = await fetch(`/api/hr/payroll?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      toast.success('Payroll run deleted')
      fetchPayrollData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete payroll run')
    }
  }

  // Pre-calculate live preview values for modal
  const previewGross = employees.reduce((sum, emp) => sum + Number(emp.salary), 0)
  const previewPAYE = employees.reduce((sum, emp) => sum + calculatePAYE(Number(emp.salary)), 0)
  const previewUIF = employees.reduce((sum, emp) => {
    const gross = Number(emp.salary)
    const uif = Math.min(177.12, gross * 0.01)
    return sum + (uif * 2) // employee + employer
  }, 0)
  const previewSDL = employees.reduce((sum, emp) => sum + (Number(emp.salary) * 0.01), 0)
  const previewNet = employees.reduce((sum, emp) => {
    const gross = Number(emp.salary)
    const paye = calculatePAYE(gross)
    const uif = Math.min(177.12, gross * 0.01)
    return sum + (gross - paye - uif)
  }, 0)

  return (
    <Wrapper>
      <div className="min-h-screen bg-dash-bg px-6 py-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/hr" className="text-dash-textMuted hover:text-dash-text text-[13px] font-semibold">
              ← Overview
            </Link>
            <h1 className="font-display text-[22px] font-bold text-dash-text ml-1">Payroll Management</h1>
          </div>
          <DashButton
            size="sm"
            onClick={() => {
              const now = new Date()
              const monthName = now.toLocaleString('default', { month: 'long' })
              setPeriodLabel(`${monthName} ${now.getFullYear()} Payroll`)
              setPeriodStart(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`)
              setPeriodEnd(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-30`)
              setRunModalOpen(true)
            }}
          >
            <Plus size={14} /> Run Payroll
          </DashButton>
        </div>

        {/* Tax Note Info Box */}
        <DashCard interactive={false} className="p-4 flex gap-3 bg-dash-accent/[0.03] border-dash-accent/20">
          <Info className="text-dash-accent shrink-0 mt-0.5" size={18} />
          <div className="text-[12.5px] text-dash-textMuted leading-relaxed">
            <strong className="text-dash-text">SARS 2024/25 Tax Rules:</strong> PAYE is calculated dynamically based on South African tax tables.
            UIF contribution is capped at R177.12 per month (1% of salary, capped at R17,712 gross) for both employer and employee.
            Skills Development Levy (SDL) is assessed at 1% of gross payroll.
          </div>
        </DashCard>

        {loading ? (
          <div className="text-center py-20 text-dash-textMuted animate-pulse">Loading payroll records...</div>
        ) : payrollRuns.length === 0 ? (
          <DashCard interactive={false}>
            <DashEmptyState icon={Landmark} title="No payroll runs yet" description="Run your first payroll using the button above." />
          </DashCard>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {payrollRuns.map(run => (
              <DashCard key={run.id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-display text-[14.5px] font-bold text-dash-text">{run.period_label}</h3>
                    <DashStatusPill variant={STATUS_VARIANT[run.status]} className="capitalize">{run.status}</DashStatusPill>
                  </div>
                  <p className="text-[12px] text-dash-textMuted mt-1">
                    Period: {new Date(run.period_start).toLocaleDateString()} - {new Date(run.period_end).toLocaleDateString()} • {run.payslips?.length ?? 0} employees
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-right">
                  <div>
                    <span className="text-dash-textMuted text-[10px] font-bold uppercase block tracking-wide">Total Gross</span>
                    <CurrencyValue value={run.total_gross} className="text-dash-text text-[13px] font-semibold block mt-0.5" />
                  </div>
                  <div>
                    <span className="text-dash-textMuted text-[10px] font-bold uppercase block tracking-wide">Total PAYE</span>
                    <CurrencyValue value={run.total_paye} className="text-dash-text text-[13px] font-semibold block mt-0.5" />
                  </div>
                  <div>
                    <span className="text-dash-textMuted text-[10px] font-bold uppercase block tracking-wide">Total UIF + SDL</span>
                    <CurrencyValue value={run.total_uif + run.total_sdl} className="text-dash-text text-[13px] font-semibold block mt-0.5" />
                  </div>
                  <div>
                    <span className="text-green text-[10px] font-bold uppercase block tracking-wide">Total Net</span>
                    <CurrencyValue value={run.total_net} className="!text-green text-[14px] font-bold block mt-0.5" />
                  </div>
                </div>

                <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-dash-border justify-end">
                  <DashButton size="sm" variant="secondary" onClick={() => setPayslipsOpen(run)}>
                    <Receipt size={12} /> View Payslips
                  </DashButton>
                  {run.status === 'draft' && (
                    <>
                      <DashButton size="sm" variant="secondary" className="!text-green" onClick={() => handleMarkAsPaid(run.id)}>
                        Mark as Paid
                      </DashButton>
                      <button
                        onClick={() => handleDeleteRun(run.id)}
                        className="h-9 px-2.5 rounded-xl bg-red/10 text-red hover:bg-red/20 text-[13px] font-bold transition-colors"
                        title="Delete Run"
                      >
                        <X size={13} />
                      </button>
                    </>
                  )}
                </div>
              </DashCard>
            ))}
          </div>
        )}

        {/* Run Payroll Modal */}
        <DashModal open={runModalOpen} onOpenChange={setRunModalOpen}>
          <DashModalContent className="max-w-xl">
            <DashModalHeader>
              <DashModalTitle>Run Payroll</DashModalTitle>
            </DashModalHeader>

            <form onSubmit={handleRunPayroll} className="space-y-4 max-h-[70vh] overflow-y-auto common-scrollbar pr-1">
              <DashFormField label="Period Label">
                <DashInput required value={periodLabel} onChange={e => setPeriodLabel(e.target.value)} placeholder="e.g. June 2026 Payroll" />
              </DashFormField>

              <div className="grid grid-cols-2 gap-4">
                <DashFormField label="Period Start">
                  <DashInput type="date" required value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
                </DashFormField>
                <DashFormField label="Period End">
                  <DashInput type="date" required value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
                </DashFormField>
              </div>

              {/* Calculations Live Preview */}
              <div className="border border-dash-border bg-dash-surface rounded-2xl p-5 space-y-4">
                <h4 className="text-[13px] font-bold text-dash-text font-display flex items-center gap-1.5">
                  <Landmark size={14} className="text-dash-accent" /> Run preview summary ({employees.length} employees)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center border-b border-dash-border pb-3">
                  <div>
                    <span className="text-dash-textMuted text-[10px] font-bold block">Gross Payroll</span>
                    <CurrencyValue value={previewGross} className="text-dash-text text-[12.5px] font-semibold block mt-0.5" />
                  </div>
                  <div>
                    <span className="text-dash-textMuted text-[10px] font-bold block">Total PAYE</span>
                    <CurrencyValue value={previewPAYE} className="text-dash-text text-[12.5px] font-semibold block mt-0.5" />
                  </div>
                  <div>
                    <span className="text-dash-textMuted text-[10px] font-bold block">UIF & SDL</span>
                    <CurrencyValue value={previewUIF + previewSDL} className="text-dash-text text-[12.5px] font-semibold block mt-0.5" />
                  </div>
                  <div>
                    <span className="text-green text-[10px] font-bold block">Net Payout</span>
                    <CurrencyValue value={previewNet} className="!text-green text-[13px] font-bold block mt-0.5" />
                  </div>
                </div>

                {/* Individual employee preview items */}
                <div className="space-y-2 max-h-[150px] overflow-y-auto common-scrollbar pr-2">
                  {employees.map(emp => {
                    const gross = Number(emp.salary)
                    const paye = calculatePAYE(gross)
                    const uif = Math.min(177.12, gross * 0.01)
                    const net = gross - paye - uif
                    return (
                      <div key={emp.id} className="flex justify-between items-center text-[12px] py-1.5 border-b border-dash-border/60 last:border-0">
                        <span className="text-dash-text font-medium">{emp.first_name} {emp.last_name}</span>
                        <span className="text-dash-textMuted">
                          Gross: <CurrencyValue value={gross} /> • Net: <strong className="text-dash-text"><CurrencyValue value={net} /></strong>
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-dash-border">
                <DashButton type="button" variant="secondary" onClick={() => setRunModalOpen(false)}>
                  Cancel
                </DashButton>
                <DashButton type="submit" disabled={submittingRun || employees.length === 0}>
                  {submittingRun ? 'Processing...' : 'Confirm Run'}
                </DashButton>
              </div>
            </form>
          </DashModalContent>
        </DashModal>

        {/* Payslips Drawer Modal */}
        <DashModal open={!!payslipsOpen} onOpenChange={(open) => !open && setPayslipsOpen(null)}>
          <DashModalContent className="max-w-xl">
            {payslipsOpen && (
              <>
                <DashModalHeader>
                  <DashModalTitle>Payslip Breakdown</DashModalTitle>
                  <span className="text-[12px] text-dash-textMuted">{payslipsOpen.period_label}</span>
                </DashModalHeader>

                <div className="max-h-[65vh] overflow-y-auto common-scrollbar space-y-4">
                  {(!payslipsOpen.payslips || payslipsOpen.payslips.length === 0) ? (
                    <p className="text-[13px] text-dash-textMuted text-center py-6">No payslips generated for this run.</p>
                  ) : (
                    <div className="space-y-3">
                      {payslipsOpen.payslips.map((slip: any) => (
                        <div key={slip.id} className="border border-dash-border rounded-2xl p-4 sm:p-5 bg-white shadow-sm">
                          <div className="flex items-center gap-3 pb-2 border-b border-dash-border">
                            <div className="w-9 h-9 rounded-xl bg-dash-accent/10 flex items-center justify-center shrink-0">
                              <Receipt size={15} className="text-dash-accent" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[13px] font-bold text-dash-text block truncate">
                                {slip.employees?.first_name} {slip.employees?.last_name}
                              </span>
                              {slip.employees?.email && (
                                <span className="text-[11px] text-dash-textMuted block truncate">{slip.employees.email}</span>
                              )}
                            </div>
                          </div>
                          <PayslipBreakdown slip={slip} variant="compact" />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <DashButton variant="secondary" onClick={() => setPayslipsOpen(null)}>
                      Close
                    </DashButton>
                  </div>
                </div>
              </>
            )}
          </DashModalContent>
        </DashModal>
      </div>
    </Wrapper>
  )
}

// Task 47: /hr/payroll is now reachable by any workspace member (see
// components/layouts/DefaultWrapper.tsx), not just admin/owner/hr/payroll -- this
// dispatcher decides which view they actually get. Same "one route, role-branched
// content" shape already used by /hr/leave for its own self-service case, reused here
// rather than fragmenting payroll into a disconnected second route.
export default function PayrollPage() {
  const { role } = useDashboardContext() as any
  const canManagePayroll = role === 'admin' || role === 'owner' || role === 'hr' || role === 'payroll'

  if (canManagePayroll) {
    return <PayrollAdminView />
  }

  return (
    <Wrapper>
      <MyPayslipsView />
    </Wrapper>
  )
}
