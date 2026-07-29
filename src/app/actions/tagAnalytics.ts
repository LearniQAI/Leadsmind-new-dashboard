'use server';

import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { logger } from '@/shared/logger';

// Real aggregation queries only — no AI estimation anywhere in this file. Every
// number here is a direct count/sum over tag_assignments joined to the real
// revenue/conversion/completion tables per module.
export async function getTagAnalytics() {
  const { workspaceId } = await requireWorkspaceAccess();
  const supabase = await createServerClient();

  try {
    const [{ data: tags }, { data: assignments }] = await Promise.all([
      supabase.from('tags').select('id, name').eq('workspace_id', workspaceId),
      supabase.from('tag_assignments').select('tag_id, entity_type, entity_id').eq('workspace_id', workspaceId),
    ]);

    const tagsById = new Map((tags ?? []).map((t) => [t.id, t.name]));
    const contactIdsByTag = new Map<string, Set<string>>();
    (assignments ?? [])
      .filter((a) => a.entity_type === 'contact')
      .forEach((a) => {
        if (!contactIdsByTag.has(a.tag_id)) contactIdsByTag.set(a.tag_id, new Set());
        contactIdsByTag.get(a.tag_id)!.add(a.entity_id);
      });

    // ---- Most-used tags ----
    const mostUsedTags = Array.from(contactIdsByTag.entries())
      .map(([tagId, contactIds]) => ({ tagId, name: tagsById.get(tagId) ?? 'Unknown', count: contactIds.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ---- Revenue by tag ----
    const { data: paidInvoices } = await supabase
      .from('invoices')
      .select('contact_id, amount_paid')
      .eq('workspace_id', workspaceId)
      .eq('status', 'paid');
    const revenueByContact = new Map<string, number>();
    (paidInvoices ?? []).forEach((inv) => {
      revenueByContact.set(inv.contact_id, (revenueByContact.get(inv.contact_id) ?? 0) + Number(inv.amount_paid ?? 0));
    });
    const revenueByTag = Array.from(contactIdsByTag.entries())
      .map(([tagId, contactIds]) => ({
        tagId,
        name: tagsById.get(tagId) ?? 'Unknown',
        revenue: Array.from(contactIds).reduce((sum, id) => sum + (revenueByContact.get(id) ?? 0), 0),
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // ---- Conversion by tag (won deals / tagged contacts with a deal) ----
    const { data: deals } = await supabase.from('opportunities').select('contact_id, status').eq('workspace_id', workspaceId);
    const dealsByContact = new Map<string, { won: number; total: number }>();
    (deals ?? []).forEach((d) => {
      if (!d.contact_id) return;
      if (!dealsByContact.has(d.contact_id)) dealsByContact.set(d.contact_id, { won: 0, total: 0 });
      const entry = dealsByContact.get(d.contact_id)!;
      entry.total++;
      if (d.status === 'won') entry.won++;
    });
    const conversionByTag = Array.from(contactIdsByTag.entries())
      .map(([tagId, contactIds]) => {
        let won = 0;
        let total = 0;
        contactIds.forEach((id) => {
          const entry = dealsByContact.get(id);
          if (entry) {
            won += entry.won;
            total += entry.total;
          }
        });
        return { tagId, name: tagsById.get(tagId) ?? 'Unknown', conversionRate: total > 0 ? won / total : 0, dealCount: total };
      })
      .filter((r) => r.dealCount > 0)
      .sort((a, b) => b.conversionRate - a.conversionRate);

    // ---- Course completion by tag ----
    const { data: enrollments } = await supabase.from('enrollments').select('contact_id, status');
    const enrollmentsByContact = new Map<string, { completed: number; total: number }>();
    (enrollments ?? []).forEach((e) => {
      if (!e.contact_id) return;
      if (!enrollmentsByContact.has(e.contact_id)) enrollmentsByContact.set(e.contact_id, { completed: 0, total: 0 });
      const entry = enrollmentsByContact.get(e.contact_id)!;
      entry.total++;
      if (e.status === 'completed') entry.completed++;
    });
    const courseCompletionByTag = Array.from(contactIdsByTag.entries())
      .map(([tagId, contactIds]) => {
        let completed = 0;
        let total = 0;
        contactIds.forEach((id) => {
          const entry = enrollmentsByContact.get(id);
          if (entry) {
            completed += entry.completed;
            total += entry.total;
          }
        });
        return { tagId, name: tagsById.get(tagId) ?? 'Unknown', completionRate: total > 0 ? completed / total : 0, enrollmentCount: total };
      })
      .filter((r) => r.enrollmentCount > 0)
      .sort((a, b) => b.completionRate - a.completionRate);

    // ---- Tag growth trend (tags added per week, last 12 weeks) ----
    const twelveWeeksAgo = new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: history } = await supabase
      .from('tag_history')
      .select('created_at')
      .eq('workspace_id', workspaceId)
      .eq('action', 'added')
      .gte('created_at', twelveWeeksAgo);
    const growthByWeek = new Map<string, number>();
    (history ?? []).forEach((h) => {
      const date = new Date(h.created_at);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      growthByWeek.set(key, (growthByWeek.get(key) ?? 0) + 1);
    });
    const tagGrowthTrend = Array.from(growthByWeek.entries())
      .map(([week, count]) => ({ week, count }))
      .sort((a, b) => a.week.localeCompare(b.week));

    return {
      success: true,
      data: { mostUsedTags, revenueByTag, conversionByTag, courseCompletionByTag, tagGrowthTrend },
    };
  } catch (err) {
    logger.error({ err, workspaceId }, 'tag_analytics.get.failed');
    return { success: false, error: 'Failed to load tag analytics' };
  }
}
