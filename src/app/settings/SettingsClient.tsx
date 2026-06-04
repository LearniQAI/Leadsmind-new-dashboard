"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Globe, Users, Palette, Code2, CreditCard, ShieldCheck, Monitor, Zap, Activity, FileSignature, Target, BarChart3, TrendingUp, Settings as SettingsIcon, Sparkles, Brain
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { createClient } from '@/lib/supabase/client';

import useGlobalContext from "@/hooks/use-context";
import { useDirection } from "@/hooks/useDirection";
import {
  inviteTeamMember,
  updateWorkspaceBranding,
  createWebhook,
  getWorkspaceApiKey,
  generateWorkspaceApiKey,
  updateWorkspaceLogo,
  updateMemberPermissions,
  removeInvitation,
  deleteMember
} from '@/app/actions/settings';

// Components
import SettingsSidebar from './components/SettingsSidebar';
import SettingsHeader from './components/SettingsHeader';
import WorkspaceTab from './components/tabs/WorkspaceTab';
import TeamTab from './components/tabs/TeamTab';
import BrandingTab from './components/tabs/BrandingTab';
import ApiTab from './components/tabs/ApiTab';
import BillingTab from './components/tabs/BillingTab';
import SecurityTab from './components/tabs/SecurityTab';
import AppearanceTab from './components/tabs/AppearanceTab';
import DomainsTab from './components/tabs/DomainsTab';
import AiTab from './components/tabs/AiTab';
import AiCreditsTab from './components/tabs/AiCreditsTab';

// Modals
import InviteModal from './components/modals/InviteModal';
import EditMemberModal from './components/modals/EditMemberModal';
import SeoTab from './components/tabs/SeoTab';
import { IntegrationsList } from '@/components/settings/IntegrationsList';


interface SettingsClientProps {
  branding: any;
  members: any[];
  invitations: any[];
  webhooks: any[];
  auditData: any;
}

