import { createAdminClient } from '@/lib/supabase/server';

/**
 * A short lease prevents two overlapping Vercel invocations of a sweep from
 * publishing the same time-based automation event twice. Queue dispatchers
 * use row-level claims instead; this is for singleton scans.
 */
export async function acquireCronWorkerLock(workerName: string, leaseSeconds: number): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc('acquire_cron_worker_lock', {
    p_worker_name: workerName,
    p_lease_seconds: leaseSeconds,
  });
  if (error) throw error;
  return data === true;
}

export async function releaseCronWorkerLock(workerName: string): Promise<void> {
  const { error } = await createAdminClient().rpc('release_cron_worker_lock', {
    p_worker_name: workerName,
  });
  if (error) throw error;
}
