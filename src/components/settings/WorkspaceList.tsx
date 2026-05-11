'use client'

import React, { useState } from 'react'
import { createWorkspace } from '@/app/actions/workspace'
import { toast } from 'sonner'
import InputField from '@/components/elements/SharedInputs/InputField'

interface WorkspaceListProps {
 workspaces: any[]
 activeWorkspaceId: string
}

export function WorkspaceList({ workspaces, activeWorkspaceId }: WorkspaceListProps) {
 const [newWorkspaceName, setNewWorkspaceName] = useState('')
 const [isCreating, setIsCreating] = useState(false)

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

 return (
  <div className="card__wrapper">
   <div className="card__title-wrap mb-[20px] flex justify-between items-center">
    <h5 className="card__heading-title">Workspace Access</h5>
   </div>

   <div className="grid grid-cols-12 gap-x-6 gap-y-6 mb-8">
    {workspaces.map((ws) => (
     <div key={ws.id} className="col-span-12 md:col-span-6 lg:col-span-4">
      <div className={`p-[20px] rounded-[10px] border ${ws.id === activeWorkspaceId ? 'border-primary bg-primary/5' : 'border-border'}`}>
       <div className="flex items-center justify-between mb-2">
        <h6 className="mb-0">{ws.name}</h6>
        {ws.id === activeWorkspaceId && (
         <span className="badge badge-primary">Active</span>
        )}
       </div>
       <p className="text-muted small mb-0 uppercase tracking-wider">{ws.role || 'Member'}</p>
      </div>
     </div>
    ))}
   </div>

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