export default function SettingsClient({
  branding,
  members,
  invitations = [],
  webhooks,
  auditData
}: SettingsClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const { theme, toggleTheme } = useGlobalContext();
  const { direction, toggleDirection } = useDirection();

  // State
  const [activeTab, setActiveTab] = useState('team');
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState(branding?.primary_color || '#2563eb');

  // Modals State
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteMode, setInviteMode] = useState<'invite' | 'create'>('invite');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(['dashboard']);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [editRole, setEditRole] = useState('member');
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const PERMISSION_MODULES = [
    { id: 'dashboard', label: 'Dashboard', icon: Zap },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'pipelines', label: 'Pipelines', icon: Activity },
    { id: 'proposals', label: 'Proposals', icon: FileSignature },
    { id: 'invoices', label: 'Invoices', icon: CreditCard },
    { id: 'marketing', label: 'Marketing', icon: Target },
    { id: 'commerce', label: 'Commerce & Ops', icon: CreditCard },
    { id: 'business', label: 'Business Ops', icon: Globe },
    { id: 'learning', label: 'Learning & Courses', icon: Brain },
    { id: 'automation', label: 'Automations', icon: Zap },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const menuItems = [
    { id: 'workspace', label: 'Workspace', icon: Globe, description: 'Neural configuration & identity' },
    { id: 'team', label: 'Team Node', icon: Users, description: 'Manage access protocols' },
    { id: 'branding', label: 'Branding', icon: Palette, description: 'Interface identity markers' },
    { id: 'integrations', label: 'Messaging Connections', icon: Zap, description: 'Connect Meta & platform channels' },
    { id: 'ai', label: 'AI Voice Profile', icon: Sparkles, description: 'Neural voice & templates' },
    { id: 'ai-credits', label: 'AI Credit Ledger', icon: Brain, description: 'Token balance & consumption' },
    { id: 'domains', label: 'Domains', icon: ShieldCheck, description: 'Email verification & security' },
    { id: 'seo', label: 'SEO Settings', icon: TrendingUp, description: 'Google Search Console sync' },
    { id: 'api', label: 'Developer', icon: Code2, description: 'API keys, webhooks & SDK' },
    { id: 'pricing', label: 'Billing', icon: CreditCard, description: 'Resource allocation' },
    { id: 'audit', label: 'Security', icon: ShieldCheck, description: 'Audit logs & integrity' },
    { id: 'appearance', label: 'Appearance', icon: Monitor, description: 'Visual preferences' },
  ];

  // Effects
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab) {
        setActiveTab(tab);
      }

      const success = params.get('success');
      if (success === 'gsc_connected') {
        toast.success('Google Search Console connected successfully!');
        window.history.replaceState({}, '', window.location.pathname + '?tab=seo');
      } else if (success) {
        toast.success(success.replace(/_/g, ' '));
        window.history.replaceState({}, '', window.location.pathname + `?tab=${tab || 'team'}`);
      }

      const error = params.get('error');
      if (error === 'gsc_auth_failed') {
        toast.error('Failed to authenticate with Google Search Console.');
        window.history.replaceState({}, '', window.location.pathname + '?tab=seo');
      } else if (error) {
        toast.error(error.replace(/_/g, ' '));
        window.history.replaceState({}, '', window.location.pathname + `?tab=${tab || 'team'}`);
      }
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'api') {
      getWorkspaceApiKey().then(res => {
        if (res.data) setApiKey(res.data);
      });
    }
  }, [activeTab]);

  // Handlers
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    toast.success('Copied to clipboard');
  };

  const handleSaveWorkspace = async (name: string) => {
    setIsSaving(true);
    const res = await updateWorkspaceBranding({ platform_name: name });
    if (res.error) toast.error(res.error);
    else {
      toast.success('Workspace settings saved');
      router.refresh();
    }
    setIsSaving(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `logo-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('branding')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('branding')
        .getPublicUrl(filePath);

      const res = await updateWorkspaceLogo(publicUrl);
      if (res.error) throw new Error(res.error);

      toast.success('Logo updated successfully');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload logo');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBranding = async () => {
    setIsSaving(true);
    const res = await updateWorkspaceBranding({ primary_color: primaryColor });
    if (res.error) toast.error(res.error);
    else {
      document.documentElement.style.setProperty('--primary-color', primaryColor);
      toast.success('Neural branding colors synced globally');
      router.refresh();
    }
    setIsSaving(false);
  };

  const handleRegenerateKey = async () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Regenerate API Key?',
      description: 'Regenerating the API key will break existing integrations. Continue?',
      confirmLabel: 'Regenerate',
      onConfirm: async () => {
        const res = await generateWorkspaceApiKey();
        if (res.data) {
          setApiKey(res.data);
          toast.success('API Key regenerated');
        }
      }
    });
  };

  const handleNewWebhook = async () => {
    const workspaceId = branding?.workspace_id || 'default';
    const url = `${window.location.origin}/api/webhooks/incoming?workspace_id=${workspaceId}`;

    const res = await createWebhook(url, ['lead.created', 'order.completed', 'chat.started']);
    if (res.error) toast.error(res.error);
    else {
      toast.success('Neural Webhook endpoint generated successfully');
      router.refresh();
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setIsSaving(true);
    let res;
    if (inviteMode === 'invite') {
      res = await inviteTeamMember(inviteEmail, inviteRole, selectedPermissions);
    } else {
      if (!inviteName || !invitePassword) {
        toast.error('Please fill in all details for direct creation');
        setIsSaving(false);
        return;
      }
      res = await inviteTeamMember(inviteEmail, inviteRole, selectedPermissions, {
        directCreate: true,
        fullName: inviteName,
        password: invitePassword
      });
    }

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(inviteMode === 'invite' ? `Invitation sent to ${inviteEmail}` : `Member created successfully`);
      setIsInviteOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInvitePassword('');
      setSelectedPermissions(['dashboard']);
      router.refresh();
    }
    setIsSaving(false);
  };

  const handleUpdatePermissions = async () => {
    if (!editingMember) return;
    setIsSaving(true);
    const res = await updateMemberPermissions(editingMember.id, editRole, editPermissions);
    setIsSaving(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Permissions updated successfully');
      setIsEditModalOpen(false);
      router.refresh();
    }
  };

  const currentMenu = menuItems.find(m => m.id === activeTab);

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-160px)]">
      <SettingsSidebar
        menuItems={menuItems}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <div className="flex-1 min-w-0 bg-[#04091a] relative overflow-y-auto">
        <SettingsHeader
          title={currentMenu?.label || ''}
          description={currentMenu?.description || ''}
        />

        <div className="p-8 max-w-4xl mx-auto">
          {activeTab === 'workspace' && (
            <WorkspaceTab
              branding={branding}
              isSaving={isSaving}
              onSave={handleSaveWorkspace}
              onCopy={copyToClipboard}
              copiedId={copied}
            />
          )}

          {activeTab === 'team' && (
            <TeamTab
              members={members}
              invitations={invitations}
              onInviteClick={() => setIsInviteOpen(true)}
              onEditMember={(member) => {
                setEditingMember(member);
                setEditRole(member.role || 'member');
                setEditPermissions(member.permissions || ['dashboard']);
                setIsEditModalOpen(true);
              }}
              onDeleteMember={async (member) => {
                setConfirmConfig({
                  isOpen: true,
                  title: 'Remove Member?',
                  description: `Remove ${member.user?.email || 'this member'} from the workspace?`,
                  confirmLabel: 'Remove',
                  onConfirm: async () => {
                    const res = await deleteMember(member.id);
                    if (res.error) { toast.error(res.error); return; }
                    toast.success('Member removed');
                    router.refresh();
                  }
                });
              }}
              onDeleteInvitation={async (invite) => {
                setConfirmConfig({
                  isOpen: true,
                  title: 'Revoke Access?',
                  description: `Remove access for ${invite.email}?`,
                  confirmLabel: 'Revoke',
                  onConfirm: async () => {
                    const res = await removeInvitation(invite.id);
                    if (res.error) { toast.error(res.error); return; }
                    toast.success('Access removed');
                    router.refresh();
                  }
                });
              }}
            />
          )}

          {activeTab === 'branding' && (
            <BrandingTab
              branding={branding}
              primaryColor={primaryColor}
              setPrimaryColor={setPrimaryColor}
              isSaving={isSaving}
              onLogoUpload={handleLogoUpload}
              onSaveBranding={handleSaveBranding}
              fileInputRef={fileInputRef}
            />
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <IntegrationsList />
            </div>
          )}

          {activeTab === 'seo' && <SeoTab />}
          {activeTab === 'ai' && <AiTab workspaceId={branding?.workspace_id} />}
          {activeTab === 'ai-credits' && <AiCreditsTab workspaceId={branding?.workspace_id} />}

          {activeTab === 'api' && (
            <ApiTab
              apiKey={apiKey}
              onRegenerateKey={handleRegenerateKey}
              onCopy={copyToClipboard}
              copiedId={copied}
              workspaceId={branding?.workspace_id || ''}
              webhooks={webhooks}
              onNewWebhook={handleNewWebhook}
              onDeleteWebhook={() => toast.info('Delete functionality coming soon')}
            />
          )}

          {activeTab === 'pricing' && <BillingTab memberCount={members.length} />}

          {activeTab === 'audit' && <SecurityTab auditData={auditData} />}

          {activeTab === 'domains' && <DomainsTab />}

          {activeTab === 'appearance' && (
            <AppearanceTab
              theme={theme || 'dark'}
              toggleTheme={toggleTheme}
              direction={direction || 'ltr'}
              toggleDirection={toggleDirection}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        inviteMode={inviteMode}
        setInviteMode={setInviteMode}
        inviteEmail={inviteEmail}
        setInviteEmail={setInviteEmail}
        inviteName={inviteName}
        setInviteName={setInviteName}
        invitePassword={invitePassword}
        setInvitePassword={setInvitePassword}
        inviteRole={inviteRole}
        setInviteRole={setInviteRole}
        selectedPermissions={selectedPermissions}
        togglePermission={(id) => setSelectedPermissions(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])}
        isSaving={isSaving}
        onSubmit={handleInviteSubmit}
        permissionModules={PERMISSION_MODULES}
      />

      <EditMemberModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        member={editingMember}
        role={editRole}
        setRole={setEditRole}
        permissions={editPermissions}
        setPermissions={setEditPermissions}
        isSaving={isSaving}
        onSave={handleUpdatePermissions}
        permissionModules={PERMISSION_MODULES}
      />

      {confirmConfig && (
        <ConfirmDialog
          isOpen={confirmConfig.isOpen}
          onClose={() => setConfirmConfig(prev => prev ? { ...prev, isOpen: false } : null)}
          onConfirm={confirmConfig.onConfirm}
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmLabel={confirmConfig.confirmLabel}
          variant="danger"
        />
      )}
    </div>
  );
}
