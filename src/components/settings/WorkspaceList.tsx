'use client'

import React, { useState } from 'react'
import { createWorkspace, updateWorkspace, deleteWorkspace } from '@/app/actions/workspace'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Pencil, Check, X, Trash2 } from 'lucide-react'
import InputField from '@/components/elements/SharedInputs/InputField'
import { DeleteWorkspaceDialog } from './DeleteWorkspaceDialog'

interface WorkspaceListProps {
 workspaces: any[]
 activeWorkspaceId: string
}

export function WorkspaceList({ workspaces, activeWorkspaceId }: WorkspaceListProps) {
 const router = useRouter()
 const [newWorkspaceName, setNewWorkspaceName] = useState('')
 const [isCreating, setIsCreating] = useState(false)

 const [editingId, setEditingId] = useState<string | null>(null)
 const [editName, setEditName] = useState('')
 const [isSavingName, setIsSavingName] = useState(false)

 const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

 const handleCreate = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!newWorkspaceName.trim()) return

  setIsCreating(true)
  try {
   const result = await createWorkspace(newWorkspaceName)
   if (result.success) {
    toast.success('Workspace created successfully! 🏢')
    setNewWorkspaceName('')
   } else {
    toast.error(result.error || 'Failed to create workspace')
   }
  } catch {
   toast.error('An error occurred')
  } finally {
   setIsCreating(false)
  }
 }

 const startEditing = (ws: any) => {
  setEditingId(ws.id)
  setEditName(ws.name)
 }

 const cancelEditing = () => {
  setEditingId(null)
  setEditName('')
 }

 const handleSaveName = async () => {
  if (!editName.trim()) {
   toast.error('Workspace name cannot be empty')
   return
  }
  setIsSavingName(true)
  try {
   const result = await updateWorkspace(editName)
   if (result.success) {
    toast.success('Workspace renamed')
    setEditingId(null)
    router.refresh()
   } else {
    toast.error(result.error || 'Failed to rename workspace')
   }
  } finally {
   setIsSavingName(false)
  }
 }

 return (
  <div className="dash-account-card">
   <div className="card__title-wrap mb-[20px] flex justify-between items-center">
    <h5 className="card__heading-title">Workspace Access</h5>
   </div>

   <div className="grid grid-cols-12 gap-x-6 gap-y-6 mb-8">
    {workspaces.map((ws) => {
     const isActive = ws.id === activeWorkspaceId
     // updateWorkspace/deleteWorkspace resolve the target workspace from the
     // caller's session (active_workspace_id), never a client-supplied id, so
     // edit/delete controls can only safely act on the active workspace's card.
     const canManage = isActive && ws.role === 'admin'
     const isEditing = editingId === ws.id

     return (
      <div key={ws.id} className="col-span-12 md:col-span-6 lg:col-span-4">
       <div className={`p-[20px] rounded-[10px] border ${isActive ? 'border-primary bg-primary/5' : 'border-border'}`}>
        <div className="flex items-center justify-between mb-2 gap-2">
         {isEditing ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
           <input
            autoFocus
            className="form-control h-[34px] text-[14px] !text-dash-text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            maxLength={100}
            disabled={isSavingName}
           />
           <button
            type="button"
            onClick={handleSaveName}
            disabled={isSavingName}
            className="text-green flex-shrink-0"
            aria-label="Save workspace name"
           >
            <Check size={18} />
           </button>
           <button
            type="button"
            onClick={cancelEditing}
            disabled={isSavingName}
            className="!text-dash-textMuted flex-shrink-0"
            aria-label="Cancel"
           >
            <X size={18} />
           </button>
          </div>
         ) : (
          <>
           <h6 className="mb-0 !text-dash-text truncate">{ws.name}</h6>
           <div className="flex items-center gap-2 flex-shrink-0">
            {isActive && <span className="badge badge-primary">Active</span>}
            {canManage && (
             <button
              type="button"
              onClick={() => startEditing(ws)}
              className="!text-dash-textMuted hover:!text-dash-accent"
              aria-label="Rename workspace"
             >
              <Pencil size={14} />
             </button>
            )}
           </div>
          </>
         )}
        </div>
        <div className="flex items-center justify-between">
         <p className="text-muted small mb-0 uppercase tracking-wider !text-dash-textMuted">{ws.role || 'Member'}</p>
         {canManage && !isEditing && (
          <button
           type="button"
           onClick={() => setDeleteTarget({ id: ws.id, name: ws.name })}
           className="flex items-center gap-1 text-[11px] font-semibold text-red hover:opacity-80"
          >
           <Trash2 size={12} /> Delete
          </button>
         )}
        </div>
       </div>
      </div>
     )
    })}
   </div>

   <DeleteWorkspaceDialog
    isOpen={!!deleteTarget}
    workspaceName={deleteTarget?.name || ''}
    onClose={() => setDeleteTarget(null)}
    onDeleted={() => {
     setDeleteTarget(null)
     router.refresh()
    }}
   />

   <div className="border-t border-border pt-6">
    <div className="card__title-wrap mb-[20px]">
     <h6 className="card__heading-title">Create New Workspace</h6>
    </div>
    
    <form onSubmit={handleCreate} className="flex flex-col sm:flex-row items-end gap-4 mt-2">
     <div className="form__input-box flex-1">
      <div className="form__input-title">
       <label htmlFor="newWsName">Workspace Name</label>
      </div>
      <div className="form__input">
       <input
        id="newWsName"
        className="form-control"
        placeholder="e.g. Acme Corp"
        value={newWorkspaceName}
        onChange={(e) => setNewWorkspaceName(e.target.value)}
        required
       />
      </div>
     </div>
     <button className="btn btn-primary h-[48px]" type="submit" disabled={isCreating}>
      {isCreating ? 'Creating...' : 'Create Workspace'}
     </button>
    </form>
   </div>
  </div>
 )
}

