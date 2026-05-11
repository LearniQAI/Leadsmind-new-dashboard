"use client";

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Globe, Shield, Rocket, Info, Copy, ExternalLink, Share2 } from 'lucide-react';
import { toast } from 'sonner';

interface WebsiteSettingsProps {
 website: any;
 onUpdate: (updates: any) => void;
}

export const WebsiteSettings = ({ website, onUpdate }: WebsiteSettingsProps) => {
 const [localSettings, setLocalSettings] = React.useState({
  name: website?.name || '',
  subdomain: website?.subdomain || '',
  custom_domain: website?.custom_domain || '',
  config: website?.config || { social_links: { facebook: '', instagram: '', twitter: '' } }
 });

 React.useEffect(() => {
  if (website) {
   setLocalSettings({
    name: website.name || '',
    subdomain: website.subdomain || '',
    custom_domain: website.custom_domain || '',
    config: website.config || { social_links: { facebook: '', instagram: '', twitter: '' } }
   });
  }
 }, [website]);

 const handleChange = (field: string, value: string) => {
  setLocalSettings(prev => ({ ...prev, [field]: value }));
 };

 const handleSocialChange = (platform: string, value: string) => {
  setLocalSettings(prev => ({
   ...prev,
   config: {
    ...prev.config,
    social_links: {
     ...(prev.config?.social_links || {}),
     [platform]: value
    }
   }
  }));
 };

 const handleSave = () => {
  onUpdate(localSettings);
  toast.success("Site settings queued for update");
 };

 const copyUrl = () => {
  const url = `https://${localSettings.subdomain}.leadsmind.com`;
  navigator.clipboard.writeText(url);
  toast.success("URL copied to clipboard");
 };

 return (
  <div className="h-full flex flex-col pt-2 bg-card select-none">
   <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
    <div className="flex items-center gap-2">
     <Globe className="w-3.5 h-3.5 text-primary" />
     <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Global Site Settings</h2>
    </div>
   </div>

   <div className="flex-1 overflow-y-auto p-4 space-y-8 common-scrollbar">
    {/* Core Identity */}
    <section className="space-y-4">
     <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] flex items-center gap-2">
      <Shield className="w-3 h-3" /> Brand Identity
     </h3>
     <div className="space-y-4">
      <div className="space-y-2">
       <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-tight">Website Name</Label>
       <Input 
        value={localSettings.name}
        onChange={(e) => handleChange('name', e.target.value)}
        className="h-9 bg-white/5 border-white/5 text-sm"
        placeholder="My Awesome Site"
       />
      </div>
      <div className="space-y-2">
       <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-tight">Subdomain</Label>
       <div className="flex gap-2">
        <div className="relative flex-1">
         <Input 
          value={localSettings.subdomain}
          onChange={(e) => handleChange('subdomain', e.target.value)}
          className="h-9 bg-white/5 border-white/5 text-sm pr-20"
          placeholder="my-site"
         />
         <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-white/20 uppercase">.leadsmind</span>
        </div>
        <Button size="icon" variant="secondary" onClick={copyUrl} className="h-9 w-9 bg-white/5 border border-white/10 hover:bg-primary/10">
         <Copy size={14} />
        </Button>
       </div>
      </div>
     </div>
    </section>

    {/* Custom Domain */}
    <section className="space-y-4">
     <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] flex items-center gap-2">
      <Rocket className="w-3 h-3" /> Custom Routing
     </h3>
     <div className="space-y-4">
      <div className="space-y-2">
       <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-tight">External Domain</Label>
       <Input 
        value={localSettings.custom_domain}
        onChange={(e) => handleChange('custom_domain', e.target.value)}
        className="h-9 bg-white/5 border-white/5 text-sm"
        placeholder="www.example.com"
       />
       <p className="text-[9px] text-muted-foreground px-1">Connect your own domain via CNAME records.</p>
      </div>
     </div>
    </section>

    {/* Social Media Links */}
    <section className="space-y-4">
     <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] flex items-center gap-2">
      <Share2 className="w-3 h-3" /> Social Presence
     </h3>
     <div className="space-y-4">
      <div className="space-y-2">
       <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-tight">Facebook URL</Label>
       <Input 
        value={localSettings.config?.social_links?.facebook || ''}
        onChange={(e) => handleSocialChange('facebook', e.target.value)}
        className="h-9 bg-white/5 border-white/5 text-sm"
        placeholder="https://facebook.com/your-page"
       />
      </div>
      <div className="space-y-2">
       <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-tight">Instagram URL</Label>
       <Input 
        value={localSettings.config?.social_links?.instagram || ''}
        onChange={(e) => handleSocialChange('instagram', e.target.value)}
        className="h-9 bg-white/5 border-white/5 text-sm"
        placeholder="https://instagram.com/your-profile"
       />
      </div>
      <div className="space-y-2">
       <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-tight">Twitter URL</Label>
       <Input 
        value={localSettings.config?.social_links?.twitter || ''}
        onChange={(e) => handleSocialChange('twitter', e.target.value)}
        className="h-9 bg-white/5 border-white/5 text-sm"
        placeholder="https://twitter.com/your-handle"
       />
      </div>
     </div>
    </section>

    {/* Info Card */}
    <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex gap-3">
     <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
     <p className="text-[10px] text-primary font-medium leading-relaxed">
      Changes here affect the entire website structure. Subdomain changes will update all page URLs immediately.
     </p>
    </div>
   </div>

   <div className="p-4 border-t border-white/5 bg-black/20">
    <Button 
     onClick={handleSave}
     className="w-full bg-primary hover:bg-primary-dark text-white font-bold h-10 shadow-lg shadow-primary/20 uppercase text-[10px] tracking-widest"
    >
     Push Global Updates
    </Button>
   </div>
  </div>
 );
};
