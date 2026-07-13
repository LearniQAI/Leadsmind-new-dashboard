'use client';

import React, { useState } from 'react';
import { discoverAndSaveContacts } from '@/app/actions/contact-workspace';
import { Users, Search, Linkedin, Mail, ShieldAlert, ShieldCheck, Shield, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  title: string;
  department: string;
  confidence_level: 'High' | 'Medium' | 'Low';
  linkedin_url: string;
  email: string;
}

export function ContactDiscoveryPanel({ leadId, businessName, website, initialContacts }: { leadId: string, businessName: string, website?: string, initialContacts: Contact[] }) {
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);

  const handleDiscover = async () => {
    setLoading(true);
    await discoverAndSaveContacts(leadId, businessName, website);
    // In a real app we'd fetch the latest or rely on router.refresh, but since we are server-side we can just refresh the page.
    window.location.reload();
  };

  const getConfidenceIcon = (level: string) => {
    if (level === 'High') return <ShieldCheck size={16} className="text-emerald-400" />;
    if (level === 'Medium') return <Shield size={16} className="text-amber-400" />;
    return <ShieldAlert size={16} className="text-red-400" />;
  };

  return (
    <div className="bg-white border border-dash-border rounded-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold !text-dash-text flex items-center gap-2">
          <Users className="text-dash-accent" /> Key Contacts
        </h3>
        
        <button
          onClick={handleDiscover}
          disabled={loading || contacts.length > 0}
          className="px-4 py-2 bg-dash-surface hover:bg-dash-border/60 !text-dash-text rounded-xl text-xs font-bold tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          {contacts.length > 0 ? 'Contacts Discovered' : 'Discover Contacts'}
        </button>
      </div>

      {contacts.length === 0 ? (
        <div className="text-center p-8 bg-white border border-dash-border rounded-2xl">
          <Users size={32} className="!text-dash-textMuted mx-auto mb-3 opacity-50" />
          <p className="text-sm !text-dash-textMuted">No contacts discovered yet. Run discovery to find key decision makers.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contacts.map(c => (
            <Link key={c.id} href={`/lead-finder/contact/${c.id}`}>
              <div className="bg-white border border-dash-border hover:border-dash-accent/50 rounded-2xl p-4 transition-all group h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="!text-dash-text font-bold group-hover:text-dash-accent transition-colors">
                        {c.first_name} {c.last_name}
                      </h4>
                      <p className="text-xs !text-dash-textMuted">{c.title || c.department}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-dash-surface px-2 py-1 rounded text-[10px] font-bold tracking-widest !text-dash-textMuted" title={`${c.confidence_level} Confidence`}>
                      {getConfidenceIcon(c.confidence_level)} {c.confidence_level}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 mt-4">
                    {c.linkedin_url && <Linkedin size={14} className="text-[#0A66C2]" />}
                    {c.email && <Mail size={14} className="!text-dash-textMuted" />}
                  </div>
                </div>
                
                <div className="mt-4 pt-3 border-t border-dash-border flex items-center justify-between text-xs font-bold !text-dash-textMuted group-hover:!text-dash-text tracking-wider transition-colors">
                  View Profile <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
