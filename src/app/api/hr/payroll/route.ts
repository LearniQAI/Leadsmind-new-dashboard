import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const { data: runs, error } = await supabase
    .from('payroll_runs')
    .select('*, payslips(*, employees(first_name, last_name, email, avatar_url))')
    .eq('workspace_id', workspaceId)
    .order('period_start', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ payrollRuns: runs ?? [] })
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceId, periodStart, periodEnd, periodLabel } = await req.json()

    if (!workspaceId || !periodStart || !periodEnd || !periodLabel) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Fetch active employees
    const { data: employees, error: empErr } = await supabase
      .from('employees')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')

    if (empErr) return NextResponse.json({ error: empErr.message }, { status: 500 })
    if (!employees || employees.length === 0) {
      return NextResponse.json({ error: 'No active employees found in this workspace' }, { status: 400 })
    }

    // 2. Perform payroll calculations
    let totalGross = 0
    let totalPAYE = 0
    let totalUIF = 0
    let totalSDL = 0
    let totalNet = 0

    const calculations = employees.map(emp => {
      const gross = Number(emp.salary) || 0
      const paye = calculatePAYE(gross)
      const uifEmployee = Math.min(177.12, Math.round((gross * 0.01) * 100) / 100)
      const uifEmployer = Math.min(177.12, Math.round((gross * 0.01) * 100) / 100)
      const sdl = Math.round((gross * 0.01) * 100) / 100
      const net = Math.round((gross - paye - uifEmployee) * 100) / 100

      totalGross += gross
      totalPAYE += paye
      totalUIF += (uifEmployee + uifEmployer)
      totalSDL += sdl
      totalNet += net

      return {
        employee_id: emp.id,
        gross_salary: gross,
        paye,
        uif_employee: uifEmployee,
        uif_employer: uifEmployer,
        sdl,
        net_salary: net
      }
    })

    // 3. Create the payroll run record
    const { data: run, error: runErr } = await supabase
      .from('payroll_runs')
      .insert({
        workspace_id: workspaceId,
        period_start: periodStart,
        period_end: periodEnd,
        period_label: periodLabel,
        status: 'draft',
        total_gross: totalGross,
        total_paye: totalPAYE,
        total_uif: totalUIF,
        total_sdl: totalSDL,
        total_net: totalNet
      })
      .select()
      .single()

    if (runErr) return NextResponse.json({ error: runErr.message }, { status: 500 })

    // 4. Create payslip records
    const payslipsToInsert = calculations.map(calc => ({
      ...calc,
      workspace_id: workspaceId,
      payroll_run_id: run.id
    }))

    const { error: slipErr } = await supabase
      .from('payslips')
      .insert(payslipsToInsert)

    if (slipErr) {
      // rollback run record if payslips fail
      await supabase.from('payroll_runs').delete().eq('id', run.id)
      return NextResponse.json({ error: slipErr.message }, { status: 500 })
    }

    // Notify workspace owner via email
    try {
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('owner_id, name')
        .eq('id', workspaceId)
        .single()

      if (workspace?.owner_id) {
        const { data: ownerData } = await supabase.auth.admin.getUserById(workspace.owner_id)
        if (ownerData?.user?.email) {
          await sendEmail({
            to: ownerData.user.email,
            subject: `Payroll Run Created — ${periodLabel}`,
            html: `
              <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
                <h2 style="color: #10b981;">Payroll Run Created</h2>
                <p>A new payroll run has been created for <strong>${periodLabel}</strong>.</p>
                <table style="width:100%; border-collapse:collapse; margin-top:16px;">
                  <tr><td style="padding:8px; color:#94a3c8;">Total Employees</td><td style="padding:8px; font-weight:bold;">${employees.length}</td></tr>
                  <tr><td style="padding:8px; color:#94a3c8;">Gross Payroll</td><td style="padding:8px; font-weight:bold;">R${totalGross.toLocaleString()}</td></tr>
                  <tr><td style="padding:8px; color:#94a3c8;">Total PAYE</td><td style="padding:8px; font-weight:bold;">R${totalPAYE.toLocaleString()}</td></tr>
                  <tr><td style="padding:8px; color:#94a3c8;">Total Net Payout</td><td style="padding:8px; font-weight:bold; color:#10b981;">R${totalNet.toLocaleString()}</td></tr>
                </table>
                <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://leadsmind.io'}/hr/payroll"
                  style="display:inline-block; margin-top:16px; padding:10px 20px; background:#10b981; color:white; border-radius:8px; text-decoration:none; font-weight:bold;">
                  View Payroll in LeadsMind
                </a>
              </div>
            `,
          }).catch(() => {})
        }
      }
    } catch {} // Don't fail payroll if email fails

    return NextResponse.json({ success: true, payrollRun: run })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  try {
    const body = await req.json()
    const { data, error } = await supabase
      .from('payroll_runs')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, payrollRun: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('payroll_runs').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
