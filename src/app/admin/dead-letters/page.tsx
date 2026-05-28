import { createClient } from '@/lib/supabase/server';
import DeadLetterPanel from '@/components/admin/DeadLetterPanel';
import { redirect } from 'next/navigation';

export default async function DeadLettersPage() {
  const supabase = await createClient();
  
  // Basic admin auth check (replace with true role check if exists)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login');
  }

  // Fetch initial dead letters
  const { data: deadLetters } = await supabase
    .from('webhook_dead_letters')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(100);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Dead Letter Operations</h1>
          <p className="text-gray-500 mt-2">Manage, replay, and resolve failed webhooks and operational failures.</p>
        </header>
        <DeadLetterPanel initialData={deadLetters || []} />
      </div>
    </div>
  );
}
