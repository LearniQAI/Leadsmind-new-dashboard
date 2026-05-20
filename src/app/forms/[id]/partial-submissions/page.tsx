'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Mail, Link as LinkIcon, RefreshCw, Trash2, Clock, CheckCircle, BarChart3, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { RecoveryTokenHandler } from '@/lib/persistence/RecoveryTokenHandler';
import { RecoveryManager } from '@/lib/persistence/RecoveryManager';

export default function PartialSubmissionsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(null);
  const [partials, setPartials] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: formData } = await supabase
          .from('forms')
          .select('name, config, id')
          .eq('id', params.id)
          .single();

        setForm(formData);

        const { data: partialData } = await supabase
          .from('form_partial_submissions')
          .select('*')
          .eq('form_id', params.id)
          .order('updated_at', { ascending: false });

        setPartials(partialData || []);
      } catch (err) {
        console.error('Failed to load partial submissions data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [params.id, supabase]);

  const generateAndCopyLink = async (partial: any) => {
    let token = partial.recovery_token;
    if (!token) {
      // Generate a new secure token and save it
      token = RecoveryTokenHandler.createToken();
      const expiresAt = RecoveryTokenHandler.getExpirationDate(form?.config?.sessionExpirationDays ?? 7);

      const { error } = await supabase
        .from('form_partial_submissions')
        .update({
          recovery_token: token,
          recovery_token_expires_at: expiresAt.toISOString(),
        })
        .eq('id', partial.id);

      if (error) {
        toast.error('Failed to generate recovery link');
        return;
      }
      
      // Update local state
      setPartials(prev =>
        prev.map(p => (p.id === partial.id ? { ...p, recovery_token: token, recovery_token_expires_at: expiresAt } : p))
      );
    }

    const link = RecoveryManager.generateRecoveryLink(params.id, token);
    navigator.clipboard.writeText(link);
    toast.success('Recovery link copied to clipboard!');
  };

  const deletePartial = async (id: string) => {
    const confirm = window.confirm('Are you sure you want to discard this incomplete submission?');
    if (!confirm) return;

    const { error } = await supabase.from('form_partial_submissions').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete incomplete submission');
      return;
    }

    setPartials(prev => prev.filter(p => p.id !== id));
    toast.success('Incomplete submission removed.');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#04081a] p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Calculate statistics
  const totalPartials = partials.length;
  const avgCompletion = totalPartials
    ? Math.round(partials.reduce((sum, p) => sum + (p.completion_percentage || 0), 0) / totalPartials)
    : 0;
  const emailsCollected = partials.filter(p => p.email).length;
  const activeRecoveryLinks = partials.filter(
    p => p.recovery_token && new Date(p.recovery_token_expires_at) > new Date()
  ).length;

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
              {form?.name} Recovery Dashboard
            </h1>
            <p className="text-sm text-[#4a5a82]">Incomplete sessions & auto-save recovery management</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Incomplete Sessions', value: totalPartials, icon: <Clock className="text-amber-400" /> },
            { label: 'Avg. Progress', value: `${avgCompletion}%`, icon: <BarChart3 className="text-blue-400" /> },
            { label: 'Emails Captured', value: emailsCollected, icon: <Mail className="text-indigo-400" /> },
            { label: 'Active Recovery links', value: activeRecoveryLinks, icon: <LinkIcon className="text-emerald-400" /> }
          ].map((kpi, i) => (
            <div key={i} className="p-6 bg-[#0c1535] border border-white/5 rounded-2xl flex flex-col gap-2 relative overflow-hidden">
              <div className="flex items-center gap-2 text-[#4a5a82]">
                {kpi.icon}
                <span className="text-[10px] font-black uppercase tracking-widest">{kpi.label}</span>
              </div>
              <p className="text-3xl font-space-grotesk font-black text-white mt-1">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Table View */}
        <div className="bg-[#0c1535] border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/5 flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#94a3c8]">Incomplete Submissions</h3>
            <span className="text-[10px] font-bold text-[#4a5a82] uppercase bg-white/5 px-2.5 py-1 rounded-lg">
              Auto-save: {form?.config?.autoSaveEnabled ?? true ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          {partials.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#4a5a82] mb-4">
                <CheckCircle size={22} />
              </div>
              <h4 className="text-sm font-black uppercase tracking-wide text-white">No Incomplete Submissions</h4>
              <p className="text-xs text-[#4a5a82] max-w-sm mt-1">
                All form interactions are completed or no sessions have started. Excellent conversion!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[#4a5a82] font-black uppercase tracking-widest text-[9px]">
                    <th className="p-4 pl-6">Contact / Session</th>
                    <th className="p-4">Active Step</th>
                    <th className="p-4">Progress</th>
                    <th className="p-4">Last Active</th>
                    <th className="p-4 text-right pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {partials.map((partial) => (
                    <tr key={partial.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-white">{partial.email || 'Anonymous Contact'}</span>
                          <span className="text-[10px] text-[#4a5a82] mt-0.5 font-mono">{partial.session_id.substring(0, 8)}...</span>
                        </div>
                      </td>
                      <td className="p-4 text-white/80">
                        {partial.current_step_id ? (
                          <span className="capitalize">{partial.current_step_id.replace(/_/g, ' ')}</span>
                        ) : (
                          <span className="text-[#4a5a82] font-bold">Unstarted</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-[#60a5fa]">{Math.round(partial.completion_percentage)}%</span>
                          <div className="w-20 bg-white/10 h-1 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-full" style={{ width: `${partial.completion_percentage}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-white/60">
                        {new Date(partial.updated_at).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="p-4 text-right pr-6">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => generateAndCopyLink(partial)}
                            className="h-8 px-3 rounded-lg bg-blue-600/10 border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-colors text-[10px] font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5"
                          >
                            <LinkIcon size={12} /> Recovery Link
                          </button>
                          <button
                            onClick={() => deletePartial(partial.id)}
                            className="h-8 w-8 rounded-lg border border-white/5 hover:border-rose-500/50 hover:bg-rose-500/10 text-[#4a5a82] hover:text-rose-400 transition-colors flex items-center justify-center"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
