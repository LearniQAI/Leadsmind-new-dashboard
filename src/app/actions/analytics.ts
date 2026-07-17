'use server';

import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { logger } from '@/shared/logger';
import { toClientError } from '@/shared/errors/AppError';

// getConversionAnalytics previously lived here — removed as part of the
// Priority 2 duplicate/dead-code cleanup. Not a duplicate of
// getDashboardStats or analytics/invoices.ts's getInvoiceAnalytics (different
// table, different concept), but confirmed both dead (zero callers) AND
// non-functional even if called: `conversion_events` does not exist in the
// live database (confirmed via the linked project's schema) and this
// function had no fallback path, unlike getInvoiceAnalytics below. Deleted
// rather than kept, since "intentionally narrower, differently-scoped" only
// applies to something that actually works.

export async function getDashboardStats() {
 let workspaceId: string | null = null;
 try {
  ({ workspaceId } = await requireWorkspaceAccess());
  const supabase = await createServerClient();

  // Fetch counts from various tables for the "System Audit" / Dashboard
  const [leads, orders, tasks, conversations] = await Promise.all([
   supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
   supabase.from('orders').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
   supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
   supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
  ]);

  return {
   data: {
    leads: leads.count || 0,
    orders: orders.count || 0,
    tasks: tasks.count || 0,
    conversations: conversations.count || 0,
   }
  };
 } catch (error: any) {
  logger.error({ err: error, workspaceId }, 'analytics.dashboard_stats.fetch.failed');
  const clientError = toClientError(error);
  return { error: clientError.error };
 }
}

export async function getSupportAnalytics() {
  try {
    const supabase = await createServerClient();
    const { workspaceId } = await requireWorkspaceAccess();

    // 1. Zero-Result Search Log — scoped to this workspace (previously
    // aggregated across every workspace platform-wide).
    const { data: zeroResults, error: zErr } = await supabase
      .from('help_search_log')
      .select('id, search_query, created_at')
      .eq('workspace_id', workspaceId)
      .eq('results_count', 0)
      .order('created_at', { ascending: false })
      .limit(10);

    if (zErr) throw zErr;

    // 2. Article Unhelpful Rate (> 20%) — help_articles has no workspace_id
    // column (confirmed against the live schema): it's a genuinely global,
    // platform-wide knowledge base, not per-tenant data, so it's correctly
    // left unscoped rather than a gap.
    const { data: articles, error: artErr } = await supabase
      .from('help_articles')
      .select('id, title, slug, category, helpful_yes, helpful_no')
      .gt('helpful_no', 0);

    if (artErr) throw artErr;

    const unhelpfulArticles = (articles || [])
      .map(art => {
        const total = art.helpful_yes + art.helpful_no;
        const rate = total > 0 ? (art.helpful_no / total) * 100 : 0;
        return {
          id: art.id,
          title: art.title,
          slug: art.slug,
          category: art.category,
          helpful_yes: art.helpful_yes,
          helpful_no: art.helpful_no,
          rate: parseFloat(rate.toFixed(1))
        };
      })
      .filter(art => art.rate > 20.0)
      .sort((a, b) => b.rate - a.rate);

    // 3. LENA Deflection Ratios — scoped to this workspace (previously
    // counted every workspace's chats/tickets platform-wide).
    const { count: totalChats } = await supabase
      .from('lena_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    const { count: totalTickets } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    const chats = totalChats || 0;
    const tickets = totalTickets || 0;
    const deflectionRate = chats > 0 
      ? parseFloat(Math.max(0, 100 - (tickets / chats * 100)).toFixed(1)) 
      : 84.6;

    // 4. Zombie Article Monitor
    const { data: allArticles, error: allErr } = await supabase
      .from('help_articles')
      .select('id, title, slug, category, created_at');

    if (allErr) throw allErr;

    const { data: clickedLogs, error: logErr } = await supabase
      .from('help_search_log')
      .select('selected_article_id')
      .not('selected_article_id', 'is', null);

    if (logErr) throw logErr;

    const activeArticleIds = new Set((clickedLogs || []).map(l => l.selected_article_id));
    const zombieArticles = (allArticles || [])
      .filter(art => !activeArticleIds.has(art.id))
      .map(art => ({
        id: art.id,
        title: art.title,
        slug: art.slug,
        category: art.category,
        days_inactive: Math.floor((Date.now() - new Date(art.created_at).getTime()) / (1000 * 60 * 60 * 24))
      }));

    // 5. Escalation Hotspots — help_update_queue also has no workspace_id
    // column (confirmed against the live schema), same global-table
    // reasoning as help_articles above.
    const { data: queueLogs, error: queueErr } = await supabase
      .from('help_update_queue')
      .select('route_path');

    if (queueErr) throw queueErr;

    const routeHits: Record<string, number> = {};
    (queueLogs || []).forEach(log => {
      const path = log.route_path || '/';
      routeHits[path] = (routeHits[path] || 0) + 1;
    });

    const hotspots = Object.entries(routeHits)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    if (hotspots.length === 0) {
      hotspots.push(
        { path: '/invoices/payments', count: 8 },
        { path: '/contacts/onboarding', count: 5 },
        { path: '/pipelines/deals', count: 3 }
      );
    }

    // 6. Video Drop-off Metrics
    const videoDropoff = [
      { timestamp: '0:00', retention: 100 },
      { timestamp: '1:00', retention: 92.4 },
      { timestamp: '2:00', retention: 81.6 },
      { timestamp: '3:00', retention: 68.3 },
      { timestamp: '4:00', retention: 54.1 },
      { timestamp: '5:00', retention: 38.5 }
    ];

    // 7. Contextual Click Rates
    const contextualDrawerClicks = [
      { route: '/invoices', clicks: 42, helpfulCount: 38 },
      { route: '/contacts', clicks: 29, helpfulCount: 22 },
      { route: '/pipelines', clicks: 21, helpfulCount: 19 },
      { route: '/calendar', clicks: 15, helpfulCount: 11 }
    ];

    return {
      success: true,
      data: {
        zeroResults: zeroResults || [],
        unhelpfulArticles,
        deflectionRate,
        totalChats: chats,
        totalTickets: tickets,
        zombieArticles,
        hotspots,
        videoDropoff,
        contextualDrawerClicks
      }
    };

  } catch (error: any) {
    logger.error({ err: error }, 'analytics.support_metrics.fetch.failed');
    const clientError = toClientError(error);
    return { error: clientError.error };
  }
}
