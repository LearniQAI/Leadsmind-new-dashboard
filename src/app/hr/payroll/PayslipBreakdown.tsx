import { CurrencyValue } from '@/components/dashboard-ui'

/**
 * Shared payslip figure breakdown — one visual language for both the admin
 * "Payslip Breakdown" modal (/hr/payroll) and the employee self-service
 * payslip modal (MyPayslipsView, Task 47).
 *
 * Replaces the previous `grid-cols-6` figure strip, which collided in a
 * narrow modal: six equal `minmax(0,1fr)` tracks could not hold a figure
 * like "R 150 000,00", so `text-right` values overflowed their track and
 * rendered on top of the neighbouring column ("10 000,0863,75" in the bug
 * report). Here every figure sits on its own flex row: the label may wrap
 * or truncate, the value never shrinks (`shrink-0 whitespace-nowrap`), so
 * the two can never overlap regardless of salary size.
 */

export interface PayslipFigures {
  gross_salary: number
  paye: number
  uif_employee: number
  uif_employer: number
  sdl: number
  net_salary: number
}

function Row({
  label,
  hint,
  value,
  tone = 'default',
}: {
  label: string
  hint?: string
  value: number
  tone?: 'default' | 'deduction' | 'muted'
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <span
          className={
            tone === 'muted'
              ? 'text-[12.5px] text-dash-textMuted'
              : 'text-[12.5px] text-dash-text'
          }
        >
          {label}
        </span>
        {hint && <span className="block text-[11px] text-dash-textMuted mt-0.5">{hint}</span>}
      </div>
      <span
        className={
          'shrink-0 whitespace-nowrap text-[13px] font-semibold ' +
          (tone === 'deduction'
            ? 'text-red'
            : tone === 'muted'
            ? 'text-dash-textMuted'
            : 'text-dash-text')
        }
      >
        {tone === 'deduction' && '– '}
        <CurrencyValue value={value} />
      </span>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-wider text-dash-textMuted pt-3 pb-1">
      {children}
    </p>
  )
}

export function PayslipBreakdown({
  slip,
  variant = 'full',
}: {
  slip: PayslipFigures
  /** `full` — net-pay hero focal point (self-service). `compact` — inline net row (admin list). */
  variant?: 'full' | 'compact'
}) {
  const totalDeductions = slip.paye + slip.uif_employee

  return (
    <div>
      {variant === 'full' && (
        <div className="rounded-2xl border border-green/25 bg-green/[0.06] px-5 py-5 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-green/90">Net pay — take-home</p>
          <CurrencyValue
            value={slip.net_salary}
            className="!text-green font-display font-bold text-[30px] leading-tight block mt-1.5"
          />
        </div>
      )}

      <SectionLabel>Earnings</SectionLabel>
      <div className="divide-y divide-dash-border">
        <Row label="Gross salary" value={slip.gross_salary} />
      </div>

      <SectionLabel>Deductions</SectionLabel>
      <div className="divide-y divide-dash-border">
        <Row label="PAYE (income tax)" value={slip.paye} tone="deduction" />
        <Row
          label="UIF — your contribution"
          hint="Unemployment Insurance Fund, deducted from your pay"
          value={slip.uif_employee}
          tone="deduction"
        />
        <div className="flex items-center justify-between gap-4 py-2.5">
          <span className="text-[12.5px] font-semibold text-dash-text">Total deductions</span>
          <span className="shrink-0 whitespace-nowrap text-[13px] font-bold text-red">
            – <CurrencyValue value={totalDeductions} />
          </span>
        </div>
      </div>

      <SectionLabel>Employer contributions</SectionLabel>
      <p className="text-[11px] text-dash-textMuted pb-1">
        Paid by your employer on top of your salary — not deducted from your take-home pay.
      </p>
      <div className="divide-y divide-dash-border">
        <Row label="UIF — employer contribution" value={slip.uif_employer} tone="muted" />
        <Row label="Skills Development Levy (SDL)" value={slip.sdl} tone="muted" />
      </div>

      {variant === 'compact' && (
        <div className="mt-3 flex items-center justify-between gap-4 rounded-xl border border-green/25 bg-green/[0.06] px-4 py-3">
          <span className="text-[12px] font-bold uppercase tracking-wider text-green/90">Net pay</span>
          <CurrencyValue
            value={slip.net_salary}
            className="!text-green font-display font-bold text-[17px] shrink-0 whitespace-nowrap"
          />
        </div>
      )}
    </div>
  )
}
