'use client'
import { useEffect, useState } from 'react'
import { useDashboardContext } from '@/components/layouts/DashboardProvider'
import { Receipt, ArrowLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  DashCard,
  DashEmptyState,
  DashStatusPill,
  DashModal,
  DashModalContent,
  DashModalHeader,
  DashModalTitle,
  DashButton,
  CurrencyValue,
} from '@/components/dashboard-ui'
import { PayslipBreakdown } from './PayslipBreakdown'

interface PayrollRunInfo {
  period_start: string
  period_end: string
  period_label: string
  status: 'draft' | 'processing' | 'paid' | 'cancelled'
  paid_at: string | null
}

interface MyPayslip {
  id: string
  gross_salary: number
  paye: number
  uif_employee: number
  uif_employer: number
  sdl: number
  net_salary: number
  created_at: string
  payroll_runs: PayrollRunInfo | null
}

interface MyEmployee {
  id: string
  first_name: string
  last_name: string
  email: string
  salary: number
  salary_frequency: string
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  paid: 'success',
  processing: 'warning',
  cancelled: 'danger',
  draft: 'neutral',
}

// Self-service payslip view for Task 47: any employee, not just admin/owner/hr/payroll,
// can see their own real payslips here. No PDF/document exists anywhere in this codebase
// for payslips (confirmed via audit) -- this renders the real structured data directly
// rather than faking a download button for a document that was never generated.
export default function MyPayslipsView() {
  const { workspace } = useDashboardContext() as any
  const workspaceId = workspace?.id

  const [loading, setLoading] = useState(true)
  const [employee, setEmployee] = useState<MyEmployee | null>(null)
  const [payslips, setPayslips] = useState<MyPayslip[]>([])
  const [detailOpen, setDetailOpen] = useState<MyPayslip | null>(null)

  const fetchMyPayslips = async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/hr/payslips/me?workspaceId=${workspaceId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEmployee(data.employee)
      setPayslips(data.payslips ?? [])
    } catch (err: any) {
      toast.error(err.message || 'Failed to load your payslips')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMyPayslips()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId])

  if (loading) {
    return (
      <div className="min-h-screen bg-dash-bg px-6 py-6 max-w-4xl mx-auto text-center text-dash-textMuted animate-pulse">
        Loading your payslips...
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-dash-bg px-6 py-6 max-w-4xl mx-auto">
        <DashCard interactive={false}>
          <DashEmptyState
            icon={Receipt}
            title="No employee record found"
            description="No employee record was found for your account in this workspace. If you believe this is wrong, contact your HR administrator."
          />
        </DashCard>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dash-bg px-6 py-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/hr" className="text-dash-textMuted hover:text-dash-text text-[13px] font-semibold flex items-center gap-1">
          <ArrowLeft size={14} /> Overview
        </Link>
        <h1 className="font-display text-[22px] font-bold text-dash-text ml-1">My Payslips</h1>
      </div>

      {payslips.length === 0 ? (
        <DashCard interactive={false}>
          <DashEmptyState icon={Receipt} title="No payslips yet" description="No payslips have been issued to you yet." />
        </DashCard>
      ) : (
        <>
          <p className="text-[12px] text-dash-textMuted">
            {employee.first_name} {employee.last_name} · {payslips.length} payslip{payslips.length === 1 ? '' : 's'}
          </p>
          <div className="space-y-3">
            {payslips.map((p) => (
              <button
                key={p.id}
                onClick={() => setDetailOpen(p)}
                className="group w-full text-left rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent focus-visible:ring-offset-2"
              >
                <DashCard className="p-4 sm:p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-dash-accent/10 flex items-center justify-center shrink-0">
                      <Receipt size={16} className="text-dash-accent" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-[14px] font-bold text-dash-text truncate">
                        {p.payroll_runs?.period_label ?? 'Payslip'}
                      </h3>
                      <p className="text-[12px] text-dash-textMuted mt-0.5 truncate">
                        {p.payroll_runs?.period_start} – {p.payroll_runs?.period_end}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="text-right">
                      <span className="block text-[9.5px] font-bold uppercase tracking-wider text-dash-textMuted">Net pay</span>
                      <CurrencyValue
                        value={p.net_salary}
                        className="text-[15px] sm:text-[16px] font-bold !text-green font-display block whitespace-nowrap"
                      />
                      {p.payroll_runs && (
                        <DashStatusPill variant={STATUS_VARIANT[p.payroll_runs.status] ?? 'neutral'} className="mt-1 capitalize">
                          {p.payroll_runs.status}
                        </DashStatusPill>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-dash-textMuted group-hover:text-dash-text transition-colors shrink-0" />
                  </div>
                </DashCard>
              </button>
            ))}
          </div>
        </>
      )}

      <DashModal open={!!detailOpen} onOpenChange={(open) => !open && setDetailOpen(null)}>
        <DashModalContent className="max-w-md">
          {detailOpen && (
            <>
              <DashModalHeader>
                <DashModalTitle className="flex items-center gap-2">
                  <Receipt size={16} className="text-dash-accent shrink-0" />
                  {detailOpen.payroll_runs?.period_label ?? 'Payslip'}
                </DashModalTitle>
                <span className="text-[12px] text-dash-textMuted">
                  {detailOpen.payroll_runs?.period_start} – {detailOpen.payroll_runs?.period_end}
                </span>
              </DashModalHeader>

              <div className="flex items-center gap-3 rounded-xl bg-dash-surface border border-dash-border px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-dash-accent/10 flex items-center justify-center shrink-0 text-[12px] font-bold text-dash-accent">
                  {employee.first_name?.[0]}{employee.last_name?.[0]}
                </div>
                <div className="min-w-0">
                  <span className="block text-[13px] font-bold text-dash-text truncate">
                    {employee.first_name} {employee.last_name}
                  </span>
                  <span className="block text-[11px] text-dash-textMuted truncate">{employee.email}</span>
                </div>
              </div>

              <PayslipBreakdown slip={detailOpen} variant="full" />

              <p className="text-[11px] text-dash-textMuted">
                Issued {new Date(detailOpen.created_at).toLocaleDateString()}
                {detailOpen.payroll_runs?.paid_at ? ` · Paid ${new Date(detailOpen.payroll_runs.paid_at).toLocaleDateString()}` : ''}
              </p>

              <div className="flex justify-end pt-1">
                <DashButton variant="secondary" size="sm" onClick={() => setDetailOpen(null)}>
                  Close
                </DashButton>
              </div>
            </>
          )}
        </DashModalContent>
      </DashModal>
    </div>
  )
}
