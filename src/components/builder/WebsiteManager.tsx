"use client";

import React from 'react';
import { Settings, Globe, Image as ImageIcon, Plus, Navigation, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBuilder } from './BuilderContext';
import { toast } from 'sonner';

import { createPage } from '@/app/actions/builder';
import { useRouter } from 'next/navigation';

export const WebsiteManager = ({ website, onUpdate }: { website: any, onUpdate: (updates: any) => void }) => {
  const { pages: contextPages, websiteId } = useBuilder();
  const [isSaving, setIsSaving] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [newPageName, setNewPageName] = React.useState('');
  const router = useRouter();

  const handleCreatePage = async () => {
    if (!newPageName || !websiteId) return;
    setIsCreating(true);
    const result = await createPage(newPageName, websiteId);
    if (result.success) {
        toast.success("Page created!");
        setIsCreating(false);
        setNewPageName('');
        // Redirect to new page editor
        router.push(`/editor/website/${websiteId}/${result.pageId}`);
    } else {
        toast.error(result.error || "Failed to create page");
        setIsCreating(false);
    }
  };

  const handleManualSave = async () => {
    setIsSaving(true);
    // Explicitly trigger the update
    await onUpdate({}); 
    // Show saving state for UX
    setTimeout(() => setIsSaving(false), 800);
  };


  return (
    <div className="h-full flex flex-col pt-2 bg-card select-none">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <Settings className="w-3.5 h-3.5 text-[#6c47ff]" />
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Site Settings</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
        {/* Identity */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] flex items-center gap-2">
            <Globe className="w-3 h-3" /> Identity
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-tight">Site Name</Label>
              <Input
                value={website.name || ''}
                onChange={(e) => onUpdate({ name: e.target.value })}
                className="h-9 bg-white/5 border-white/5 focus-visible:ring-[#6c47ff]/50 transition-all font-medium text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-tight">Subdomain</Label>
              <div className="flex items-center bg-white/5 rounded-md px-3 border border-white/5 focus-within:border-[#6c47ff]/50 transition-all h-9">
                <input
                  value={website.subdomain || ''}
                  onChange={(e) => onUpdate({ subdomain: e.target.value })}
                  className="bg-transparent border-none text-sm w-full outline-none text-white font-medium"
                />
                <span className="text-[10px] text-white/30 font-bold whitespace-nowrap">.leadsmind.ai</span>
              </div>
            </div>
          </div>
        </section>

        {/* Pages Management */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] flex items-center gap-2">
            <LayoutGrid className="w-3 h-3" /> Pages ({contextPages.length})
          </h3>
          <div className="space-y-2">
            {contextPages.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 group hover:border-[#6c47ff]/30 transition-all">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-white">{p.name}</span>
                  <span className="text-[9px] text-muted-foreground font-mono">/{p.slug}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-muted-foreground hover:text-white" 
                    title="Edit Page"
                    onClick={() => router.push(`/editor/website/${websiteId}/${p.id}`)}
                   >
                      <Settings className="w-3 h-3" />
                   </Button>
                </div>
              </div>
            ))}
            {isCreating ? (
                <div className="space-y-2 p-3 bg-white/5 rounded-xl border border-[#6c47ff]/30 animate-in fade-in slide-in-from-top-2">
                    <Input 
                        autoFocus
                        value={newPageName}
                        onChange={(e) => setNewPageName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreatePage()}
                        placeholder="e.g. Pricing"
                        className="h-8 bg-black/40 border-white/10 text-xs"
                    />
                    <div className="flex gap-1">
                        <Button 
                            className="flex-1 h-7 text-[10px] bg-[#6c47ff]" 
                            onClick={handleCreatePage}
                            disabled={!newPageName}
                        >
                            Create
                        </Button>
                        <Button 
                            variant="ghost" 
                            className="h-7 w-7 p-0" 
                            onClick={() => setIsCreating(false)}
                        >
                            ×
                        </Button>
                    </div>
                </div>
            ) : (
                <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full text-[10px] h-8 border-dashed border-white/10 hover:bg-white/5 gap-2"
                    onClick={() => setIsCreating(true)}
                >
                    <Plus className="w-3 h-3" /> Add New Page
                </Button>
            )}
          </div>
        </section>

        {/* Assets */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] flex items-center gap-2">
            <ImageIcon className="w-3 h-3" /> Brand Assets
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-tight">Favicon</Label>
                <div className="h-16 w-16 rounded-xl border border-dashed border-white/10 flex items-center justify-center bg-white/5 hover:bg-white/10 cursor-pointer transition-colors group">
                    <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                </div>
            </div>
            <div className="space-y-2">
                <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-tight">Default Logo</Label>
                <div className="h-16 w-full rounded-xl border border-dashed border-white/10 flex items-center justify-center bg-white/5 hover:bg-white/10 cursor-pointer transition-colors group">
                    <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                </div>
            </div>
          </div>
        </section>

        {/* Custom Domain & SSL */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] flex items-center gap-2">
            <Globe className="w-3 h-3" /> Custom Domain
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-tight">Your Domain</Label>
              <div className="flex gap-2">
                <Input
                  value={website.custom_domain || ''}
                  onChange={(e) => onUpdate({ custom_domain: e.target.value })}
                  className="h-9 bg-white/5 border-white/5 focus-visible:ring-[#6c47ff]/50 font-medium"
                  placeholder="e.g. www.my-awesome-site.com"
                />
              </div>
            </div>
            
            {website.custom_domain && (
                <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-3 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase text-muted-foreground">Setup Instructions</span>
                        <div className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${website.domain_verified ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                            {website.domain_verified ? 'Verified' : 'Verification Required'}
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[8px] font-bold text-muted-foreground">Type: CNAME</Label>
                        <div className="p-2 bg-white/5 rounded border border-white/5 flex items-center justify-between group">
                            <code className="text-[10px] text-primary">proxy.leadsmind.ai</code>
                            <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100" onClick={() => navigator.clipboard.writeText('proxy.leadsmind.ai')}>
                                <ImageIcon className="w-2.5 h-2.5" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
          </div>
        </section>

        {/* Navigation */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] flex items-center gap-2">
            <Navigation className="w-3 h-3" /> Navigation
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-tight border-b border-white/5 pb-1 block">Header Links</Label>
              <div className="space-y-2">
                  {(website.config?.navLinks || []).map((link: any, index: number) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input 
                        value={link.label}
                        onChange={(e) => {
                          const newNav = [...(website.config?.navLinks || [])];
                          newNav[index] = { ...newNav[index], label: e.target.value };
                          onUpdate({ config: { ...website.config, navLinks: newNav } });
                        }}
                        placeholder="Label"
                        className="h-8 bg-white/5 border-none text-xs"
                      />
                      <Input 
                        value={link.url}
                        onChange={(e) => {
                          const newNav = [...(website.config?.navLinks || [])];
                          newNav[index] = { ...newNav[index], url: e.target.value };
                          onUpdate({ config: { ...website.config, navLinks: newNav } });
                        }}
                        placeholder="URL (/about)"
                        className="h-8 bg-white/5 border-none text-xs"
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10 shrink-0"
                        onClick={() => {
                          const newNav = (website.config?.navLinks || []).filter((_: any, i: number) => i !== index);
                          onUpdate({ config: { ...website.config, navLinks: newNav } });
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const newNav = [...(website.config?.navLinks || []), { label: 'New Link', url: '/' }];
                  onUpdate({ config: { ...website.config, navLinks: newNav } });
                }}
                className="w-full text-[10px] h-8 border-white/10 hover:bg-white/5"
              >
                + Add Header Link
              </Button>
              
              <div className="pt-2 grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-tight border-b border-white/5 pb-1 block mb-2 mt-2">CTA Button</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={website.config?.navStyle?.ctaText || ''} 
                      onChange={(e) => onUpdate({ config: { ...website.config, navStyle: { ...(website.config?.navStyle || {}), ctaText: e.target.value } } })}
                      placeholder="Button Text"
                      className="h-8 bg-white/5 border-none text-xs flex-1"
                    />
                    <Input 
                      value={website.config?.navStyle?.ctaUrl || ''} 
                      onChange={(e) => onUpdate({ config: { ...website.config, navStyle: { ...(website.config?.navStyle || {}), ctaUrl: e.target.value } } })}
                      placeholder="/signup"
                      className="h-8 bg-white/5 border-none text-xs flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[9px] uppercase text-muted-foreground font-bold tracking-tight">Main BG</Label>
                  <div className="flex items-center gap-2 h-8 bg-white/5 px-2 rounded-md border border-white/5">
                    <input type="color" 
                      value={website.config?.navStyle?.bg || '#ffffff'} 
                      onChange={(e) => onUpdate({ config: { ...website.config, navStyle: { ...(website.config?.navStyle || {}), bg: e.target.value } } })}
                      className="w-4 h-4 rounded cursor-pointer border-none p-0 bg-transparent"
                    />
                    <span className="text-[10px] text-muted-foreground uppercase">{website.config?.navStyle?.bg || '#ffffff'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[9px] uppercase text-muted-foreground font-bold tracking-tight">Text Color</Label>
                  <div className="flex items-center gap-2 h-8 bg-white/5 px-2 rounded-md border border-white/5">
                    <input type="color" 
                      value={website.config?.navStyle?.text || '#374151'} 
                      onChange={(e) => onUpdate({ config: { ...website.config, navStyle: { ...(website.config?.navStyle || {}), text: e.target.value } } })}
                      className="w-4 h-4 rounded cursor-pointer border-none p-0 bg-transparent"
                    />
                    <span className="text-[10px] text-muted-foreground uppercase">{website.config?.navStyle?.text || '#374151'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[9px] uppercase text-muted-foreground font-bold tracking-tight">CTA BG</Label>
                  <div className="flex items-center gap-2 h-8 bg-white/5 px-2 rounded-md border border-white/5">
                    <input type="color" 
                      value={website.config?.navStyle?.ctaBg || '#000000'} 
                      onChange={(e) => onUpdate({ config: { ...website.config, navStyle: { ...(website.config?.navStyle || {}), ctaBg: e.target.value } } })}
                      className="w-4 h-4 rounded cursor-pointer border-none p-0 bg-transparent"
                    />
                    <span className="text-[10px] text-muted-foreground uppercase">{website.config?.navStyle?.ctaBg || '#000'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[9px] uppercase text-muted-foreground font-bold tracking-tight">CTA Text</Label>
                  <div className="flex items-center gap-2 h-8 bg-white/5 px-2 rounded-md border border-white/5">
                    <input type="color" 
                      value={website.config?.navStyle?.ctaColor || '#ffffff'} 
                      onChange={(e) => onUpdate({ config: { ...website.config, navStyle: { ...(website.config?.navStyle || {}), ctaColor: e.target.value } } })}
                      className="w-4 h-4 rounded cursor-pointer border-none p-0 bg-transparent"
                    />
                    <span className="text-[10px] text-muted-foreground uppercase">{website.config?.navStyle?.ctaColor || '#fff'}</span>
                  </div>
                </div>

                <div className="col-span-2 flex items-center justify-between h-8 px-2 bg-white/5 rounded-md mt-1 cursor-pointer hover:bg-white/10"
                    onClick={() => {
                        const isGlass = website.config?.navStyle?.glass;
                        onUpdate({ config: { ...website.config, navStyle: { ...(website.config?.navStyle || {}), glass: !isGlass } } });
                    }}
                >
                    <Label className="text-[10px] font-bold text-muted-foreground cursor-pointer">Glassmorphism (Blur)</Label>
                    <div className={`w-3 h-3 rounded-sm border ${website.config?.navStyle?.glass ? 'bg-[#6c47ff] border-[#6c47ff]' : 'border-white/20'}`} />
                </div>
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-tight border-b border-white/5 pb-1 block">Footer Links</Label>
              <div className="space-y-2">
                  {(website.config?.footerLinks || []).map((link: any, index: number) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input 
                        value={link.label}
                        onChange={(e) => {
                          const newFooter = [...(website.config?.footerLinks || [])];
                          newFooter[index] = { ...newFooter[index], label: e.target.value };
                          onUpdate({ config: { ...website.config, footerLinks: newFooter } });
                        }}
                        placeholder="Label"
                        className="h-8 bg-white/5 border-none text-xs"
                      />
                      <Input 
                        value={link.url}
                        onChange={(e) => {
                          const newFooter = [...(website.config?.footerLinks || [])];
                          newFooter[index] = { ...newFooter[index], url: e.target.value };
                          onUpdate({ config: { ...website.config, footerLinks: newFooter } });
                        }}
                        placeholder="URL (/terms)"
                        className="h-8 bg-white/5 border-none text-xs"
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10 shrink-0"
                        onClick={() => {
                          const newFooter = (website.config?.footerLinks || []).filter((_: any, i: number) => i !== index);
                          onUpdate({ config: { ...website.config, footerLinks: newFooter } });
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const newFooter = [...(website.config?.footerLinks || []), { label: 'New Link', url: '/' }];
                  onUpdate({ config: { ...website.config, footerLinks: newFooter } });
                }}
                className="w-full text-[10px] h-8 border-white/10 hover:bg-white/5"
              >
                + Add Footer Link
              </Button>

              <div className="pt-2 grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-tight border-b border-white/5 pb-1 block mb-2 mt-2">Footer Branding</Label>
                  <Input 
                    value={website.config?.footerStyle?.tagline || ''} 
                    onChange={(e) => onUpdate({ config: { ...website.config, footerStyle: { ...(website.config?.footerStyle || {}), tagline: e.target.value } } })}
                    placeholder="Short mission statement or tagline..."
                    className="h-8 bg-white/5 border-none text-xs w-full"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[9px] uppercase text-muted-foreground font-bold tracking-tight">Background</Label>
                  <div className="flex items-center gap-2 h-8 bg-white/5 px-2 rounded-md border border-white/5">
                    <input type="color" 
                      value={website.config?.footerStyle?.bg || '#f8fafc'} 
                      onChange={(e) => onUpdate({ config: { ...website.config, footerStyle: { ...(website.config?.footerStyle || {}), bg: e.target.value } } })}
                      className="w-4 h-4 rounded cursor-pointer border-none p-0 bg-transparent"
                    />
                    <span className="text-[10px] text-muted-foreground uppercase">{website.config?.footerStyle?.bg || '#f8fafc'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[9px] uppercase text-muted-foreground font-bold tracking-tight">Text Color</Label>
                  <div className="flex items-center gap-2 h-8 bg-white/5 px-2 rounded-md border border-white/5">
                    <input type="color" 
                      value={website.config?.footerStyle?.text || '#9ca3af'} 
                      onChange={(e) => onUpdate({ config: { ...website.config, footerStyle: { ...(website.config?.footerStyle || {}), text: e.target.value } } })}
                      className="w-4 h-4 rounded cursor-pointer border-none p-0 bg-transparent"
                    />
                    <span className="text-[10px] text-muted-foreground uppercase">{website.config?.footerStyle?.text || '#9ca3af'}</span>
                  </div>
                </div>

                <div className="col-span-2 flex items-center justify-between h-8 px-2 bg-white/5 rounded-md mt-1 cursor-pointer hover:bg-white/10"
                    onClick={() => {
                        const isCenter = website.config?.footerStyle?.layout === 'center';
                        onUpdate({ config: { ...website.config, footerStyle: { ...(website.config?.footerStyle || {}), layout: isCenter ? 'between' : 'center' } } });
                    }}
                >
                    <Label className="text-[10px] font-bold text-muted-foreground cursor-pointer">Center Align Layout</Label>
                    <div className={`w-3 h-3 rounded-sm border ${website.config?.footerStyle?.layout === 'center' ? 'bg-[#6c47ff] border-[#6c47ff]' : 'border-white/20'}`} />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="p-4 border-t border-white/5 bg-black/20">
        <Button 
            onClick={handleManualSave}
            disabled={isSaving}
            className="w-full bg-[#6c47ff] hover:bg-[#6c47ff]/90 text-white font-bold h-10 shadow-lg shadow-[#6c47ff]/20 transition-all duration-300"
        >
          {isSaving ? "SAVING..." : "SAVE SITE SETTINGS"}
        </Button>
      </div>
    </div>
  );
};
