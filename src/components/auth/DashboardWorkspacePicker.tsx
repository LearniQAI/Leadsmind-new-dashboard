'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { WorkspacePicker } from '@/components/auth/WorkspacePicker';
import { setActiveWorkspace } from '@/app/actions/auth';
import type { Workspace } from '@/types/workspace.types';

interface DashboardWorkspacePickerProps {
 workspaces: (Workspace & { role: string })[];
}

export function DashboardWorkspacePicker({ workspaces }: DashboardWorkspacePickerProps) {
 const router = useRouter();

 const handleSelect = async (workspace: Workspace) => {
  try {
   const result = await setActiveWorkspace(workspace.id);
   if (!result.success) {
    toast.error(result.error || 'Unable to set your workspace. Please try again.');
    return;
   }
   router.replace('/dashboard');
   router.refresh();
  } catch (error) {
   console.error('[DashboardWorkspacePicker] Failed to set workspace:', error);
   toast.error('Unable to set your workspace. Please try again.');
  }
 };

 return (
  <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center px-6 py-12">
   <WorkspacePicker workspaces={workspaces} onSelect={handleSelect} />
  </div>
 );
}