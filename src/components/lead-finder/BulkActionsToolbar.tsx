'use client';

import React, { useState } from 'react';
import { Users, Tag, Download, CheckSquare, Square, Loader2 } from 'lucide-react';
import { addLeadsToCRM } from '@/app/actions/lead-finder';
import { toast } from 'sonner';

interface BulkActionsToolbarProps {
  selectedLeads: any[];
  allLeads: any[];
  onSelectAll: (select: boolean) => void;
  onClearSelection: () => void;
  onRefresh: () => void;
}

export function BulkActionsToolbar({ 
  selectedLeads, 
  allLeads, 
  onSelectAll, 
  onClearSelection,
  onRefresh
}: BulkActionsToolbarProps) {
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [showTags, setShowTags] = useState(false);

  const selectedCount = selectedLeads.length;
  const totalCount = allLeads.length;
  const isAllSelected = selectedCount > 0 && selectedCount === totalCount;

  const handleBulkAdd = async () => {
    if (selectedCount === 0) return;
    setLoading(true);
    const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
    const { success, addedCount } = await addLeadsToCRM(selectedLeads, tags);
    setLoading(false);
    
    if (success) {
      toast.success(`Successfully added ${addedCount} leads to CRM Contacts.`);
      onClearSelection();
      setShowTags(false);
      setTagInput('');
      onRefresh(); // Refresh statuses
    } else {
      toast.error('Failed to add some leads to CRM.');
    }
  };

  const handleExportCSV = () => {
    if (selectedCount === 0) return;
    
    const headers = ['Business Name', 'Category', 'Address', 'Phone', 'Website', 'Rating', 'Reviews', 'LinkedIn URL', 'Facebook URL', 'Employee Size', 'Lead Score'];
    const rows = selectedLeads.map(l => [
      `"${(l.business_name || '').replace(/"/g, '""')}"`,
      `"${(l.category || '').replace(/"/g, '""')}"`,
      `"${(l.address || '').replace(/"/g, '""')}"`,
      `"${(l.phone || '').replace(/"/g, '""')}"`,
      `"${(l.website || '').replace(/"/g, '""')}"`,
      l.rating || '',
      l.review_count || '',
      `"${(l.linkedin_url || '').replace(/"/g, '""')}"`,
      `"${(l.facebook_url || '').replace(/"/g, '""')}"`,
      `"${(l.employee_size || '').replace(/"/g, '""')}"`,
      l.lead_score || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leadsmind_export_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-n800 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sticky top-4 z-40 shadow-2xl">
      <div className="flex items-center gap-4">
        <button
          onClick={() => onSelectAll(!isAllSelected)}
          className="flex items-center gap-2 text-sm font-bold text-t2 hover:text-white transition-colors"
        >
          {isAllSelected ? <CheckSquare size={18} className="text-accent" /> : <Square size={18} />}
          Select All ({totalCount})
        </button>
        
        {selectedCount > 0 && (
          <div className="px-3 py-1 bg-accent/20 text-accent rounded-full text-xs font-black uppercase tracking-wider">
            {selectedCount} Selected
          </div>
        )}
      </div>

      <div className={`flex flex-wrap items-center gap-3 transition-opacity ${selectedCount === 0 ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        
        {showTags ? (
          <div className="flex items-center gap-2 bg-n900 border border-white/10 rounded-lg p-1 animate-in fade-in zoom-in duration-200">
            <input 
              type="text"
              placeholder="Comma separated tags..."
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-white px-3 w-48 placeholder-white/20"
            />
            <button 
              onClick={handleBulkAdd}
              disabled={loading}
              className="px-4 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-md text-xs font-bold uppercase transition-colors flex items-center gap-2"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : 'Confirm'}
            </button>
            <button 
              onClick={() => setShowTags(false)}
              className="px-3 py-1.5 text-t3 hover:text-white text-xs font-bold uppercase"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => setShowTags(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white transition-all"
            >
              <Tag size={16} /> Add with Tags
            </button>

            <button
              onClick={handleBulkAdd}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
              Import to CRM
            </button>
          </>
        )}

        <div className="w-px h-8 bg-white/10 hidden md:block"></div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 p-2 text-t3 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          title="Export CSV"
        >
          <Download size={18} />
        </button>
      </div>
    </div>
  );
}
