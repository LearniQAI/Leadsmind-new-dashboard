'use client'
import { useEffect, useState } from 'react'
import Wrapper from '@/components/layouts/DefaultWrapper'
import { useDashboardContext } from '@/components/layouts/DashboardProvider'
import { Plus, X, CreditCard, Receipt, FileText, Landmark, Info } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

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

export default function PayrollPage() {
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.2)] text-[#10b981] text-[10px] font-semibold rounded-full px-2.5 py-0.5">● Paid</span>
      case 'processing':
        return <span className="bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] text-[#f59e0b] text-[10px] font-semibold rounded-full px-2.5 py-0.5 animate-pulse">Processing</span>
      case 'cancelled':
        return <span className="bg-red-500/10 border border-red-500/20 text-[#ef4444] text-[10px] font-semibold rounded-full px-2.5 py-0.5">Cancelled</span>
      default:
        return <span className="bg-white/5 border border-white/10 text-[#94a3c8] text-[10px] font-semibold rounded-full px-2.5 py-0.5">Draft</span>
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
              Payroll Management
            </h1>
          </div>
          <button
            onClick={() => {
              const now = new Date()
              const monthName = now.toLocaleString('default', { month: 'long' })
              setPeriodLabel(`${monthName} ${now.getFullYear()} Payroll`)
              setPeriodStart(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`)
              setPeriodEnd(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-30`)
              setRunModalOpen(true)
            }}
            className="h-9 px-4 rounded-[8px] bg-[#10b981] text-white hover:opacity-90 text-[12px] font-bold font-dm-sans flex items-center gap-1.5 transition-all shadow-lg shadow-[#10b981]/10"
          >
            <Plus size={14} /> Run Payroll
          </button>
        </div>

        {/* Tax Note Info Box */}
        <div className="bg-[#0c1535] border border-white/5 rounded-2xl p-4 flex gap-3">
          <Info className="text-[#3b82f6] shrink-0 mt-0.5" size={18} />
          <div className="text-[11.5px] text-[#94a3c8] leading-relaxed font-dm-sans">
            <strong>SARS 2024/25 Tax Rules:</strong> PAYE is calculated dynamically based on South African tax tables. 
            UIF contribution is capped at R177.12 per month (1% of salary, capped at R17,712 gross) for both employer and employee. 
            Skills Development Levy (SDL) is assessed at 1% of gross payroll.
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-[#4a5a82] animate-pulse">Loading payroll records...</div>
        ) : payrollRuns.length === 0 ? (
          <div className="text-center py-20 bg-[rgba(12,21,53,0.3)] border border-white/5 rounded-2xl p-8">
            <p className="text-[13px] text-[#4a5a82]">No payroll runs processed yet. Run your first payroll using the button above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {payrollRuns.map(run => (
              <div
                key={run.id}
                className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-2xl p-5 hover:border-[rgba(255,255,255,0.13)] transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-5"
              >
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-[14px] font-bold text-[#eef2ff] font-space-grotesk">{run.period_label}</h3>
                    {getStatusBadge(run.status)}
                  </div>
                  <p className="text-[11.5px] text-[#4a5a82] mt-1 font-dm-sans">
                    Period: {new Date(run.period_start).toLocaleDateString()} - {new Date(run.period_end).toLocaleDateString()} • {run.payslips?.length ?? 0} employees
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-right">
                  <div>
                    <span className="text-[#4a5a82] text-[9.5px] font-bold uppercase block tracking-[0.5px]">Total Gross</span>
                    <span className="text-[#eef2ff] text-[12.5px] font-semibold block mt-0.5 font-space-grotesk">
                      R{Number(run.total_gross).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#4a5a82] text-[9.5px] font-bold uppercase block tracking-[0.5px]">Total PAYE</span>
                    <span className="text-[#eef2ff] text-[12.5px] font-semibold block mt-0.5 font-space-grotesk">
                      R{Number(run.total_paye).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#4a5a82] text-[9.5px] font-bold uppercase block tracking-[0.5px]">Total UIF + SDL</span>
                    <span className="text-[#eef2ff] text-[12.5px] font-semibold block mt-0.5 font-space-grotesk">
                      R{Number(run.total_uif + run.total_sdl).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#10b981] text-[9.5px] font-bold uppercase block tracking-[0.5px]">Total Net</span>
                    <span className="text-[#10b981] text-[13px] font-bold block mt-0.5 font-space-grotesk">
                      R{Number(run.total_net).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-white/5 justify-end">
                  <button
                    onClick={() => setPayslipsOpen(run)}
                    className="h-8 px-3 rounded-lg bg-white/5 border border-white/5 text-[#eef2ff] hover:bg-white/10 text-[11px] font-bold transition-all flex items-center gap-1.5"
                  >
                    <Receipt size={12} /> View Payslips
                  </button>
                  {run.status === 'draft' && (
                    <>
                      <button
                        onClick={() => handleMarkAsPaid(run.id)}
                        className="h-8 px-3 rounded-lg bg-green-500/10 border border-green-500/20 text-[#10b981] hover:bg-green-500/20 text-[11px] font-bold transition-all"
                      >
                        Mark as Paid
                      </button>
                      <button
                        onClick={() => handleDeleteRun(run.id)}
                        className="h-8 px-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[#ef4444] hover:bg-red-500/20 text-[11px] font-bold transition-all"
                        title="Delete Run"
                      >
                        <X size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Run Payroll Modal */}
        {runModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-[#0b122b] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/[0.01]">
                <h3 className="text-[15px] font-bold text-[#eef2ff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Run Payroll
                </h3>
                <button onClick={() => setRunModalOpen(false)} className="text-[#4a5a82] hover:text-[#eef2ff] transition-colors">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleRunPayroll} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto common-scrollbar">
                <div>
                  <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Period Label</label>
                  <input
                    type="text"
                    required
                    value={periodLabel}
                    onChange={e => setPeriodLabel(e.target.value)}
                    className="w-full bg-[#070d24] border border-white/5 rounded-xl px-4 py-2 text-[12px] text-white focus:outline-none focus:border-blue-500"
                    placeholder="e.g. June 2026 Payroll"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Period Start</label>
                    <input
                      type="date"
                      required
                      value={periodStart}
                      onChange={e => setPeriodStart(e.target.value)}
                      className="w-full bg-[#070d24] border border-white/5 rounded-xl px-4 py-2 text-[12px] text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#4a5a82] font-bold uppercase tracking-wider block mb-1">Period End</label>
                    <input
                      type="date"
                      required
                      value={periodEnd}
                      onChange={e => setPeriodEnd(e.target.value)}
                      className="w-full bg-[#070d24] border border-white/5 rounded-xl px-4 py-2 text-[12px] text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Calculations Live Preview */}
                <div className="border border-white/5 bg-[#070d24]/50 rounded-2xl p-5 space-y-4">
                  <h4 className="text-[12px] font-bold text-[#eef2ff] font-space-grotesk flex items-center gap-1.5">
                    <Landmark size={14} className="text-[#3b82f6]" /> Run Preview summary ({employees.length} employees)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center border-b border-white/5 pb-3">
                    <div>
                      <span className="text-[#4a5a82] text-[9.5px] font-bold block">Gross Payroll</span>
                      <span className="text-[#eef2ff] text-[12px] font-semibold block mt-0.5">R{previewGross.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[#4a5a82] text-[9.5px] font-bold block">Total PAYE</span>
                      <span className="text-[#eef2ff] text-[12px] font-semibold block mt-0.5">R{previewPAYE.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[#4a5a82] text-[9.5px] font-bold block">UIF & SDL</span>
                      <span className="text-[#eef2ff] text-[12px] font-semibold block mt-0.5">R{(previewUIF + previewSDL).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[#10b981] text-[9.5px] font-bold block">Net Payout</span>
                      <span className="text-[#10b981] text-[12.5px] font-bold block mt-0.5">R{previewNet.toLocaleString()}</span>
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
                        <div key={emp.id} className="flex justify-between items-center text-[11px] py-1 border-b border-white/[0.02] last:border-0">
                          <span className="text-[#eef2ff] font-medium">{emp.first_name} {emp.last_name}</span>
                          <span className="text-[#94a3c8]">Gross: R{gross.toLocaleString()} • Net: <strong className="text-white">R{net.toLocaleString()}</strong></span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setRunModalOpen(false)}
                    className="px-4 py-2 border border-white/5 hover:bg-white/5 text-[11px] font-bold rounded-xl text-t3 hover:text-t1 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRun || employees.length === 0}
                    className="px-5 py-2 bg-[#10b981] hover:opacity-90 disabled:opacity-50 text-[11px] font-bold rounded-xl text-white transition-colors"
                  >
                    {submittingRun ? 'Processing...' : 'Confirm Run'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Payslips Drawer Modal */}
        {payslipsOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-[#0b122b] border border-white/10 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/[0.01]">
                <div>
                  <h3 className="text-[15px] font-bold text-[#eef2ff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Payslip Breakdown
                  </h3>
                  <span className="text-[10px] text-[#4a5a82] block mt-0.5">{payslipsOpen.period_label}</span>
                </div>
                <button onClick={() => setPayslipsOpen(null)} className="text-[#4a5a82] hover:text-[#eef2ff] transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 max-h-[70vh] overflow-y-auto common-scrollbar space-y-4">
                {(!payslipsOpen.payslips || payslipsOpen.payslips.length === 0) ? (
                  <p className="text-[12px] text-[#4a5a82] text-center py-6">No payslips generated for this run.</p>
                ) : (
                  <div className="space-y-4">
                    {payslipsOpen.payslips.map((slip: any) => (
                      <div key={slip.id} className="border border-white/5 rounded-xl p-4 bg-[#070d24]/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <span className="text-[12.5px] font-bold text-[#eef2ff] block">
                            {slip.employees?.first_name} {slip.employees?.last_name}
                          </span>
                          <span className="text-[10.5px] text-[#4a5a82] block mt-0.5">{slip.employees?.email}</span>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-right text-[11.5px] font-dm-sans">
                          <div>
                            <span className="text-[#4a5a82] text-[9px] uppercase block">Gross</span>
                            <span className="text-[#eef2ff] font-semibold block mt-0.5">R{Number(slip.gross_salary).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[#4a5a82] text-[9px] uppercase block">PAYE</span>
                            <span className="text-[#eef2ff] font-semibold block mt-0.5">R{Number(slip.paye).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[#4a5a82] text-[9px] uppercase block">UIF EE</span>
                            <span className="text-[#eef2ff] font-semibold block mt-0.5">R{Number(slip.uif_employee).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[#4a5a82] text-[9px] uppercase block">UIF ER</span>
                            <span className="text-[#eef2ff] font-semibold block mt-0.5">R{Number(slip.uif_employer).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[#4a5a82] text-[9px] uppercase block">SDL</span>
                            <span className="text-[#eef2ff] font-semibold block mt-0.5">R{Number(slip.sdl).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[#10b981] text-[9px] uppercase block">Net Pay</span>
                            <span className="text-[#10b981] font-bold block mt-0.5">R{Number(slip.net_salary).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setPayslipsOpen(null)}
                    className="px-5 py-2 bg-white/5 hover:bg-white/10 text-[11px] font-bold rounded-xl text-t1 transition-colors border border-white/5"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Wrapper>
  )
}
