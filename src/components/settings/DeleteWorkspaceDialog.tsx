'use client';

import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { deleteWorkspace } from '@/app/actions/workspace';
import { DashButton } from '@/components/dashboard-ui/Button';

interface DeleteWorkspaceDialogProps {
  isOpen: boolean;
  workspaceName: string;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteWorkspaceDialog({ isOpen, workspaceName, onClose, onDeleted }: DeleteWorkspaceDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const matches = confirmText === workspaceName;

  const handleClose = () => {
    if (isDeleting) return;
    setConfirmText('');
    onClose();
  };

  const handleDelete = async () => {
    if (!matches) return;
    setIsDeleting(true);
    try {
      const result = await deleteWorkspace(confirmText);
      if (result.success) {
        toast.success('Workspace deleted');
        setConfirmText('');
        onDeleted();
      } else {
        toast.error(result.error || 'Failed to delete workspace');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1001] bg-dash-text/40 backdrop-blur-sm animate-in fade-in duration-300 motion-reduce:animate-none" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[1002] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white border border-dash-border p-6 shadow-xl animate-in zoom-in-95 fade-in duration-300 motion-reduce:animate-none max-h-[90vh] overflow-y-auto">
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-red/10 text-red">
              <AlertTriangle size={22} strokeWidth={2} />
            </div>

            <Dialog.Title className="text-[17px] font-bold !text-dash-text mb-2">
              Delete "{workspaceName}"?
            </Dialog.Title>

            <Dialog.Description className="text-[13.5px] !text-dash-textMuted mb-5 leading-relaxed">
              This permanently deletes the workspace and everything in it — contacts, invoices,
              retainers, credit notes, courses, campaigns, team access, and all other workspace
              data. This cannot be undone. Workspaces with an active paid subscription can't be
              deleted until billing is cancelled or downgraded first.
            </Dialog.Description>

            <div className="w-full text-left mb-5">
              <label className="block text-[12px] font-semibold !text-dash-text mb-1.5">
                Type <span className="font-mono !text-dash-accent">{workspaceName}</span> to confirm
              </label>
              <input
                autoFocus
                className="form-control h-[42px] text-[14px] !text-dash-text w-full"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={workspaceName}
                disabled={isDeleting}
              />
            </div>

            <div className="flex w-full gap-3">
              <DashButton variant="secondary" size="default" className="flex-1" onClick={handleClose} disabled={isDeleting}>
                Cancel
              </DashButton>
              <DashButton
                variant="destructive"
                size="default"
                className="flex-1"
                onClick={handleDelete}
                disabled={!matches || isDeleting}
              >
                {isDeleting ? 'Deleting…' : 'Delete Workspace'}
              </DashButton>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
