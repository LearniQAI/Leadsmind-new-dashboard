'use client';

import { useState } from 'react';
import { Workspace } from '@/types/workspace.types';
import { Loader2, ChevronRight } from 'lucide-react';

interface WorkspacePickerProps {
  workspaces: (Workspace & { role: string })[];
  onSelect: (workspace: Workspace) => void;
}

export function WorkspacePicker({ workspaces, onSelect }: WorkspacePickerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function getInitials(name: string) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  const handleSelect = (workspace: Workspace) => {
    setSelectedId(workspace.id);
    onSelect(workspace);
  };

  return (
    <div className="w-full">
      <div className="space-y-1 pb-8 text-center">
        <h3 className="text-2xl font-extrabold tracking-tight">Pick a workspace</h3>
        <p className="text-sm font-light opacity-60">
          Select where you want to continue your work today.
        </p>
      </div>
      
      <div className="space-y-3">
        {workspaces.map((workspace) => (
          <button
            key={workspace.id}
            disabled={selectedId !== null}
            onClick={() => handleSelect(workspace)}
            className={`group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border p-4 transition-all duration-300 ${
              selectedId === workspace.id 
                ? 'border-primary bg-primary/10 shadow-lg' 
                : 'border-gray-100 hover:border-primary/30 hover:bg-gray-50 hover:-translate-y-0.5'
            }`}
          >
            <div className="h-12 w-12 flex items-center justify-center rounded-full bg-primary text-white font-bold text-sm overflow-hidden shrink-0">
              {workspace.logoUrl ? (
                <img src={workspace.logoUrl} alt={workspace.name} className="h-full w-full object-cover" />
              ) : (
                getInitials(workspace.name)
              )}
            </div>

            <div className="flex flex-col items-start overflow-hidden text-left">
              <span className="w-full truncate text-[0.95rem] font-bold tracking-tight">
                {workspace.name}
              </span>
              <span className="text-[0.7rem] font-medium uppercase tracking-wider opacity-40 group-hover:text-primary transition-colors">
                {workspace.role === 'admin' ? 'Workspace Owner' : workspace.role}
              </span>
            </div>

            <div className="ml-auto">
              {selectedId === workspace.id ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <ChevronRight className="h-4 w-4 opacity-20 group-hover:text-primary transition-all group-hover:translate-x-0.5" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
