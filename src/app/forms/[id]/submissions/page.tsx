'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Mail, Database, Search, UserCheck, Eye, Download, CheckCircle, ChevronRight, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function SubmissionsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const { data: formData } = await supabase
          .from('forms')
          .select('name, config, id')
          .eq('id', params.id)
          .single();

        setForm(formData);

        const { data: submissionData } = await supabase
          .from('form_submissions')
          .select('*, contact:contacts(first_name, last_name, email)')
          .eq('form_id', params.id)
          .order('submitted_at', { ascending: false });

        setSubmissions(submissionData || []);
      } catch (err) {
        console.error('Failed to load submissions data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [params.id, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#04081a] p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filteredSubmissions = submissions.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const email = (s.contact?.email || '').toLowerCase();
    const name = (`${s.contact?.first_name || ''} ${s.contact?.last_name || ''}`).toLowerCase();
    return email.includes(q) || name.includes(q) || JSON.stringify(s.data).toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-[#04081a] text-white p-8" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => router.push('/forms')}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/10"
          >
            <ArrowLeft size={18} className="text-[#4a5a82]" />
          </button>
          <div>
            <h1 className="text-2xl font-space-grotesk font-black uppercase tracking-tight">
              {form?.name} Submissions Inbox
            </h1>
            <p className="text-sm text-[#4a5a82]">View and manage raw submitted data</p>
          </div>
        </div>

        {/* KPIs & Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="p-6 bg-[#0c1535] border border-white/5 rounded-2xl flex-1 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-[#4a5a82]">
                <Database className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-black uppercase tracking-widest">Total Captures</span>
              </div>
              <p className="text-3xl font-space-grotesk font-black text-white mt-1">{submissions.length}</p>
            </div>
            
            <div className="relative w-64 hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a5a82]" />
              <input
                type="text"
                placeholder="Search raw data or contacts..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#04081a] border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-[#2563eb] text-white"
              />
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="bg-[#0c1535] border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/5 flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#94a3c8]">Recorded Submissions</h3>
          </div>

          {filteredSubmissions.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#4a5a82] mb-4">
                <CheckCircle size={22} />
              </div>
              <h4 className="text-sm font-black uppercase tracking-wide text-white">No Submissions Found</h4>
              <p className="text-xs text-[#4a5a82] max-w-sm mt-1">
                Your form hasn't received any data yet, or your search query didn't match any records.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[#4a5a82] font-black uppercase tracking-widest text-[9px]">
                    <th className="p-4 pl-6">Contact Record</th>
                    <th className="p-4">Submitted At</th>
                    <th className="p-4">Source Type</th>
                    <th className="p-4">Data Preview</th>
                    <th className="p-4 text-right pr-6">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.map((sub) => {
                    const firstDataKey = Object.keys(sub.data || {})[0];
                    const firstDataValue = firstDataKey ? sub.data[firstDataKey] : '';
                    
                    return (
                      <tr key={sub.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors cursor-pointer" onClick={() => setSelectedSubmission(sub)}>
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold uppercase">
                              {sub.contact?.first_name?.[0] || sub.contact?.email?.[0] || '?'}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-white">{sub.contact?.first_name} {sub.contact?.last_name || ''}</span>
                              <span className="text-[10px] text-[#4a5a82] mt-0.5">{sub.contact?.email || 'Anonymous'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-white/60">
                          {new Date(sub.submitted_at).toLocaleString(undefined, {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td className="p-4">
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-white/5 px-2 py-1 rounded-md text-white/60">
                            {sub.source_type || 'Unknown'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="text-[11px] text-white/50 max-w-[200px] truncate">
                            {firstDataKey ? <><span className="text-white/80">{firstDataKey}:</span> {String(firstDataValue)}</> : 'No custom data'}
                          </div>
                        </td>
                        <td className="p-4 text-right pr-6">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedSubmission(sub); }}
                            className="h-8 px-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-[10px] font-black uppercase tracking-wider text-white flex items-center gap-1.5 ml-auto"
                          >
                            <Eye size={12} /> View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detailed Viewer Modal */}
        <Dialog open={!!selectedSubmission} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
          <DialogContent className="bg-[#0b0b1a] border border-white/10 text-white max-w-2xl font-dm-sans rounded-2xl shadow-2xl p-0 overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-start bg-[#04081a]">
              <div>
                <DialogTitle className="text-lg font-space-grotesk font-black uppercase tracking-tight text-white">
                  Submission Details
                </DialogTitle>
                <DialogDescription className="text-xs text-[#4a5a82] mt-1">
                  Captured on {selectedSubmission ? new Date(selectedSubmission.submitted_at).toLocaleString() : ''}
                </DialogDescription>
              </div>
              <button onClick={() => setSelectedSubmission(null)} className="text-white/40 hover:text-white p-2">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto common-scrollbar bg-[#0b0b1a]">
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#4a5a82] mb-1 block">Contact Email</span>
                  <div className="text-sm text-white flex items-center gap-2">
                    <Mail size={14} className="text-white/40" />
                    {selectedSubmission?.contact?.email || 'Anonymous'}
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#4a5a82] mb-1 block">Source / Embed</span>
                  <div className="text-sm text-white flex items-center gap-2 truncate">
                    <Database size={14} className="text-white/40" />
                    {selectedSubmission?.source_url || selectedSubmission?.source_type || 'Direct'}
                  </div>
                </div>
              </div>

              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#94a3c8] mb-4 border-b border-white/5 pb-2">
                Raw Form Data Payload
              </h4>
              
              {selectedSubmission?.data && Object.keys(selectedSubmission.data).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(selectedSubmission.data).map(([key, value]: [string, any]) => (
                    <div key={key} className="bg-white/[0.02] border border-white/5 rounded-lg p-4">
                      <div className="text-[10px] font-bold text-[#4a5a82] uppercase mb-1">{key}</div>
                      <div className="text-sm text-white break-words">
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-white/40 italic text-center py-8">
                  No custom form fields were captured in this submission.
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
        
      </div>
    </div>
  );
}
