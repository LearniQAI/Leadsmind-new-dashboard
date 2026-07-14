import React from 'react';
import { Loader2 } from 'lucide-react';
import {
  DashModal, DashModalContent, DashModalHeader, DashModalTitle, DashModalFooter
} from '@/components/dashboard-ui/Modal';
import { DashFormField, DashInput } from '@/components/dashboard-ui/FormField';
import { DashButton } from '@/components/dashboard-ui/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface CreateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  setName: (name: string) => void;
  creating: boolean;
  onSubmit: () => void;
}

export function CreateFormDialog({
  open,
  onOpenChange,
  name,
  setName,
  creating,
  onSubmit
}: CreateFormDialogProps) {
  return (
    <DashModal open={open} onOpenChange={onOpenChange}>
      <DashModalContent className="max-w-md">
        <DashModalHeader>
          <DashModalTitle>
            Build a <span className="text-dash-accent">form</span>
          </DashModalTitle>
        </DashModalHeader>
        <div className="space-y-4">
          <DashFormField label="Form name">
            <DashInput
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Contact Us Form"
              className="h-12"
              onKeyDown={e => e.key === 'Enter' && onSubmit()}
            />
          </DashFormField>
        </div>
        <DashModalFooter>
          <DashButton variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </DashButton>
          <DashButton onClick={onSubmit} disabled={creating}>
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Creating...
              </>
            ) : 'Create form'}
          </DashButton>
        </DashModalFooter>
      </DashModalContent>
    </DashModal>
  );
}

interface EditFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  setName: (name: string) => void;
  form: any;
  saving: boolean;
  onSubmit: () => void;
  onPublishToggle: () => void;
}

export function EditFormDialog({
  open,
  onOpenChange,
  name,
  setName,
  form,
  saving,
  onSubmit,
  onPublishToggle
}: EditFormDialogProps) {
  return (
    <DashModal open={open} onOpenChange={onOpenChange}>
      <DashModalContent className="max-w-md">
        <DashModalHeader>
          <DashModalTitle>
            Edit <span className="text-dash-accent">form</span>
          </DashModalTitle>
        </DashModalHeader>
        <div className="space-y-4">
          <DashFormField label="Form name">
            <DashInput
              value={name}
              onChange={e => setName(e.target.value)}
              className="h-12"
            />
          </DashFormField>
          <div className="p-4 bg-dash-surface border border-dash-border rounded-xl">
            <p className="text-[11px] font-bold !text-dash-textMuted mb-1">
              Current status
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold !text-dash-text">
                {form?.status === 'published' ? 'Live — visible to users' : 'Draft — not public'}
              </span>
              <DashButton
                onClick={onPublishToggle}
                size="sm"
                className={form?.status === 'published' ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-green/10 text-green hover:bg-green/20'}
              >
                {form?.status === 'published' ? 'Unpublish' : 'Publish'}
              </DashButton>
            </div>
          </div>
        </div>
        <DashModalFooter>
          <DashButton variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </DashButton>
          <DashButton onClick={onSubmit} disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </DashButton>
        </DashModalFooter>
      </DashModalContent>
    </DashModal>
  );
}

interface DeleteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: any;
  deleting: boolean;
  onSubmit: () => void;
}

export function DeleteFormDialog({
  open,
  onOpenChange,
  form,
  deleting,
  onSubmit
}: DeleteFormDialogProps) {
  return (
    <ConfirmDialog
      isOpen={open}
      onClose={() => onOpenChange(false)}
      onConfirm={onSubmit}
      title="Delete form?"
      description={`This will permanently delete "${form?.name}" and all its submissions.`}
      confirmLabel={deleting ? 'Deleting...' : 'Delete'}
      variant="danger"
    />
  );
}
