export interface PayslipPdfData {
  employeeName: string
  employeeEmail: string | null
  periodLabel: string
  periodStart: string | null
  periodEnd: string | null
  issuedAt: string
  paidAt: string | null
  grossSalary: number
  paye: number
  uifEmployee: number
  uifEmployer: number
  sdl: number
  netSalary: number
}

function formatCurrency(value: number): string {
  const formatted = (Number(value) || 0).toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `R ${formatted}`
}

function row(label: string, value: string, opts?: { hint?: string; bold?: boolean }): string {
  return `
    <tr>
      <td style="padding:8px 0;font-size:12px;color:${opts?.bold ? '#0f172a' : '#334155'};${opts?.bold ? 'font-weight:600;' : ''}">
        ${label}
        ${opts?.hint ? `<div style="font-size:10px;color:#94a3b8;margin-top:2px;">${opts.hint}</div>` : ''}
      </td>
      <td style="padding:8px 0;font-size:12px;text-align:right;font-weight:600;color:${opts?.bold ? '#0f172a' : '#1e293b'};">${value}</td>
    </tr>
  `
}

/**
 * Renders the same real payslip figures shown in PayslipBreakdown.tsx (gross, PAYE,
 * UIF EE/ER, SDL, net) as a print-ready HTML payslip, for htmlToPdfBuffer() to convert.
 */
export function renderPayslipHtml(data: PayslipPdfData): string {
  const totalDeductions = data.paye + data.uifEmployee

  return `
    <div style="font-family:'Plus Jakarta Sans',sans-serif;color:#1e293b;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #e2e8f0;padding-bottom:16px;margin-bottom:20px;">
        <div>
          <h1 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 4px 0;">Payslip</h1>
          <p style="font-size:12px;color:#64748b;margin:0;">${data.periodLabel}${data.periodStart && data.periodEnd ? ` &middot; ${data.periodStart} – ${data.periodEnd}` : ''}</p>
        </div>
        <div style="text-align:right;">
          <p style="font-size:13px;font-weight:600;color:#0f172a;margin:0;">${data.employeeName}</p>
          ${data.employeeEmail ? `<p style="font-size:11px;color:#64748b;margin:2px 0 0 0;">${data.employeeEmail}</p>` : ''}
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;">
        <tbody>
          ${row('Gross salary', formatCurrency(data.grossSalary))}
        </tbody>
      </table>

      <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;margin:16px 0 4px 0;">Deductions</p>
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #e2e8f0;">
        <tbody>
          ${row('PAYE (income tax)', `– ${formatCurrency(data.paye)}`)}
          ${row('UIF — employee contribution', `– ${formatCurrency(data.uifEmployee)}`, { hint: 'Unemployment Insurance Fund, deducted from your pay' })}
          ${row('Total deductions', `– ${formatCurrency(totalDeductions)}`, { bold: true })}
        </tbody>
      </table>

      <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;margin:16px 0 4px 0;">Employer contributions</p>
      <p style="font-size:10.5px;color:#94a3b8;margin:0 0 4px 0;">Paid by your employer on top of your salary — not deducted from your take-home pay.</p>
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #e2e8f0;">
        <tbody>
          ${row('UIF — employer contribution', formatCurrency(data.uifEmployer))}
          ${row('Skills Development Levy (SDL)', formatCurrency(data.sdl))}
        </tbody>
      </table>

      <div style="margin-top:24px;border-radius:12px;border:1px solid #bbf7d0;background:#f0fdf4;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#15803d;">Net pay — take-home</span>
        <span style="font-size:20px;font-weight:700;color:#15803d;">${formatCurrency(data.netSalary)}</span>
      </div>

      <p style="font-size:10.5px;color:#94a3b8;margin-top:20px;">
        Issued ${new Date(data.issuedAt).toLocaleDateString()}${data.paidAt ? ` &middot; Paid ${new Date(data.paidAt).toLocaleDateString()}` : ''}
      </p>
    </div>
  `
}
