import React from 'react';
import { createAdminClient } from '@/lib/supabase/server';
import RegisterForm from './RegisterForm';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: {
    workspace?: string;
    programmeId?: string;
  };
}

export default async function AffiliateRegisterPage({ searchParams }: PageProps) {
  const supabase = createAdminClient();
  const workspaceSlug = searchParams.workspace;
  const programmeId = searchParams.programmeId;

  let activeProgrammes: any[] = [];
  let resolvedWorkspaceId: string | null = null;

  if (workspaceSlug) {
    const { data: ws } = await supabase
      .from('workspaces')
      .select('id')
      .eq('slug', workspaceSlug)
      .maybeSingle();
    if (ws) {
      resolvedWorkspaceId = ws.id;
    }
  } else if (programmeId) {
    const { data: prog } = await supabase
      .from('affiliate_programmes')
      .select('workspace_id')
      .eq('id', programmeId)
      .maybeSingle();
    if (prog) {
      resolvedWorkspaceId = prog.workspace_id;
    }
  }

  if (resolvedWorkspaceId) {
    // Fetch active programmes for this workspace only
    const { data: programmes } = await supabase
      .from('affiliate_programmes')
      .select('id, name, commission_value, commission_type, registration_settings')
      .eq('workspace_id', resolvedWorkspaceId)
      .eq('status', 'active');

    if (programmes) {
      if (!workspaceSlug && programmeId) {
        // If no workspace slug parameter is provided, show only the specific programme from ?programmeId
        activeProgrammes = programmes.filter((p) => p.id === programmeId);
      } else {
        activeProgrammes = programmes;
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <span className="text-3xl font-extrabold text-blue-500 tracking-wider">
            LEADS<span className="text-white">MIND</span>
          </span>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
          Become a Partner
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Or{' '}
          <a href="/affiliate-portal/login" className="font-medium text-blue-500 hover:text-blue-400 transition-colors">
            sign in to your dashboard
          </a>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {activeProgrammes.length === 0 ? (
          <div className="bg-slate-900 py-8 px-4 shadow-2xl border border-slate-800 sm:rounded-2xl sm:px-10 text-center text-slate-400 text-sm">
            There are currently no active affiliate programmes available. Please check back later.
          </div>
        ) : (
          <RegisterForm programmes={activeProgrammes} />
        )}
      </div>
    </div>
  );
}
