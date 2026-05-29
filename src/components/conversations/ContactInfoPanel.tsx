'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface ContactInfoPanelProps {
  contact: any;
}

export function ContactInfoPanel({ contact }: ContactInfoPanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<'info' | 'tickets'>('info');
  const [tickets, setTickets] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (contact?.id) {
      // Fetch tickets
      import('@supabase/auth-helpers-nextjs').then(({ createClientComponentClient }) => {
        const supabase = createClientComponentClient();
        supabase.from('support_tickets').select('*').eq('contact_id', contact.id)
          .then(({ data }) => setTickets(data || []));
      });
    }
  }, [contact?.id]);

  if (!contact) return null;

  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
  const closedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;

  return (
    <div className="w-[240px] border-l border-white/5 flex flex-col bg-[#080f28] h-full shrink-0 overflow-y-auto no-scrollbar">
      {/* Profile Section */}
      <div className="p-6 flex flex-col items-center text-center border-b border-white/5">
        <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#eef2ff] font-bold text-2xl mb-4 font-space-grotesk overflow-hidden shadow-2xl">
          {contact.avatar_url ? (
            <img src={contact.avatar_url} className="w-full h-full object-cover" />
          ) : (
            contact.first_name?.[0] || 'U'
          )}
        </div>
        <h3 className="text-[15px] font-bold text-[#eef2ff] font-space-grotesk mb-1">
          {contact.first_name} {contact.last_name}
        </h3>
        <p className="text-[12px] text-[#4a5a82] font-dm-sans mb-4 break-all px-2">{contact.email || 'No email provided'}</p>
        
        <div className="flex flex-wrap justify-center gap-1.5">
          <div className="bg-[#2563eb]/15 text-[#3b82f6] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest font-dm-sans">
            Lead
          </div>
          <div className="bg-[#10b981]/15 text-[#10b981] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest font-dm-sans">
            Active
          </div>
        </div>
      </div>

      <div className="flex border-b border-white/5">
        <button 
          onClick={() => setActiveTab('info')}
          className={cn("flex-1 py-3 text-[11px] font-bold uppercase tracking-wider", activeTab === 'info' ? "text-[#eef2ff] border-b-2 border-[#3b82f6]" : "text-[#4a5a82] hover:text-[#94a3c8]")}
        >
          Info
        </button>
        <button 
          onClick={() => setActiveTab('tickets')}
          className={cn("flex-1 py-3 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1", activeTab === 'tickets' ? "text-[#eef2ff] border-b-2 border-[#3b82f6]" : "text-[#4a5a82] hover:text-[#94a3c8]")}
        >
          Tickets
          {tickets.length > 0 && (
            <span className="bg-[#3b82f6] text-white text-[9px] px-1.5 py-0.5 rounded-full">{tickets.length}</span>
          )}
        </button>
      </div>

      {activeTab === 'info' ? (
        <div className="p-6 space-y-6">
          {contact.pipeline_stage && (
            <div>
              <h4 className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[1.2px] mb-3 font-dm-sans">
                Pipeline Stage
              </h4>
              <div className="flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-[12px] p-3">
                <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
                <span className="text-[13px] font-semibold text-[#eef2ff] font-dm-sans">{contact.pipeline_stage}</span>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[1.2px] mb-3 font-dm-sans">
              Contact Details
            </h4>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-phone text-[#4a5a82] text-[12px]"></i>
                <span className="text-[12.5px] text-[#94a3c8] font-dm-sans">{contact.phone || 'No phone provided'}</span>
              </div>
              {contact.email && (
                <div className="flex items-center gap-3">
                  <i className="fa-solid fa-envelope text-[#4a5a82] text-[12px]"></i>
                  <span className="text-[12.5px] text-[#94a3c8] font-dm-sans break-all">{contact.email}</span>
                </div>
              )}
              {contact.city && (
                <div className="flex items-center gap-3">
                  <i className="fa-solid fa-location-dot text-[#4a5a82] text-[12px]"></i>
                  <span className="text-[12.5px] text-[#94a3c8] font-dm-sans">{contact.city}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 text-center">
              <span className="block text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest mb-1">Open</span>
              <span className="block text-xl font-black text-amber-500">{openTickets}</span>
            </div>
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 text-center">
              <span className="block text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest mb-1">Closed</span>
              <span className="block text-xl font-black text-emerald-500">{closedTickets}</span>
            </div>
          </div>
          
          <div>
            <h4 className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[1.2px] mb-3 font-dm-sans">
              History
            </h4>
            {tickets.length === 0 ? (
              <p className="text-[12px] text-[#4a5a82] text-center py-4">No tickets found</p>
            ) : (
              <div className="space-y-3">
                {tickets.map(t => (
                  <div key={t.id} className="bg-white/5 border border-white/5 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#94a3c8]">{t.status}</span>
                      <span className="text-[9px] text-[#4a5a82]">{new Date(t.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[12px] font-medium text-white truncate">{t.title}</p>
                    <Button variant="link" className="h-auto p-0 text-[10px] text-[#3b82f6] mt-2 h-0" onClick={() => router.push(`/support/tickets-reply?id=${t.id}`)}>View Ticket</Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
