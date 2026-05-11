'use client';

import { useState } from 'react';
import { Contact } from '@/types/crm.types';
import { addTag } from '@/app/actions/contacts';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
 Mail,
 Phone,
 MapPin,
 Tag,
 Calendar,
 User,
 MoreVertical,
 Zap,
 Plus,
 Loader2,
 XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { InfoTooltip } from '@/components/ui/info-tooltip';

interface ContactDetailLayoutProps {
 contact: Contact;
 children: React.ReactNode;
}

export function ContactDetailLayout({ contact, children }: ContactDetailLayoutProps) {
 const [isAddingTag, setIsAddingTag] = useState(false);
 const [newTag, setNewTag] = useState('');
 const [isLoading, setIsLoading] = useState(false);

 const initials = `${contact.first_name?.[0] || '?'}${contact.last_name?.[0] || '?'}`;

 const handleAddTag = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!newTag.trim()) return;

  setIsLoading(true);
  try {
   const res = await addTag(contact.id, newTag.trim());
   if (res.success) {
    toast.success(`Tag "${newTag}" added`);
    setNewTag('');
    setIsAddingTag(false);
   } else {
    toast.error(res.error);
   }
  } catch {
   toast.error("Failed to add tag");
  } finally {
   setIsLoading(false);
  }
 };

 return (
  <div className="app__slide-wrapper">
   <div className="grid grid-cols-12 gap-x-5">
    {/* Left Sidebar Profile */}
    <div className="col-span-12 lg:col-span-4 xxl:col-span-3">
     {/* No-Show Risk Warning Banner */}
     {contact.no_show_count && contact.no_show_count >= 3 && (
      <div className="mb-5 p-6 rounded-2xl bg-danger/10 border border-danger/20 text-center animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.1)]">
       <div className="h-10 w-10 rounded-full bg-danger/20 flex items-center justify-center mx-auto mb-3">
        <XCircle className="h-5 w-5 text-danger" />
       </div>
       <h4 className="text-[10px] font-black text-danger uppercase tracking-[0.2em] mb-1">High Risk Contact</h4>
       <p className="text-[11px] text-white/50 leading-relaxed font-bold">
        {contact.no_show_count} NO-SHOWS DETECTED
       </p>
      </div>
     )}

     <div className="card__wrapper sticky top-28">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-30" />

      <div className="flex flex-col items-center text-center">
       <div className="relative mb-5">
        <Avatar className="h-28 w-28 border-2 border-primary/20 ring-4 ring-primary/5">
         <AvatarFallback className="bg-primary/20 text-primary text-3xl font-black uppercase">
          {initials}
         </AvatarFallback>
        </Avatar>
        <div className="absolute bottom-1 right-1 h-6 w-6 bg-success rounded-full border-4 border-[#0b0b10] shadow-lg shadow-success/20" />
       </div>

       <h4 className="text-xl font-black text-white mb-1 uppercase tracking-tighter">
        {contact.first_name} {contact.last_name}
       </h4>
       <p className="text-[10px] text-white/30 uppercase font-black tracking-[0.2em] mb-6">Relationship Profile</p>

       <div className="flex gap-2 mb-8">
        <Link href={`/apps/contacts/${contact.id}/edit`} className="btn btn-md btn-primary !rounded-xl text-[10px] uppercase font-black tracking-widest px-8 shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5">
         Edit Profile
        </Link>
        <button className="btn btn-icon btn-md btn-outline-theme-border !rounded-xl">
         <MoreVertical size={16} />
        </button>
       </div>

       {/* AI Lead Score */}
       <div className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-5 mb-8 group hover:border-primary/20 transition-all">
        <div className="flex items-center justify-between mb-4">
         <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
           <Zap className="h-4 w-4 text-primary" />
          </div>
          <span className="text-[9px] font-black text-white/60 uppercase tracking-[0.2em]">AI Engagement</span>
         </div>
         <span className={`text-2xl font-black tracking-tighter ${(contact.lead_score || 0) > 75 ? 'text-success' :
           (contact.lead_score || 0) > 40 ? 'text-warning' : 'text-white/20'
          }`}>
          {contact.lead_score || 0}%
         </span>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-4">
         <div
          className="h-full bg-primary transition-all duration-1000 shadow-[0_0_10px_rgba(56,96,226,0.5)]"
          style={{ width: `${contact.lead_score || 0}%` }}
         />
        </div>
        {contact.lead_score_explanation && (
         <p className="text-[10px] text-white/40 leading-relaxed text-left border-l-2 border-primary/20 pl-4 py-1">
          "{contact.lead_score_explanation}"
         </p>
        )}
       </div>
      </div>

      <div className="space-y-6 pt-6 border-t border-white/5">
       <div className="space-y-5">
        <div className="flex items-center gap-4">
         <div className="h-8 w-8 rounded-lg bg-white/[0.03] flex items-center justify-center text-white/20">
          <Mail size={14} />
         </div>
         <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-widest text-white/20 font-black">Email Address</span>
          <span className="text-xs text-white/80 font-bold truncate max-w-[180px]">{contact.email || 'N/A'}</span>
         </div>
        </div>
        <div className="flex items-center gap-4">
         <div className="h-8 w-8 rounded-lg bg-white/[0.03] flex items-center justify-center text-white/20">
          <Phone size={14} />
         </div>
         <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-widest text-white/20 font-black">Phone Number</span>
          <span className="text-xs text-white/80 font-bold">{contact.phone || 'N/A'}</span>
         </div>
        </div>
        <div className="flex items-center gap-4">
         <div className="h-8 w-8 rounded-lg bg-white/[0.03] flex items-center justify-center text-white/20">
          <MapPin size={14} />
         </div>
         <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-widest text-white/20 font-black">Traffic Source</span>
          <span className="text-xs text-white/80 font-bold uppercase tracking-tighter">{contact.source || 'Direct'}</span>
         </div>
        </div>
        <div className="flex items-center gap-4">
         <div className="h-8 w-8 rounded-lg bg-white/[0.03] flex items-center justify-center text-white/20">
          <Calendar size={14} />
         </div>
         <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-widest text-white/20 font-black">Member Since</span>
          <span className="text-xs text-white/80 font-bold">{format(new Date(contact.created_at), 'MMMM d, yyyy')}</span>
         </div>
        </div>
       </div>

       <div className="pt-6 border-t border-white/5 space-y-4">
        <div className="flex items-center justify-between">
         <span className="text-[9px] uppercase tracking-widest text-white/20 font-black flex items-center gap-2">
          <Tag size={12} className="text-primary" /> Tags
         </span>
         <button
          className="btn btn-icon btn-xs btn-outline-theme-border rounded-lg"
          onClick={() => setIsAddingTag(!isAddingTag)}
         >
          <Plus className={`h-3 w-3 transition-transform ${isAddingTag ? 'rotate-45 text-primary' : ''}`} />
         </button>
        </div>

        {isAddingTag && (
         <form onSubmit={handleAddTag} className="animate-in fade-in slide-in-from-top-2">
          <div className="relative">
           <input
            autoFocus
            placeholder="Add new tag..."
            className="w-full h-10 bg-white/[0.03] border border-white/5 text-[10px] uppercase font-black tracking-widest px-4 rounded-xl outline-none focus:border-primary/30 transition-all"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            disabled={isLoading}
           />
           {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
             <Loader2 className="h-3 w-3 animate-spin text-primary" />
            </div>
           )}
          </div>
         </form>
        )}

        <div className="flex flex-wrap gap-1.5">
         {contact.tags?.map(tag => (
          <Badge key={tag} className="bg-primary/5 text-primary border border-primary/10 px-2.5 py-0.5 rounded-sm text-[8px] font-black tracking-widest transition-all hover:bg-primary hover:text-white uppercase">
           {tag}
          </Badge>
         ))}
         {(!contact.tags || contact.tags.length === 0) && !isAddingTag && <span className="text-[10px] text-white/10 uppercase font-black tracking-widest">No tags</span>}
        </div>
       </div>
      </div>
     </div>
    </div>

    {/* Main Content (Tabs) */}
    <div className="col-span-12 lg:col-span-8 xxl:col-span-9">
     {children}
    </div>
   </div>
  </div>
 );
}
