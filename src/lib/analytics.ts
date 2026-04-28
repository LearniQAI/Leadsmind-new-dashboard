'use server';

import { createServerClient } from '@/lib/supabase/server';
import { DashboardMetrics, DateRange } from '@/types/analytics.types';

function getDateRange(range: DateRange): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
  const end = new Date();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const start = new Date();
  start.setDate(start.getDate() - days);
  const prevEnd = new Date(start);
  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - days);
  return { start, end, prevStart, prevEnd };
}

function calcChange(current: number, previous: number): { changePercent: number; isPositive: boolean } {
  if (previous === 0) return { changePercent: current > 0 ? 100 : 0, isPositive: current >= 0 };
  const changePercent = Math.round(((current - previous) / previous) * 100);
  return { changePercent: Math.abs(changePercent), isPositive: changePercent >= 0 };
}

export async function fetchDashboardMetrics(
  workspaceId: string,
  range: DateRange = '30d'
): Promise<DashboardMetrics> {
  const supabase = await createServerClient();
  const { start, end, prevStart, prevEnd } = getDateRange(range);

  const startIso = start.toISOString();
  const endIso = end.toISOString();
  const prevStartIso = prevStart.toISOString();
  const prevEndIso = prevEnd.toISOString();

  // --- KPI: Total Contacts ---
  const [{ count: totalContacts }, { count: prevContacts }] = await Promise.all([
    supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .then(r => ({ count: r.count ?? 0 })),
    supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .gte('created_at', prevStartIso)
      .lte('created_at', prevEndIso)
      .then(r => ({ count: r.count ?? 0 })),
  ]);

  // --- KPI: Revenue (paid invoices) ---
  const [{ data: paidInvoices }, { data: prevPaidInvoices }] = await Promise.all([
    supabase
      .from('invoices')
      .select('total_amount')
      .eq('workspace_id', workspaceId)
      .eq('status', 'paid')
      .gte('paid_at', startIso)
      .lte('paid_at', endIso),
    supabase
      .from('invoices')
      .select('total_amount')
      .eq('workspace_id', workspaceId)
      .eq('status', 'paid')
      .gte('paid_at', prevStartIso)
      .lte('paid_at', prevEndIso),
  ]);
  const revenue = (paidInvoices ?? []).reduce((s, i) => s + Number(i.total_amount ?? 0), 0);
  const prevRevenue = (prevPaidInvoices ?? []).reduce((s, i) => s + Number(i.total_amount ?? 0), 0);

  // --- KPI: Open Pipeline Value ---
  const [{ data: openOpps }, { data: prevOpenOpps }] = await Promise.all([
    supabase
      .from('opportunities')
      .select('value')
      .eq('workspace_id', workspaceId)
      .eq('status', 'open')
      .gte('created_at', startIso)
      .lte('created_at', endIso),
    supabase
      .from('opportunities')
      .select('value')
      .eq('workspace_id', workspaceId)
      .eq('status', 'open')
      .gte('created_at', prevStartIso)
      .lte('created_at', prevEndIso),
  ]);
  const pipelineValue = (openOpps ?? []).reduce((s, o) => s + Number(o.value ?? 0), 0);
  const prevPipelineValue = (prevOpenOpps ?? []).reduce((s, o) => s + Number(o.value ?? 0), 0);

  // --- KPI: Course Enrollments ---
  const [{ count: enrollments }, { count: prevEnrollments }] = await Promise.all([
    supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .gte('enrolled_at', startIso)
      .lte('enrolled_at', endIso)
      .then(r => ({ count: r.count ?? 0 })),
    supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .gte('enrolled_at', prevStartIso)
      .lte('enrolled_at', prevEndIso)
      .then(r => ({ count: r.count ?? 0 })),
  ]);

  // --- Chart: New contacts per day ---
  const { data: contactsRaw } = await supabase
    .from('contacts')
    .select('created_at')
    .eq('workspace_id', workspaceId)
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  const contactsMap: Record<string, number> = {};
  (contactsRaw ?? []).forEach(c => {
    const day = c.created_at.slice(0, 10);
    contactsMap[day] = (contactsMap[day] ?? 0) + 1;
  });
  const contactsOverTime = Object.entries(contactsMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, value }));

  // --- Chart: Revenue per week ---
  const { data: revenueRaw } = await supabase
    .from('invoices')
    .select('total_amount, paid_at')
    .eq('workspace_id', workspaceId)
    .eq('status', 'paid')
    .gte('paid_at', startIso)
    .lte('paid_at', endIso);

  const weekMap: Record<string, number> = {};
  (revenueRaw ?? []).forEach(inv => {
    if (!inv.paid_at) return;
    const d = new Date(inv.paid_at);
    const wk = `W${Math.ceil(d.getDate() / 7)} ${d.toLocaleString('default', { month: 'short' })}`;
    weekMap[wk] = (weekMap[wk] ?? 0) + Number(inv.total_amount ?? 0);
  });
  const revenueByWeek = Object.entries(weekMap).map(([label, value]) => ({ label, value }));

  // --- Chart: Contacts by source ---
  const { data: sourceRaw } = await supabase
    .from('contacts')
    .select('source')
    .eq('workspace_id', workspaceId);

  const sourceMap: Record<string, number> = {};
  (sourceRaw ?? []).forEach(c => {
    const src = c.source || 'Manual';
    sourceMap[src] = (sourceMap[src] ?? 0) + 1;
  });
  const contactsBySource = Object.entries(sourceMap).map(([label, value]) => ({ label, value }));

  // --- Chart: Pipeline funnel (deal count per stage) ---
  const { data: stagesRaw } = await supabase
    .from('pipeline_stages')
    .select('id, name, position, opportunities(count)')
    .eq('workspace_id', workspaceId)
    .order('position', { ascending: true });

  const pipelineFunnel = (stagesRaw ?? []).map(s => ({
    label: s.name,
    value: Array.isArray(s.opportunities) ? s.opportunities.length : 0,
  }));

  // --- Top active contacts ---
  const { data: topContacts } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, email, last_activity_at')
    .eq('workspace_id', workspaceId)
    .order('last_activity_at', { ascending: false })
    .limit(5);

  // --- Recent invoices ---
  const { data: recentInvs } = await supabase
    .from('invoices')
    .select('id, total_amount, status, created_at, contacts(first_name, last_name)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(5);

  const recentInvoices = (recentInvs ?? []).map(inv => {
    const c = Array.isArray(inv.contacts) ? inv.contacts[0] : inv.contacts as any;
    return {
      id: inv.id,
      contact_name: c ? `${c.first_name} ${c.last_name}` : 'Unknown',
      amount: Number(inv.total_amount ?? 0),
      status: inv.status,
      created_at: inv.created_at,
    };
  });

  const contactChange = calcChange(totalContacts as number, prevContacts as number);
  const revenueChange = calcChange(revenue, prevRevenue);
  const pipelineChange = calcChange(pipelineValue, prevPipelineValue);
  const enrollmentChange = calcChange(enrollments as number, prevEnrollments as number);

  return {
    totalContacts: {
      value: totalContacts as number,
      previousValue: prevContacts as number,
      ...contactChange,
    },
    revenueThisPeriod: {
      value: revenue,
      previousValue: prevRevenue,
      ...revenueChange,
    },
    openPipelineValue: {
      value: pipelineValue,
      previousValue: prevPipelineValue,
      ...pipelineChange,
    },
    courseEnrollments: {
      value: enrollments as number,
      previousValue: prevEnrollments as number,
      ...enrollmentChange,
    },
    contactsOverTime,
    revenueByWeek,
    contactsBySource,
    pipelineFunnel,
    topActiveContacts: topContacts ?? [],
    recentInvoices,
  };
}
