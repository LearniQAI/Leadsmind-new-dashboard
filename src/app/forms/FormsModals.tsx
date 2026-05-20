import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border border-gray-200 rounded-3xl max-w-md p-8 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase tracking-tight text-gray-800">Build a <span className="text-primary">Form</span></DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Form Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Contact Us Form" className="h-12 border-gray-200 rounded-xl" onKeyDown={e => e.key === 'Enter' && onSubmit()} />
          </div>
        </div>
        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-gray-200 text-gray-600 rounded-xl">Cancel</Button>
          <Button onClick={onSubmit} disabled={creating} className="btn-primary rounded-xl font-black uppercase text-xs px-8">
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...
              </>
            ) : 'Create Form'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border border-gray-200 rounded-3xl max-w-md p-8 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase tracking-tight text-gray-800">Edit <span className="text-primary">Form</span></DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Form Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="h-12 border-gray-200 rounded-xl" />
          </div>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Current Status</p>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-blue-800">{form?.status === 'published' ? 'Live — visible to users' : 'Draft — not public'}</span>
              <Button onClick={onPublishToggle} size="sm" className={`h-8 px-4 rounded-lg text-[9px] font-black uppercase ${form?.status === 'published' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                {form?.status === 'published' ? 'Unpublish' : 'Publish'}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-gray-200 text-gray-600 rounded-xl">Cancel</Button>
          <Button onClick={onSubmit} disabled={saving} className="btn-primary rounded-xl font-black uppercase text-xs px-8">{saving ? 'Saving...' : 'Save Changes'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border border-gray-200 rounded-3xl max-w-sm p-8 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight text-gray-800">Delete Form?</DialogTitle>
        </DialogHeader>
        <p className="text-gray-500 text-sm py-4">This will permanently delete <strong className="text-gray-800">{form?.name}</strong> and all its submissions.</p>
        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-gray-200 text-gray-600 rounded-xl">Cancel</Button>
          <Button onClick={onSubmit} disabled={deleting} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase text-xs px-8">{deleting ? 'Deleting...' : 'Delete'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
