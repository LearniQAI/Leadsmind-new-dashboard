import { NextRequest, NextResponse } from 'next/server'
import { getUser, getCurrentWorkspaceId } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { UnauthorizedError, ForbiddenError, NotFoundError, toClientError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logger'
import { getRequestId } from '@/shared/logger/requestId'
import { createStepTimer, logRequestComplete } from '@/shared/logger/requestTiming'

export const dynamic = 'force-dynamic';

const ALLOWED_INVENTORY_ROLES = ['admin', 'owner'];

// Resolves the authenticated user's active workspace from their session cookie, confirms
// real membership, and requires an admin/owner role (same restriction as Payroll) — a
// client-supplied workspaceId in query/body is never trusted. Returns an RLS-respecting
// client scoped to the caller's own session, so cross-tenant access is structurally blocked
// at the database layer as well, not just here.
async function resolveWorkspace(userId: string, existingClient?: Awaited<ReturnType<typeof createServerClient>>) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    throw new ForbiddenError('No active workspace selected');
  }

  const supabaseUser = existingClient ?? await createServerClient();
  const { data: membership } = await supabaseUser
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!membership) {
    throw new ForbiddenError('You are not a member of the active workspace');
  }

  if (!ALLOWED_INVENTORY_ROLES.includes(membership.role)) {
    throw new ForbiddenError('Only workspace admins or owners can access inventory data');
  }

  return { workspaceId, supabase: supabaseUser };
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) throw new UnauthorizedError();

    const { workspaceId, supabase } = await resolveWorkspace(user.id);

    const search = req.nextUrl.searchParams.get('search')
    const category = req.nextUrl.searchParams.get('category')

    let query = supabase
      .from('inventory_items')
      .select('*')
      .eq('workspace_id', workspaceId)

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    const { data, error } = await query.order('name', { ascending: true })

    if (error) throw error;
    return NextResponse.json({ inventoryItems: data ?? [] })
  } catch (err: any) {
    logger.error({ err }, 'inventory.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

// Fields a client is actually allowed to set — workspace_id is always derived server-side.
const WRITABLE_FIELDS = [
  'name', 'sku', 'description', 'category', 'unit',
  'quantity_in_stock', 'reorder_level', 'cost_price', 'selling_price', 'supplier', 'status'
] as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req.headers);
  const timer = createStepTimer();
  let workspaceIdForLog: string | null = null;
  let userIdForLog: string | null = null;
  let status = 200;

  try {
    // The session lookup, the Supabase client and the body parse are independent of each
    // other; the membership check and the insert both depend on them, so they stay serial.
    const [user, supabaseClient, body] = await Promise.all([
      getUser(),
      createServerClient(),
      req.json().catch(() => null),
    ]);
    if (!user) throw new UnauthorizedError();
    userIdForLog = user.id;

    const { workspaceId, supabase } = await resolveWorkspace(user.id, supabaseClient);
    workspaceIdForLog = workspaceId;
    timer.mark('auth_workspace_resolve');

    if (!body || typeof body !== 'object') {
      status = 400;
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const insertData: Record<string, unknown> = {};
    for (const field of WRITABLE_FIELDS) {
      if (field in body) insertData[field] = body[field];
    }
    // workspace_id is never taken from the client body, regardless of what it claims
    insertData.workspace_id = workspaceId;

    // Idempotency key: one per "Add item" modal session, re-sent on every retry/double-submit.
    const clientOperationId = body.client_operation_id;
    if (clientOperationId !== undefined && clientOperationId !== null) {
      if (typeof clientOperationId !== 'string' || !UUID_RE.test(clientOperationId)) {
        status = 400;
        return NextResponse.json({ error: 'client_operation_id must be a UUID' }, { status: 400 });
      }
      insertData.client_operation_id = clientOperationId;
    }

    const { data, error } = await supabase
      .from('inventory_items')
      .insert(insertData)
      .select()
      .single()
    timer.mark('inventory_insert');

    if (error) {
      // A repeat of an operation that already succeeded: return the original row, don't insert.
      if (error.code === '23505' && typeof insertData.client_operation_id === 'string') {
        const { data: existing } = await supabase
          .from('inventory_items')
          .select()
          .eq('workspace_id', workspaceId)
          .eq('client_operation_id', insertData.client_operation_id)
          .maybeSingle();
        timer.mark('idempotent_replay');
        if (existing) return NextResponse.json({ success: true, inventoryItem: existing, replayed: true });
      }
      throw error;
    }
    return NextResponse.json({ success: true, inventoryItem: data })
  } catch (err: any) {
    logger.error({ err }, 'inventory.post.failed');
    const clientError = toClientError(err);
    status = clientError.status;
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  } finally {
    logRequestComplete({
      requestId,
      route: '/api/inventory',
      method: 'POST',
      status,
      durationMs: timer.totalMs(),
      steps: timer.steps(),
      workspaceId: workspaceIdForLog,
      userId: userIdForLog,
    });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) throw new UnauthorizedError();

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { workspaceId, supabase } = await resolveWorkspace(user.id);

    const body = await req.json()
    const updates: Record<string, unknown> = {};
    for (const field of WRITABLE_FIELDS) {
      if (field in body) updates[field] = body[field];
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('inventory_items')
      .update(updates)
      .eq("id", id).eq("workspace_id", workspaceId)
      .select()
      .maybeSingle()

    if (error) throw error;
    if (!data) throw new NotFoundError('Inventory item');
    return NextResponse.json({ success: true, inventoryItem: data })
  } catch (err: any) {
    logger.error({ err }, 'inventory.patch.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) throw new UnauthorizedError();

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { workspaceId, supabase } = await resolveWorkspace(user.id);

    const { data, error } = await supabase.from('inventory_items').delete().eq("id", id).eq("workspace_id", workspaceId).select('id')
    if (error) throw error;
    if (!data || data.length === 0) throw new NotFoundError('Inventory item');
    return NextResponse.json({ success: true })
  } catch (err: any) {
    logger.error({ err }, 'inventory.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
