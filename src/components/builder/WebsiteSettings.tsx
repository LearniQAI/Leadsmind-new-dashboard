"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Globe, Shield, Rocket, Info, Plus, Trash2, CheckCircle2, XCircle, RefreshCw, Webhook, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { CUSTOM_DOMAIN_CNAME_TARGET } from '@/lib/domains/config';
import { ColorPicker } from './ColorPicker';
import { createClient } from '@/lib/supabase/client';
import { useBuilder } from './BuilderContext';
import { 
  addCustomDomain, 
  removeCustomDomain, 
  verifyDomainSSL,
  getWebsiteDomains,
  createSubdirectoryPage,
  deleteSubdirectoryPage,
  renameSubdirectoryPage 
} from '@/app/actions/builderDeploy';

interface WebsiteSettingsProps {
  website: any;
  onUpdate: (updates: any) => void;
  /** Editor type; funnels share this panel but have no custom-domain flow. */
  type?: 'website' | 'funnel';
}

export const WebsiteSettings = ({ website, onUpdate, type }: WebsiteSettingsProps) => {
  const isFunnel = type === 'funnel';
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
    if (!website?.id || isFunnel) return;
    const res = await getWebsiteDomains(website.id);
    if (res.success) setDomains(res.domains);
  }, [website?.id, isFunnel]);

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
    const toastId = toast.loading('Checking DNS and SSL status...');
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
      toast.error(res.error || 'Failed to disconnect domain');
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
    <div className="h-full flex flex-col pt-2 bg-white text-slate-700 select-none">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-slate-500" />
          <h2 className="text-[13px] font-bold text-slate-900">Site settings</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 common-scrollbar">
        {/* Core Identity */}
        <section className="mb-7">
          <h3 className="text-[13px] font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-slate-500" /> Brand identity
          </h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-slate-700">Website name</Label>
              <Input
                value={localSettings.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="h-9 bg-white border-slate-200 rounded-xl text-slate-700 text-sm placeholder:text-slate-400 focus-visible:border-slate-300"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-slate-700">Subdomain</Label>
              <div className="relative flex-1">
                <Input
                  value={localSettings.subdomain}
                  onChange={(e) => handleChange('subdomain', e.target.value)}
                  className="h-9 bg-white border-slate-200 rounded-xl text-slate-700 text-sm pr-20 placeholder:text-slate-400 focus-visible:border-slate-300"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">.leadsmind</span>
              </div>
            </div>
          </div>
        </section>

        {/* Custom SSL Domains Manager — websites only: builder_published_domains.website_id is an FK to
            websites, and funnels have no working custom-domain flow (funnels.custom_domain is never
            read or written anywhere), so offering this panel for a funnel could only fail. */}
        {!isFunnel && (
        <section className="mb-7">
          <h3 className="text-[13px] font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Rocket className="w-3.5 h-3.5 text-slate-500" /> SSL custom domains
          </h3>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="www.yourdomain.com"
                className="h-9 bg-white border-slate-200 rounded-xl text-slate-700 text-xs placeholder:text-slate-400 focus-visible:border-slate-300"
              />
              <Button onClick={handleAddDomain} disabled={loadingDomain} size="sm" className="bg-slate-900 hover:bg-slate-800 text-white h-9 px-3 text-[10px] font-bold">
                Add
              </Button>
            </div>

            <p className="text-[10px] font-semibold text-slate-500">
              Recommended: use a subdomain such as www.yourdomain.com. Subdomains work with every domain provider; a bare root domain only works with providers that support ALIAS/ANAME or CNAME flattening (many, like GoDaddy, don&apos;t). Add yourdomain.com and www.yourdomain.com separately if you want both. DNS changes can take up to 48 hours, and we re-check automatically every 15 minutes.
            </p>

            <div className="space-y-2">
              {domains.map((dom) => (
                <div key={dom.id} className="p-3 bg-slate-100 border border-transparent rounded-xl flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-[12px] font-bold text-slate-900 flex items-center gap-1.5">
                      {dom.domain_name}
                      {dom.verified ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-amber-600" />
                      )}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500">
                      {dom.dns?.domainType === 'apex' ? 'ALIAS/ANAME (or CNAME if flattened)' : 'CNAME'} {dom.dns?.recordHost ?? '@'} → {CUSTOM_DOMAIN_CNAME_TARGET} | Status: {dom.ssl_status}
                    </div>
                    {!dom.verified && dom.verification_token && (
                      <div className="text-[10px] font-semibold text-slate-500 break-all">
                        TXT {dom.dns?.txtHost ?? '_leadsmind-verify'} → {dom.verification_token}
                      </div>
                    )}
                    {!dom.verified && dom.dns?.domainType === 'apex' && (
                      <div className="text-[10px] font-semibold text-amber-700">
                        Root domain: only works if your provider supports ALIAS/ANAME or CNAME flattening. A subdomain like www.{dom.domain_name} works everywhere.
                      </div>
                    )}
                    {!dom.verified && dom.last_check_error && (
                      <div className="text-[10px] font-semibold text-amber-700">{dom.last_check_error}</div>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <Button onClick={() => handleVerifySSL(dom.id)} size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:text-slate-700 bg-white hover:bg-slate-200">
                      <RefreshCw size={12} />
                    </Button>
                    <Button onClick={() => handleRemoveDomain(dom.id)} size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:text-red bg-white hover:bg-red/10">
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        )}

        {/* Subdirectories Pages Setup */}
        <section className="mb-7">
          <h3 className="text-[13px] font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-slate-500" /> Page subdirectories
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
                placeholder="About Us"
                className="h-9 bg-white border-slate-200 rounded-xl text-slate-700 text-xs focus-visible:border-slate-300"
              />
              <Input
                value={newPagePath}
                onChange={(e) => setNewPagePath(e.target.value)}
                placeholder="about"
                className="h-9 bg-white border-slate-200 rounded-xl text-slate-700 text-xs focus-visible:border-slate-300"
              />
            </div>
            <Button onClick={handleAddPage} className="w-full bg-slate-100 border border-transparent text-slate-700 hover:bg-slate-200 h-9 text-[10px] font-bold">
              Add new page path
            </Button>

            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {contextPages.map((p) => (
                <div key={p.id} className="p-2.5 bg-slate-100 border border-transparent rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-[12px] font-bold text-slate-900">{p.name}</div>
                    <div className="text-[10px] text-slate-500 font-bold">/{p.slug}</div>
                  </div>
                  {p.slug !== 'home' && p.slug !== '' && (
                    <Button onClick={() => handleDeletePage(p.id)} size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:text-red bg-white hover:bg-red/10">
                      <Trash2 size={12} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Webhooks Integrations */}
        <section className="mb-7">
          <h3 className="text-[13px] font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Webhook className="w-3.5 h-3.5 text-slate-500" /> Lead capture webhooks
          </h3>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                placeholder="https://hooks.zapier.com/..."
                className="h-9 bg-white border-slate-200 rounded-xl text-slate-700 text-xs placeholder:text-slate-400 focus-visible:border-slate-300"
              />
              <Button onClick={handleAddWebhook} size="sm" className="bg-slate-900 hover:bg-slate-800 text-white h-9 px-3 text-[10px] font-bold">
                Connect
              </Button>
            </div>

            <div className="space-y-2">
              {webhooks.map((hook, idx) => (
                <div key={idx} className="p-3 bg-slate-100 border border-transparent rounded-xl flex items-center justify-between">
                  <div className="truncate pr-4 flex-1">
                    <div className="text-[12px] font-bold text-slate-900 truncate">{hook.url}</div>
                    <div className="text-[10px] font-bold text-green">
                      {hook.active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button onClick={() => handleToggleWebhook(idx)} size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:text-slate-700 bg-white hover:bg-slate-200">
                      <RefreshCw size={12} />
                    </Button>
                    <Button onClick={() => handleRemoveWebhook(idx)} size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:text-red bg-white hover:bg-red/10">
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Design Tokens Panel */}
        <section className="mb-7 last:mb-0 pt-4 border-t border-slate-200">
          <h3 className="text-[13px] font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-slate-500" /> Colors & palettes
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <ColorPicker label="Primary" value={localSettings.config?.primaryColor || '#6c47ff'} onChange={(val) => handleConfigChange('primaryColor', val)} />
            <ColorPicker label="Secondary" value={localSettings.config?.secondaryColor || '#3b82f6'} onChange={(val) => handleConfigChange('secondaryColor', val)} />
            <ColorPicker label="Accent" value={localSettings.config?.accentColor || '#fbbf24'} onChange={(val) => handleConfigChange('accentColor', val)} />
            <ColorPicker label="Canvas background" value={localSettings.config?.backgroundColor || '#050508'} onChange={(val) => handleConfigChange('backgroundColor', val)} />
          </div>
        </section>
      </div>

      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <Button onClick={handleSave} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 text-[10px]">
          Push global updates
        </Button>
      </div>
    </div>
  );
};
