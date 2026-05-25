'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, MapPin, Phone, Globe, Star, Users, Plus, Check, Search, Linkedin, Facebook, Activity } from 'lucide-react';
import { addLeadsToCRM } from '@/app/actions/lead-finder';

interface LeadResultCardProps {
  lead: any;
  selected: boolean;
  onSelect: (id: string) => void;
  onPreview: (lead: any) => void;
}

export function LeadResultCard({ lead, selected, onSelect, onPreview }: LeadResultCardProps) {
  const [adding, setAdding] = React.useState(false);
  const [added, setAdded] = React.useState(lead.status === 'added_to_crm');

  const handleAddSingle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (added || adding) return;
    
    setAdding(true);
    const { success } = await addLeadsToCRM([lead], []);
    setAdding(false);
    if (success) setAdded(true);
  };

  return (
    <div 
      className={`relative bg-n900 border rounded-2xl p-5 transition-all cursor-pointer group ${
        selected ? 'border-accent shadow-[0_0_15px_rgba(37,99,235,0.2)]' : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
      }`}
      onClick={() => onSelect(lead.place_id)}
    >
      {/* Selection Checkbox */}
      <div className="absolute top-4 right-4">
        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
          selected ? 'bg-accent border-accent text-white' : 'border-white/20 group-hover:border-white/40 text-transparent'
        }`}>
          <Check size={14} strokeWidth={3} />
        </div>
      </div>

      <div className="pr-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-black/20 border border-white/5">
            <div className="group/icon relative" title="Google Places Source">
              <Search size={12} className="text-emerald-400" />
            </div>
            <div className="group/icon relative" title={lead.linkedin_url ? "LinkedIn Enriched" : "No LinkedIn Data"}>
              <Linkedin size={12} className={lead.linkedin_url ? "text-[#0A66C2]" : "text-white/20"} />
            </div>
            <div className="group/icon relative" title={lead.facebook_url ? "Facebook Enriched" : "No Facebook Data"}>
              <Facebook size={12} className={lead.facebook_url ? "text-[#1877F2]" : "text-white/20"} />
            </div>
          </div>
          
          <span className="text-[10px] font-black uppercase tracking-widest text-accent bg-accent/10 px-2 py-0.5 rounded-sm truncate max-w-[100px]">
            {lead.category || 'Business'}
          </span>
          {lead.rating > 0 && (
            <span className="flex items-center gap-1 text-amber-400 text-xs font-bold shrink-0">
              <Star size={12} className="fill-amber-400" /> {lead.rating} <span className="text-t4 font-normal">({lead.review_count})</span>
            </span>
          )}
        </div>
        
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="text-lg font-space font-bold text-white line-clamp-1 group-hover:text-accent transition-colors">
            {lead.business_name}
          </h3>
          
          {lead.lead_score > 0 && (
            <div className={`flex items-center gap-1 shrink-0 px-2 py-1 rounded text-xs font-bold border ${
              lead.lead_score >= 80 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
              lead.lead_score >= 60 ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
              lead.lead_score >= 40 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
              'bg-red-500/10 text-red-400 border-red-500/20'
            }`} title="Lead Score">
              <Activity size={12} /> {lead.lead_score}
            </div>
          )}
        </div>

        <div className="space-y-2 text-sm text-t3">
          {lead.address && (
            <div className="flex items-start gap-2">
              <MapPin size={16} className="text-t4 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{lead.address}</span>
            </div>
          )}
          {lead.phone && (
            <div className="flex items-center gap-2">
              <Phone size={16} className="text-t4 shrink-0" />
              <span>{lead.phone}</span>
            </div>
          )}
          {lead.employee_size && lead.employee_size !== 'Unknown' && (
            <div className="flex items-center gap-2">
              <Users size={16} className="text-t4 shrink-0" />
              <span>{lead.employee_size} Employees</span>
            </div>
          )}
          {lead.website && (
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-t4 shrink-0" />
              <a 
                href={lead.website} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-accent hover:underline line-clamp-1"
                onClick={e => e.stopPropagation()}
              >
                {new URL(lead.website).hostname.replace('www.', '')}
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
        {lead.id ? (
          <Link
            href={`/lead-finder/lead/${lead.id}`}
            className="text-xs font-bold text-t2 hover:text-white uppercase tracking-wider transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            Open Workspace
          </Link>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview(lead);
            }}
            className="text-xs font-bold text-t2 hover:text-white uppercase tracking-wider transition-colors"
          >
            Preview
          </button>
        )}
        <button
          onClick={handleAddSingle}
          disabled={added || adding}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            added 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-white/5 text-white hover:bg-accent hover:border-accent border border-white/10'
          }`}
        >
          {added ? (
            <><Check size={14} /> Added</>
          ) : adding ? (
            <><Users size={14} className="animate-pulse" /> Adding...</>
          ) : (
            <><Plus size={14} /> To CRM</>
          )}
        </button>
      </div>
    </div>
  );
}
