'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings, Copy, ExternalLink, Globe, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { createCalendar } from '@/app/actions/calendar';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Calendar {
 id: string;
 name: string;
 slug: string;
 slot_duration: number;
}

interface CalendarListProps {
 calendars: Calendar[];
}

export function CalendarList({ calendars }: CalendarListProps) {
 const [isOpen, setIsOpen] = React.useState(false);
 const [isSubmitting, setIsSubmitting] = React.useState(false);
 const [formData, setFormData] = React.useState({
  name: '',
  slug: '',
  slotDuration: 30,
 });

 const copyLink = (slug: string) => {
  const url = `${window.location.origin}/book/${slug}`;
  navigator.clipboard.writeText(url);
  toast.success('Booking link copied to clipboard');
 };

 const generateSlug = (name: string) =>
  name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

 const handleCreate = async () => {
  if (!formData.name || !formData.slug) {
   toast.error('Name and Slug are required');
   return;
  }

  setIsSubmitting(true);
  try {
   const res = await createCalendar(formData);
   if (res.success) {
    toast.success('Calendar created successfully');
    setIsOpen(false);
    setFormData({ name: '', slug: '', slotDuration: 30 });
   } else {
    toast.error(res.error ?? 'Failed to create calendar');
   }
  } catch {
   toast.error('Failed to create calendar');
  } finally {
   setIsSubmitting(false);
  }
 };

 return (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">

   {/* Create New Calendar Button */}
   <button
    onClick={() => setIsOpen(true)}
    className="flex flex-col items-center justify-center p-8 rounded-[32px] border-2 border-dashed border-white/5 hover:border-[#6c47ff]/50 bg-white/[0.02] hover:bg-[#6c47ff]/5 transition-all duration-500 group text-center"
   >
    <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-[#6c47ff] transition-all duration-500">
     <Plus className="h-6 w-6 text-white" />
    </div>
    <span className="text-sm font-bold text-white/60 group-hover:text-white transition-colors">
     Create New Calendar
    </span>
   </button>

   {/* Create Calendar Dialog (controlled) */}
   <Dialog open={isOpen} onOpenChange={setIsOpen}>
    <DialogContent className="bg-[#0b0b14] border-white/10 text-white rounded-[40px] max-w-md p-8">
     <DialogHeader>
      <div className="flex items-center gap-2 mb-2">
       <Sparkles className="h-4 w-4 text-[#6c47ff]" />
       <span className="text-[10px] font-black text-[#6c47ff] uppercase tracking-widest">
        New Engine Instance
       </span>
      </div>
      <DialogTitle className="text-2xl font-black uppercase tracking-tighter">
       Create <span className="text-white/20">Booking Node</span>
      </DialogTitle>
     </DialogHeader>

     <div className="space-y-6 py-6">
      <div className="space-y-2">
       <Label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
        Display Name
       </Label>
       <Input
        value={formData.name}
        onChange={(e) => {
         const name = e.target.value;
         setFormData((prev) => ({
          ...prev,
          name,
          slug:
           prev.slug === generateSlug(prev.name)
            ? generateSlug(name)
            : prev.slug,
         }));
        }}
        placeholder="e.g. Discovery Call"
        className="bg-white/5 border-white/5 text-white h-12 rounded-xl"
       />
      </div>

      <div className="space-y-2">
       <Label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
        URL Slug
       </Label>
       <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-xs">
         book/
        </span>
        <Input
         value={formData.slug}
         onChange={(e) =>
          setFormData((prev) => ({
           ...prev,
           slug: generateSlug(e.target.value),
          }))
         }
         className="bg-white/5 border-white/5 text-white h-12 rounded-xl pl-12"
        />
       </div>
      </div>

      <div className="space-y-2">
       <Label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
        Slot Duration (Min)
       </Label>
       <Input
        type="number"
        value={formData.slotDuration}
        onChange={(e) =>
         setFormData((prev) => ({
          ...prev,
          slotDuration: parseInt(e.target.value) || 30,
         }))
        }
        className="bg-white/5 border-white/5 text-white h-12 rounded-xl"
       />
      </div>
     </div>

     <DialogFooter>
      <Button
       onClick={handleCreate}
       disabled={isSubmitting}
       className="w-full h-14 bg-[#6c47ff] hover:bg-[#5b3ce0] text-white font-black uppercase rounded-2xl shadow-lg shadow-[#6c47ff]/20"
      >
       {isSubmitting ? (
        <Loader2 className="h-5 w-5 animate-spin" />
       ) : (
        'Initialize Calendar'
       )}
      </Button>
     </DialogFooter>
    </DialogContent>
   </Dialog>

   {/* Existing Calendars */}
   {calendars.map((calendar) => (
    <Card
     key={calendar.id}
     className="bg-[#0b0b14] border-white/5 rounded-[32px] overflow-hidden group hover:border-white/10 transition-all duration-500"
    >
     <CardHeader className="pb-4">
      <div className="flex items-center justify-between">
       <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#6c47ff]/20 to-[#8b5cf6]/20 flex items-center justify-center border border-white/5">
        <Globe className="h-5 w-5 text-[#6c47ff]" />
       </div>
       <div className="flex items-center gap-1">
        <Button
         variant="ghost"
         size="icon"
         className="h-8 w-8 rounded-lg text-white/20 hover:text-white"
         onClick={() => copyLink(calendar.slug)}
        >
         <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
         variant="ghost"
         size="icon"
         className="h-8 w-8 rounded-lg text-white/20 hover:text-white"
        >
         <Settings className="h-3.5 w-3.5" />
        </Button>
       </div>
      </div>
      <CardTitle className="text-xl font-bold mt-4 text-white uppercase tracking-tighter">
       {calendar.name}
      </CardTitle>
      <div className="flex items-center gap-2 mt-1">
       <Badge
        variant="outline"
        className="bg-white/5 border-white/5 text-white/40 text-[9px] font-bold uppercase tracking-widest"
       >
        {calendar.slot_duration} Min Session
       </Badge>
       <Badge
        variant="outline"
        className="bg-emerald-500/5 border-emerald-500/10 text-emerald-500 text-[9px] font-bold uppercase tracking-widest"
       >
        Active Link
       </Badge>
      </div>
     </CardHeader>
     <CardContent>
      <div className="pt-4 border-t border-white/5 mt-2 flex items-center justify-between">
       <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
        Booking Active
       </div>
       <Button className="bg-white/5 hover:bg-white/10 text-white rounded-xl h-9 px-4 gap-2 text-xs font-bold border border-white/5">
        View Page
        <ExternalLink className="h-3 w-3" />
       </Button>
      </div>
     </CardContent>
    </Card>
   ))}
  </div>
 );
}
