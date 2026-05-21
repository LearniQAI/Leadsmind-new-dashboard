export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired'
export type FormRole = 'editor' | 'viewer'
export type WorkspaceRole = 'admin' | 'member' | 'client'
export type NotificationType = 'message' | 'contact' | 'deal' | 'system' | 'team'

export interface FormCollaborator {
  id: string
  formId: string
  email: string
  role: FormRole
  status: InviteStatus
  invitedBy: string
  invitedByEmail?: string
  createdAt: string
  updatedAt?: string
  formName?: string
  formStatus?: string
}

export interface WorkspaceInvitation {
  id: string
  workspaceId: string
  email: string
  role: WorkspaceRole
  invitedBy: string
  createdAt: string
  expiresAt: string
  status: InviteStatus
}

export interface CollaborationNotification {
  id: string
  workspaceId: string
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
  read: boolean
  createdAt: string
}

export interface InviteActionResponse {
  success?: boolean
  error?: string
  warning?: string
  data?: any
}

export interface UserCollaboration {
  id: string
  role: FormRole
  status: InviteStatus
  createdAt: string
  formId: string
  formName: string
  formStatus: string
  invitedByEmail?: string
  email?: string
}

export interface PresenceUser {
  email: string
  name: string
  initials: string
  color?: string
  locked?: boolean
}
