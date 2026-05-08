'use client';

import React, { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Clock, Timer, UserPlus, ArrowRight, ShieldCheck, Mail, Send, Loader2, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { offerWaitlistSpot, addContactToWaitlist, getWaitlistEntries } from '@/app/actions/calendar';
import { format } from 'date-fns';

interface WaitlistManagerProps {
  initialSession: any;
  initialWaitlist: any[];
  allSessions: any[];
}

export function WaitlistManager({ initialSession, initialWaitlist, allSessions }: WaitlistManagerProps) {
  const [activeSession, setActiveSession] = useState(initialSession);
  const [waitlist, setWaitlist] = useState(initialWaitlist);
  const [emailToAdd, setEmailToAdd] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isAdding, setIsAdding] = useState(false);

  const handleManualOffer = async (id: string) => {
    startTransition(async () => {
      const res = await offerWaitlistSpot(id);
      if (res.success) {
        toast.success('Waitlist offer sent via Email');
        // Re-fetch waitlist for state update
        const updated = await getWaitlistEntries(activeSession.id);
        if (updated.success) setWaitlist(updated.data);
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleAddUser = async () => {
    if (!emailToAdd || !emailToAdd.includes('@')) {
      toast.error('Valid email required');
      return;
    }

    setIsAdding(true);
    try {
      const res = await addContactToWaitlist(activeSession.id, emailToAdd);
      if (res.success) {
        toast.success(res.data?.mode === 'booked' ? 'User booked directly!' : 'User added to waitlist!');
        setEmailToAdd('');
        // Re-fetch waitlist
        const updated = await getWaitlistEntries(activeSession.id);
        if (updated.success) setWaitlist(updated.data);
      } else {
        toast.error(res.error);
      }
    } catch (err) {
      toast.error('Failed to add user');
    } finally {
      setIsAdding(false);
    }
  };

  const changeSession = async (session: any) => {
    setActiveSession(session);
    setWaitlist([]); // Clear while loading
    const updated = await getWaitlistEntries(session.id);
    if (updated.success) setWaitlist(updated.data);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Session Selector & Stats */}
      <div className="md:col-span-1 space-y-6">
         {/* Session Selection */}
         <div className="space-y-4">
            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest border-b border-white/5 pb-2 block">Select Event Stream</span>
            {allSessions.map(s => (
               <button 
                  key={s.id}
                  onClick={() => changeSession(s)}
                  className={cn(
                     "w-full p-4 rounded-2xl border transition-all text-left group",
                     activeSession.id === s.id ? "bg-[#6c47ff]/10 border-[#6c47ff]" : "bg-white/[0.02] border-white/5 hover:border-white/20"
                  )}
               >
                  <div className="flex flex-col">
                     <span className={cn("text-xs font-bold transition-colors", activeSession.id === s.id ? "text-white" : "text-white/40 group-hover:text-white/80")}>
                        {s.title}
                     </span>
                     <span className="text-[10px] text-white/20 uppercase font-bold tracking-tighter mt-1">
                        {format(new Date(s.start_time), 'MMM d, HH:mm')}
                     </span>
                  </div>
               </button>
            ))}
         </div>

         <Card className="bg-[#0b0b14] border-white/5 rounded-[32px] overflow-hidden">
           <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-white uppercase italic tracking-wider">Session Capacity</CardTitle>
           </CardHeader>
           <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                 <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Attendance</span>
                    <span className="text-2xl font-black text-white italic">{activeSession.current_attendee_count}/{activeSession.max_attendees}</span>
                 </div>
                 <Badge className={cn(
                   "px-3 py-1 rounded-lg border-none text-[10px] font-black uppercase tracking-widest",
                   activeSession.current_attendee_count >= activeSession.max_attendees ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
                 )}>
                   {activeSession.current_attendee_count >= activeSession.max_attendees ? 'Waitlist Active' : 'Spots Open'}
                 </Badge>
              </div>

              <div className="space-y-3">
                 <div className="flex items-center gap-2 text-white/40">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#6c47ff]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Real-time Sync Enabled</span>
                 </div>
                 <div className="flex items-center gap-2 text-white/40">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#fdab3d]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Automatic Promotion: ON</span>
                 </div>
              </div>
           </CardContent>
         </Card>

         {/* Add User Form */}
         <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 space-y-4">
            <div className="flex items-center gap-2">
               <UserPlus className="h-4 w-4 text-[#6c47ff]" />
               <span className="text-xs font-bold text-white uppercase italic">Manual Enrollment</span>
            </div>
            <div className="flex gap-2">
               <Input 
                  placeholder="user@email.com" 
                  value={emailToAdd}
                  onChange={(e) => setEmailToAdd(e.target.value)}
                  className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-xs"
               />
               <Button 
                  onClick={handleAddUser}
                  disabled={isAdding}
                  className="h-10 w-10 p-0 rounded-xl bg-[#6c47ff] hover:bg-[#5b3ce0]"
               >
                  {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
               </Button>
            </div>
            <p className="text-[10px] text-white/20 italic">Adds user to waitlist or books immediately if spot opens.</p>
         </div>
      </div>

      {/* Waitlist Table */}
      <div className="md:col-span-2">
         <Card className="bg-[#0b0b14] border-white/5 rounded-[32px] overflow-hidden">
           <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 bg-white/[0.01]">
              <div>
                 <CardTitle className="text-lg font-bold text-white uppercase italic tracking-wider">Queue: {activeSession.title}</CardTitle>
                 <CardDescription className="text-white/30 text-xs">Sequential promotion queue</CardDescription>
              </div>
              <Badge variant="outline" className="bg-[#6c47ff]/5 border-[#6c47ff]/20 text-[#6c47ff]">{waitlist.length} Waiting</Badge>
           </CardHeader>
           <CardContent className="p-0">
              <div className="overflow-x-auto text-[13px]">
                 <table className="w-full text-left">
                   <thead className="text-[10px] font-bold text-white/20 uppercase tracking-widest border-b border-white/5">
                     <tr>
                       <th className="px-6 py-4">Pos</th>
                       <th className="py-4">Contact</th>
                       <th className="py-4">Status</th>
                       <th className="px-6 py-4 text-right">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {waitlist.length === 0 && (
                        <tr>
                           <td colSpan={4} className="px-6 py-20 text-center text-white/10 italic">
                             Waitlist is currently empty.
                           </td>
                        </tr>
                     )}
                     {waitlist.map((entry) => (
                       <tr key={entry.id} className="group hover:bg-white/[0.01] transition-colors">
                         <td className="px-6 py-6 border-r border-white/5">
                            <span className="text-xl font-black text-white italic">#{entry.position}</span>
                         </td>
                         <td className="py-6 px-4">
                            <div className="flex flex-col">
                               <span className="text-sm font-bold text-white tracking-tight">{entry.contact?.first_name || 'Guest'} {entry.contact?.last_name || ''}</span>
                               <span className="text-[11px] text-white/30">{entry.contact?.email}</span>
                            </div>
                         </td>
                         <td className="py-6">
                            {entry.offered_at ? (
                              <div className="flex flex-col gap-1.5">
                                 <div className="flex items-center gap-1.5">
                                    <Timer className="h-3 w-3 text-[#fdab3d] animate-pulse" />
                                    <span className="text-[10px] font-black text-[#fdab3d] uppercase tracking-tighter">Offer Sent</span>
                                 </div>
                                 <div className="text-[9px] font-bold text-white/20 uppercase tracking-widest tabular-nums font-mono">
                                    Expires: {format(new Date(entry.offer_expires_at), 'HH:mm')}
                                 </div>
                              </div>
                            ) : (
                              <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Waiting</span>
                            )}
                         </td>
                         <td className="px-6 py-6 text-right">
                            {!entry.offered_at && (
                              <Button 
                                onClick={() => handleManualOffer(entry.id)}
                                disabled={isPending}
                                className="h-9 px-4 rounded-xl bg-white/5 border border-white/5 text-[11px] font-bold text-white hover:bg-[#6c47ff] hover:border-[#6c47ff] transition-all group/btn"
                              >
                                 {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : 'Offer Spot'}
                                 <Send className="h-3 w-3 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                              </Button>
                            )}
                            {entry.offered_at && (
                              <div className="flex items-center justify-end gap-2 text-[#6c47ff]">
                                 <span className="text-[10px] font-black uppercase italic tracking-widest">Active Offer</span>
                                 <ArrowRight className="h-3 w-3" />
                              </div>
                            )}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
              </div>
           </CardContent>
         </Card>
      </div>
    </div>
  );
}
