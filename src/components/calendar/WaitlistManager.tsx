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
    toast.success('Spot offered — expires in 2 hours');
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
      <span className="text-[10px] font-bold !text-dash-textMuted border-b border-dash-border pb-2 block">Select event stream</span>
      {allSessions.map(s => (
        <button
         key={s.id}
         onClick={() => changeSession(s)}
         className={cn(
           "w-full p-4 rounded-2xl border transition-all motion-reduce:transition-none text-left group",
           activeSession.id === s.id ? "bg-dash-accent/10 border-dash-accent" : "bg-white border-dash-border hover:border-dash-text/20"
         )}
        >
         <div className="flex flex-col">
           <span className={cn("text-xs font-bold transition-colors motion-reduce:transition-none", activeSession.id === s.id ? "!text-dash-text" : "!text-dash-textMuted group-hover:!text-dash-text")}>
            {s.title}
           </span>
           <span className="text-[10px] !text-dash-textMuted font-bold mt-1">
            {format(new Date(s.start_time), 'MMM d, HH:mm')}
           </span>
         </div>
        </button>
      ))}
     </div>

     <Card className="bg-white border-dash-border rounded-[32px] overflow-hidden shadow-sm">
      <CardHeader className="pb-4">
       <CardTitle className="text-lg font-bold !text-dash-text">Session capacity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
       <div className="flex items-center justify-between p-4 rounded-2xl bg-dash-surface border border-dash-border">
         <div className="flex flex-col">
          <span className="text-[10px] font-bold !text-dash-textMuted">Attendance</span>
          <span className="text-2xl font-bold !text-dash-text">{activeSession.current_attendee_count}/{activeSession.max_attendees}</span>
         </div>
         <Badge className={cn(
          "px-3 py-1 rounded-lg border-none text-[10px] font-bold",
          activeSession.current_attendee_count >= activeSession.max_attendees ? "bg-red/10 text-red" : "bg-green/10 text-green"
         )}>
          {activeSession.current_attendee_count >= activeSession.max_attendees ? 'Waitlist Active' : 'Spots Open'}
         </Badge>
       </div>

       <div className="space-y-3">
         <div className="flex items-center gap-2 !text-dash-textMuted">
          <div className="h-1.5 w-1.5 rounded-full bg-dash-accent" />
          <span className="text-[10px] font-bold">Real-time sync enabled</span>
         </div>
         <div className="flex items-center gap-2 !text-dash-textMuted">
          <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          <span className="text-[10px] font-bold">Automatic promotion: on</span>
         </div>
       </div>
      </CardContent>
     </Card>

     {/* Add User Form */}
     <div className="p-8 rounded-[32px] bg-white border border-dash-border space-y-4 shadow-sm">
      <div className="flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-dash-accent" />
        <span className="text-xs font-bold !text-dash-text">Manual enrollment</span>
      </div>
      <div className="flex gap-2">
        <Input
         placeholder="user@email.com"
         value={emailToAdd}
         onChange={(e) => setEmailToAdd(e.target.value)}
         className="bg-white border-dash-border !text-dash-text rounded-xl h-10 text-xs"
        />
        <Button
         onClick={handleAddUser}
         disabled={isAdding}
         className="h-10 w-10 p-0 rounded-xl bg-dash-accent hover:bg-dash-accent/90 transition-colors motion-reduce:transition-none"
        >
         {isAdding ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <PlusCircle className="h-4 w-4" />}
        </Button>
      </div>
      <p className="text-[10px] !text-dash-textMuted">Adds user to waitlist or books immediately if spot opens.</p>
     </div>
   </div>

   {/* Waitlist Table */}
   <div className="md:col-span-2">
     <Card className="bg-white border-dash-border rounded-[32px] overflow-hidden shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b border-dash-border bg-dash-surface">
       <div>
         <CardTitle className="text-lg font-bold !text-dash-text">Queue: {activeSession.title}</CardTitle>
         <CardDescription className="!text-dash-textMuted text-xs">Sequential promotion queue</CardDescription>
       </div>
       <Badge variant="outline" className="bg-dash-accent/5 border-dash-accent/20 text-dash-accent">{waitlist.length} Waiting</Badge>
      </CardHeader>
      <CardContent className="p-0">
       <div className="overflow-x-auto text-[13px]">
         <table className="w-full text-left">
          <thead className="text-[10px] font-bold !text-dash-textMuted border-b border-dash-border">
           <tr>
            <th className="px-6 py-4">Pos</th>
            <th className="py-4">Contact</th>
            <th className="py-4">Status</th>
            <th className="px-6 py-4 text-right">Actions</th>
           </tr>
          </thead>
          <tbody className="divide-y divide-dash-border">
           {waitlist.length === 0 && (
            <tr>
              <td colSpan={4} className="px-6 py-20 text-center !text-dash-textMuted opacity-60">
               Waitlist is currently empty.
              </td>
            </tr>
           )}
           {waitlist.map((entry) => (
            <tr key={entry.id} className="group hover:bg-dash-surface transition-colors motion-reduce:transition-none">
             <td className="px-6 py-6 border-r border-dash-border">
              <span className="text-xl font-bold !text-dash-text">#{entry.position}</span>
             </td>
             <td className="py-6 px-4">
              <div className="flex flex-col">
                <span className="text-sm font-bold !text-dash-text">{entry.contact?.first_name || 'Guest'} {entry.contact?.last_name || ''}</span>
                <span className="text-[11px] !text-dash-textMuted">{entry.contact?.email}</span>
              </div>
             </td>
             <td className="py-6">
              {entry.offered_at ? (
               <div className="flex flex-col gap-1.5">
                 <div className="flex items-center gap-1.5">
                  <Timer className="h-3 w-3 text-amber-600 animate-pulse motion-reduce:animate-none" />
                  <span className="text-[10px] font-bold text-amber-600">Offer sent</span>
                 </div>
                 <div className="text-[9px] font-bold !text-dash-textMuted tabular-nums font-mono">
                  Expires: {format(new Date(entry.offer_expires_at), 'HH:mm')}
                 </div>
               </div>
              ) : (
               <span className="text-[10px] font-bold !text-dash-textMuted">Waiting</span>
              )}
             </td>
             <td className="px-6 py-6 text-right">
              {!entry.offered_at && (
               <Button
                onClick={() => handleManualOffer(entry.id)}
                disabled={isPending}
                className="h-9 px-4 rounded-xl bg-dash-surface border border-dash-border text-[11px] font-bold !text-dash-text hover:bg-dash-accent hover:border-dash-accent hover:text-white transition-all motion-reduce:transition-none group/btn"
               >
                 {isPending ? <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none mr-2" /> : 'Offer Spot'}
                 <Send className="h-3 w-3 ml-2 group-hover/btn:translate-x-1 motion-reduce:group-hover/btn:translate-x-0 transition-transform motion-reduce:transition-none" />
               </Button>
              )}
              {entry.offered_at && (
               <div className="flex items-center justify-end gap-2 text-dash-accent">
                 <span className="text-[10px] font-bold">Active offer</span>
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
