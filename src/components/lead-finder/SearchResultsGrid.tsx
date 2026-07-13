'use client';

import React, { useState } from 'react';
import { LeadResultCard } from './LeadResultCard';
import { BulkActionsToolbar } from './BulkActionsToolbar';
import { Globe, MapPin, Phone, Building2 } from 'lucide-react';

interface SearchResultsGridProps {
  results: any[];
}

export function SearchResultsGrid({ results }: SearchResultsGridProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewLead, setPreviewLead] = useState<any | null>(null);

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = (select: boolean) => {
    if (select) {
      setSelectedIds(new Set(results.map(r => r.place_id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // We map the full objects based on selected IDs for bulk actions
  const selectedLeads = results.filter(r => selectedIds.has(r.place_id));

  return (
    <div className="space-y-6">
      <BulkActionsToolbar 
        selectedLeads={selectedLeads}
        allLeads={results}
        onSelectAll={handleSelectAll}
        onClearSelection={() => setSelectedIds(new Set())}
        onRefresh={() => {}}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {results.map((lead) => (
          <LeadResultCard 
            key={lead.place_id} 
            lead={lead} 
            selected={selectedIds.has(lead.place_id)}
            onSelect={handleSelect}
            onPreview={setPreviewLead}
          />
        ))}
      </div>

      {/* Preview Modal MVP */}
      {previewLead && (
        <div className="fixed inset-0 bg-dash-text/40 z-[100] flex items-center justify-center p-4">
          <div className="bg-white border border-dash-border rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <span className="text-xs font-black tracking-widest text-dash-accent bg-dash-accent/10 px-3 py-1 rounded-sm mb-3 inline-block">
                    {previewLead.category || 'Business'}
                  </span>
                  <h2 className="text-3xl font-black !text-dash-text">{previewLead.business_name}</h2>
                </div>
              </div>

              <div className="space-y-4 !text-dash-textMuted bg-dash-surface0 rounded-2xl p-6 border border-dash-border">
                {previewLead.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="text-dash-accent shrink-0" />
                    <span>{previewLead.address}</span>
                  </div>
                )}
                {previewLead.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="text-dash-accent shrink-0" />
                    <a href={`tel:${previewLead.phone}`} className="hover:!text-dash-text transition-colors">{previewLead.phone}</a>
                  </div>
                )}
                {previewLead.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="text-dash-accent shrink-0" />
                    <a href={previewLead.website} target="_blank" rel="noopener noreferrer" className="text-dash-accent hover:underline">
                      {previewLead.website}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Building2 className="text-dash-accent shrink-0" />
                  <span>Google Place ID: <span className="font-mono text-xs opacity-70">{previewLead.place_id}</span></span>
                </div>
              </div>
            </div>
            <div className="p-6 bg-white border-t border-dash-border flex justify-end gap-3">
              <button 
                onClick={() => setPreviewLead(null)}
                className="px-6 py-2.5 bg-dash-surface hover:bg-dash-border/60 !text-dash-text rounded-xl font-bold tracking-wider transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
