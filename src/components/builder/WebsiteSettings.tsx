"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Globe, Shield, Rocket, Info, Plus, Trash2, CheckCircle2, XCircle, RefreshCw, Webhook, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { ColorPicker } from './ColorPicker';
import { createClient } from '@/lib/supabase/client';
import { useBuilder } from './BuilderContext';
import { 
  addCustomDomain, 
  removeCustomDomain, 
  verifyDomainSSL,
  createSubdirectoryPage,
  deleteSubdirectoryPage,
  renameSubdirectoryPage 
} from '@/app/actions/builderDeploy';

interface WebsiteSettingsProps {
  website: any;
  onUpdate: (updates: any) => void;
}

export const WebsiteSettings = ({ website, onUpdate }: WebsiteSettingsProps) => {
  const { pages: contextPages, websiteData } = useBuilder();
  const [localSettings, setLocalSettings] = useState({
    name: website?.name || '',
    subdomain: website?.subdomain || '',
    config: website?.config || { social_links: { facebook: '', instagram: '', twitter: '' } }
  });

  // Domains & Pages State
  const [domains, setDomains] = useState<any[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [loadingDomain, setLoadingDomain] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [newPagePath, setNewPagePath] = useState('');
  
  // Webhook State
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');

  const supabase = createClient();

  const fetchDomains = useCallback(async () => {
    if (!website?.id) return;
    const { data } = await supabase
      .from('builder_published_domains')
      .select('*')
      .eq('website_id', website.id);
    if (data) setDomains(data);
  }, [website?.id, supabase]);

  const fetchWebhooks = useCallback(async () => {
    if (!website?.workspace_id) return;
    const { data } = await supabase
      .from('workspace_builder_settings')
      .select('settings')
      .eq('workspace_id', website.workspace_id)
      .maybeSingle();
    if (data?.settings?.webhooks) {
      setWebhooks(data.settings.webhooks);
    }
  }, [website?.workspace_id, supabase]);

  useEffect(() => {
    if (website) {
      setLocalSettings({
        name: website.name || '',
        subdomain: website.subdomain || '',
        config: website.config || { social_links: { facebook: '', instagram: '', twitter: '' } }
      });
      fetchDomains();
      fetchWebhooks();
    }
  }, [website, fetchDomains, fetchWebhooks]);

  const handleAddDomain = async () => {
    if (!newDomain) return;
    setLoadingDomain(true);
    const res = await addCustomDomain(website.id, newDomain);
    setLoadingDomain(false);
    if (res.success) {
      toast.success('Domain registered');
      setNewDomain('');
      fetchDomains();
    } else {
      toast.error(res.error || 'Failed to add domain');
    }
  };

  const handleVerifySSL = async (domainId: string) => {
    const toastId = toast.loading('Querying Cloudflare domain verification proxy...');
    const res = await verifyDomainSSL(domainId);
    if (res.success) {
      toast.success('SSL credentials verified active!', { id: toastId });
      fetchDomains();
    } else {
      toast.error(res.error || 'Failed to verify DNS alignment', { id: toastId });
    }
  };

  const handleRemoveDomain = async (domainId: string) => {
    if (!confirm('Disconnect this domain configuration?')) return;
    const res = await removeCustomDomain(domainId);
    if (res.success) {
      toast.success('Domain disconnected');
      fetchDomains();
    } else {
      toast.error('Failed to disconnect domain');
    }
  };

  const handleAddPage = async () => {
    if (!newPageName || !newPagePath) return;
    const res = await createSubdirectoryPage(website.id, newPageName, newPagePath);
    if (res.success) {
      toast.success('Subdirectory page configured');
      setNewPageName('');
      setNewPagePath('');
      setTimeout(() => window.location.reload(), 300);
    } else {
      toast.error(res.error || 'Failed to create page');
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page subdirectory? This cannot be undone.')) return;
    const res = await deleteSubdirectoryPage(pageId);
    if (res.success) {
      toast.success('Page deleted successfully');
      setTimeout(() => window.location.reload(), 300);
    } else {
      toast.error('Failed to delete page');
    }
  };

  const handleAddWebhook = async () => {
    if (!newWebhookUrl) return;
    const updatedHooks = [...webhooks, { url: newWebhookUrl, active: true, events: ['form_submission'] }];
    
    // Save to workspace_builder_settings
    const { getWorkspaceBuilderSettings, updateWorkspaceBuilderSettings } = await import('@/app/actions/builder');
    const settingsRes = await getWorkspaceBuilderSettings();
    const currentSettings = settingsRes.success ? settingsRes.settings : {};
    
    const saveRes = await updateWorkspaceBuilderSettings({
      ...currentSettings,
      webhooks: updatedHooks
    });

    if (saveRes.success) {
      toast.success('Webhook registered');
      setNewWebhookUrl('');
      setWebhooks(updatedHooks);
    } else {
      toast.error('Failed to register webhook');
    }
  };

  const handleToggleWebhook = async (idx: number) => {
    const updated = webhooks.map((w, i) => i === idx ? { ...w, active: !w.active } : w);
    const { getWorkspaceBuilderSettings, updateWorkspaceBuilderSettings } = await import('@/app/actions/builder');
    const settingsRes = await getWorkspaceBuilderSettings();
    const currentSettings = settingsRes.success ? settingsRes.settings : {};
    
    const saveRes = await updateWorkspaceBuilderSettings({
      ...currentSettings,
      webhooks: updated
    });

    if (saveRes.success) {
      toast.success('Webhook updated');
      setWebhooks(updated);
    }
  };

  const handleRemoveWebhook = async (idx: number) => {
    const updated = webhooks.filter((_, i) => i !== idx);
    const { getWorkspaceBuilderSettings, updateWorkspaceBuilderSettings } = await import('@/app/actions/builder');
    const settingsRes = await getWorkspaceBuilderSettings();
    const currentSettings = settingsRes.success ? settingsRes.settings : {};
    
    await updateWorkspaceBuilderSettings({
      ...currentSettings,
      webhooks: updated
    });
    setWebhooks(updated);
    toast.success('Webhook deleted');
  };

  const handleChange = (field: string, value: string) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleConfigChange = (key: string, value: string) => {
    setLocalSettings(prev => {
      const updated = {
        ...prev,
        config: { ...(prev.config || {}), [key]: value }
      };
      onUpdate(updated);
      return updated;
    });
  };

  const handleSave = () => {
    onUpdate(localSettings);
    toast.success("Identity updates published live");
  };

  return (
    <div className="h-full flex flex-col pt-2 bg-transparent !text-dash-text select-none">
      <div className="px-4 py-3 border-b border-dash-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-primary" />
          <h2 className="text-[10px] font-bold !text-dash-textMuted">Site settings</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 common-scrollbar">
        {/* Core Identity */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-bold !text-dash-textMuted flex items-center gap-2">
            <Shield className="w-3 h-3" /> Brand identity
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] !text-dash-textMuted font-bold">Website name</Label>
              <Input
                value={localSettings.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="h-9 bg-white border-dash-border !text-dash-text text-sm placeholder:text-dash-textMuted"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] !text-dash-textMuted font-bold">Subdomain</Label>
              <div className="relative flex-1">
                <Input
                  value={localSettings.subdomain}
                  onChange={(e) => handleChange('subdomain', e.target.value)}
                  className="h-9 bg-white border-dash-border !text-dash-text text-sm pr-20 placeholder:text-dash-textMuted"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold !text-dash-textMuted">.leadsmind</span>
              </div>
            </div>
          </div>
        </section>

        {/* Custom SSL Domains Manager */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-bold !text-dash-textMuted flex items-center gap-2">
            <Rocket className="w-3 h-3" /> SSL custom domains
          </h3>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="example.com"
                className="h-9 bg-white border-dash-border !text-dash-text text-xs placeholder:text-dash-textMuted"
              />
              <Button onClick={handleAddDomain} disabled={loadingDomain} size="sm" className="bg-primary text-white h-9 px-3 text-[10px] font-bold">
                Add
              </Button>
            </div>

            <div className="space-y-2">
              {domains.map((dom) => (
                <div key={dom.id} className="p-3 bg-dash-surface border border-dash-border rounded-xl flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-xs font-bold !text-dash-text flex items-center gap-1.5">
                      {dom.domain_name}
                      {dom.verified ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-amber-600" />
                      )}
                    </div>
                    <div className="text-[9px] font-semibold !text-dash-textMuted">
                      CNAME target: proxy.leadsmind.com | Status: {dom.ssl_status}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button onClick={() => handleVerifySSL(dom.id)} size="icon" variant="ghost" className="h-7 w-7 !text-dash-textMuted hover:!text-dash-text bg-white hover:bg-dash-border/60">
                      <RefreshCw size={12} />
                    </Button>
                    <Button onClick={() => handleRemoveDomain(dom.id)} size="icon" variant="ghost" className="h-7 w-7 !text-dash-textMuted hover:text-red bg-white hover:bg-red/10">
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Subdirectories Pages Setup */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-bold !text-dash-textMuted flex items-center gap-2">
            <Globe className="w-3 h-3" /> Page subdirectories
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
                placeholder="About Us"
                className="h-9 bg-white border-dash-border !text-dash-text text-xs"
              />
              <Input
                value={newPagePath}
                onChange={(e) => setNewPagePath(e.target.value)}
                placeholder="about"
                className="h-9 bg-white border-dash-border !text-dash-text text-xs"
              />
            </div>
            <Button onClick={handleAddPage} className="w-full bg-white border border-dash-border !text-dash-text hover:bg-dash-surface h-9 text-[10px] font-bold">
              Add new page path
            </Button>

            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {contextPages.map((p) => (
                <div key={p.id} className="p-2.5 bg-dash-surface border border-dash-border rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold !text-dash-text">{p.name}</div>
                    <div className="text-[9px] text-primary font-bold">/{p.slug}</div>
                  </div>
                  {p.slug !== 'home' && p.slug !== '' && (
                    <Button onClick={() => handleDeletePage(p.id)} size="icon" variant="ghost" className="h-7 w-7 !text-dash-textMuted hover:text-red bg-white hover:bg-red/10">
                      <Trash2 size={12} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Webhooks Integrations */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-bold !text-dash-textMuted flex items-center gap-2">
            <Webhook className="w-3 h-3" /> Lead capture webhooks
          </h3>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                placeholder="https://hooks.zapier.com/..."
                className="h-9 bg-white border-dash-border !text-dash-text text-xs placeholder:text-dash-textMuted"
              />
              <Button onClick={handleAddWebhook} size="sm" className="bg-primary text-white h-9 px-3 text-[10px] font-bold">
                Connect
              </Button>
            </div>

            <div className="space-y-2">
              {webhooks.map((hook, idx) => (
                <div key={idx} className="p-3 bg-dash-surface border border-dash-border rounded-xl flex items-center justify-between">
                  <div className="truncate pr-4 flex-1">
                    <div className="text-xs font-bold !text-dash-text truncate">{hook.url}</div>
                    <div className="text-[9px] font-bold text-green">
                      {hook.active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button onClick={() => handleToggleWebhook(idx)} size="icon" variant="ghost" className="h-7 w-7 !text-dash-textMuted hover:!text-dash-text bg-white hover:bg-dash-border/60">
                      <RefreshCw size={12} />
                    </Button>
                    <Button onClick={() => handleRemoveWebhook(idx)} size="icon" variant="ghost" className="h-7 w-7 !text-dash-textMuted hover:text-red bg-white hover:bg-red/10">
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Design Tokens Panel */}
        <section className="space-y-4 pt-4 border-t border-dash-border">
          <h3 className="text-[10px] font-bold !text-dash-textMuted flex items-center gap-2">
            <Globe className="w-3 h-3 text-amber-600" /> Colors & palettes
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <ColorPicker label="Primary" value={localSettings.config?.primaryColor || '#6c47ff'} onChange={(val) => handleConfigChange('primaryColor', val)} />
            <ColorPicker label="Secondary" value={localSettings.config?.secondaryColor || '#3b82f6'} onChange={(val) => handleConfigChange('secondaryColor', val)} />
            <ColorPicker label="Accent" value={localSettings.config?.accentColor || '#fbbf24'} onChange={(val) => handleConfigChange('accentColor', val)} />
            <ColorPicker label="Canvas background" value={localSettings.config?.backgroundColor || '#050508'} onChange={(val) => handleConfigChange('backgroundColor', val)} />
          </div>
        </section>
      </div>

      <div className="p-4 border-t border-dash-border bg-dash-surface">
        <Button onClick={handleSave} className="w-full bg-primary hover:bg-primary-dark text-white font-bold h-10 shadow-lg shadow-primary/20 text-[10px]">
          Push global updates
        </Button>
      </div>
    </div>
  );
};
