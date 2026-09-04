import { getUserAccessInfo, getCurrentWorkspaceId } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getMessageDeliveryLog } from './actions';
import MessageDeliveryPanel from '@/components/admin/MessageDeliveryPanel';

export const dynamic = 'force-dynamic';

// Default window: last 7 days.
function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}

export default async function MessageDeliveryPage() {
  const { role } = await getUserAccessInfo();
  if (!role || !['admin', 'owner'].includes(role)) {
    redirect('/unauthenticated');
  }

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center border border-dash-border p-8 rounded-xl shadow-sm">
          <p className="text-red font-semibold text-lg">No Active Workspace Context</p>
          <p className="text-dash-textMuted text-sm mt-2">Switch to a workspace to view its message delivery log.</p>
        </div>
      </div>
    );
  }

  const initialFrom = defaultFrom();
  const result = await getMessageDeliveryLog({ from: initialFrom });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Message Delivery Log</h1>
          <p className="text-gray-500 mt-2">
            Outbound Instagram / Messenger / WhatsApp sends across this workspace&apos;s inbox — status, retries, and
            failure reasons. Replaces the screen-recording workaround.
          </p>
        </header>
        <MessageDeliveryPanel
          initialRows={'rows' in result ? result.rows : []}
          initialSummary={'summary' in result ? result.summary : null}
          initialFrom={initialFrom}
          loadError={'error' in result ? result.error : null}
        />
      </div>
    </div>
  );
}
