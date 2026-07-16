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
      className={`relative bg-white border rounded-2xl p-5 transition-all cursor-pointer group ${
        selected ? 'border-dash-accent shadow-[0_0_15px_rgba(37,99,235,0.2)]' : 'border-dash-border hover:border-dash-text/20 hover:bg-dash-surface'
      }`}
      onClick={() => onSelect(lead.place_id)}
    >
      {/* Selection Checkbox */}
      <div className="absolute top-4 right-4">
        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
          selected ? 'bg-dash-accent border-dash-accent text-white' : 'border-dash-border group-hover:border-dash-text/30 text-transparent'
        }`}>
          <Check size={14} strokeWidth={3} />
        </div>
      </div>

      <div className="pr-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-dash-surface border border-dash-border">
            <div className="group/icon relative" title="Google Places Source">
              <Search size={12} className="text-emerald-400" />
            </div>
            <div className="group/icon relative" title={lead.linkedin_url ? "LinkedIn Enriched" : "No LinkedIn Data"}>
              <Linkedin size={12} className={lead.linkedin_url ? "text-[#0A66C2]" : "text-dash-border"} />
            </div>
            <div className="group/icon relative" title={lead.facebook_url ? "Facebook Enriched" : "No Facebook Data"}>
              <Facebook size={12} className={lead.facebook_url ? "text-[#1877F2]" : "text-dash-border"} />
            </div>
          </div>
          
          <span className="text-[10px] font-black tracking-widest text-dash-accent bg-dash-accent/10 px-2 py-0.5 rounded-sm truncate max-w-[100px]">
            {lead.category || 'Business'}
          </span>
          {lead.rating > 0 && (
            <span className="flex items-center gap-1 text-amber-400 text-xs font-bold shrink-0">
              <Star size={12} className="fill-amber-400" /> {lead.rating} <span className="!text-dash-textMuted font-normal">({lead.review_count})</span>
            </span>
          )}
        </div>
        
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="text-lg font-bold !text-dash-text line-clamp-1 group-hover:text-dash-accent transition-colors">
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

        <div className="space-y-2 text-sm !text-dash-textMuted">
          {lead.address && (
            <div className="flex items-start gap-2">
              <MapPin size={16} className="!text-dash-textMuted shrink-0 mt-0.5" />
              <span className="line-clamp-2">{lead.address}</span>
            </div>
          )}
          {lead.phone && (
            <div className="flex items-center gap-2">
              <Phone size={16} className="!text-dash-textMuted shrink-0" />
              <span>{lead.phone}</span>
            </div>
          )}
          {lead.employee_size && lead.employee_size !== 'Unknown' && (
            <div className="flex items-center gap-2">
              <Users size={16} className="!text-dash-textMuted shrink-0" />
              <span>{lead.employee_size} Employees</span>
            </div>
          )}
          {lead.website && (
            <div className="flex items-center gap-2">
              <Globe size={16} className="!text-dash-textMuted shrink-0" />
              <a 
                href={lead.website} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-dash-accent hover:underline line-clamp-1"
                onClick={e => e.stopPropagation()}
              >
                {new URL(lead.website).hostname.replace('www.', '')}
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-dash-border flex items-center justify-between">
        {lead.id ? (
          <Link
            href={`/lead-finder/lead/${lead.id}`}
            className="text-xs font-bold !text-dash-textMuted hover:!text-dash-text tracking-wider transition-colors"
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
            className="text-xs font-bold !text-dash-textMuted hover:!text-dash-text tracking-wider transition-colors"
          >
            Preview
          </button>
        )}
        <button
          onClick={handleAddSingle}
          disabled={added || adding}
          title="Creates a CRM contact only. Convert to a pipeline opportunity separately from the contact's detail page."
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all ${
            added 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-dash-surface !text-dash-text hover:bg-dash-accent hover:!text-white hover:border-dash-accent border border-dash-border'
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
