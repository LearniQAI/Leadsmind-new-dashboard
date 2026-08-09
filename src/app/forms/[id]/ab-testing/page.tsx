'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, SplitSquareHorizontal, CheckCircle2, Archive, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';
import { getFormVariantsData, createFormVariant, archiveFormVariant, updateFormVariantWeight } from '@/app/actions/marketing';

interface Variant {
  id: string;
  name: string;
  is_control: boolean;
  traffic_weight: number;
  status: string;
  views: number;
  submissions: number;
  conversionRate: number;
}

export default function ABTestingPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{ id: string; name: string } | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newWeight, setNewWeight] = useState(50);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function load() {
    const res = await getFormVariantsData(params.id);
    if ('error' in res && res.error) {
      setError(res.error);
    } else {
      const d = (res as any).data;
      setForm(d.form);
      setVariants(d.variants);
      setWinnerId(d.winnerId);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [params.id]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      setActionError('Variant name is required');
      return;
    }
    setSaving(true);
    setActionError(null);
    const res = await createFormVariant(params.id, newName.trim(), newWeight);
    setSaving(false);
    if ('error' in res && res.error) {
      setActionError(res.error);
      return;
    }
    setShowCreate(false);
    setNewName('');
    setNewWeight(50);
    await load();
  };

  const handleArchive = async (variantId: string) => {
    setSaving(true);
    await archiveFormVariant(params.id, variantId);
    setSaving(false);
    await load();
  };

  const handleWeightChange = async (variantId: string, weight: number) => {
    await updateFormVariantWeight(params.id, variantId, weight);
    await load();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-dash-accent border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <p className="text-sm !text-dash-textMuted">{error || 'Failed to load A/B testing data.'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white !text-dash-text p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/forms/${params.id}/analytics`)}
              className="p-2 bg-dash-surface hover:bg-dash-border/60 rounded-xl transition-colors motion-reduce:transition-none"
            >
              <ArrowLeft size={18} className="!text-dash-textMuted" />
            </button>
            <div>
              <h1 className="text-2xl font-bold !text-dash-text">
                A/B testing
              </h1>
              <p className="text-sm !text-dash-textMuted">Optimize {form.name}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <DashButton onClick={() => setShowCreate(v => !v)}>
              <SplitSquareHorizontal size={14} /> Create variant
            </DashButton>
          </div>
        </div>

        {showCreate && (
          <DashCard padding="default" className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold !text-dash-text">New variant</h3>
              <button onClick={() => setShowCreate(false)} className="!text-dash-textMuted">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold !text-dash-textMuted block mb-2">Variant name</label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Minimalist layout"
                  className="w-full h-11 px-4 bg-dash-surface border border-dash-border rounded-xl text-sm !text-dash-text"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold !text-dash-textMuted block mb-2">Traffic split (%)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={newWeight}
                  onChange={e => setNewWeight(Number(e.target.value))}
                  className="w-full h-11 px-4 bg-dash-surface border border-dash-border rounded-xl text-sm !text-dash-text"
                />
              </div>
            </div>
            {variants.filter(v => v.status === 'active').length === 0 && (
              <p className="text-xs !text-dash-textMuted mt-3">
                This is your first variant — an &quot;Original (Control)&quot; variant will be created automatically alongside it, splitting real visitor traffic between the two.
              </p>
            )}
            {actionError && <p className="text-xs text-red mt-3">{actionError}</p>}
            <div className="mt-4">
              <DashButton onClick={handleCreate} disabled={saving} size="sm">
                <Plus size={14} /> {saving ? 'Creating...' : 'Create'}
              </DashButton>
            </div>
          </DashCard>
        )}

        {variants.length === 0 ? (
          <DashCard padding="default" className="text-center py-16">
            <SplitSquareHorizontal size={28} className="mx-auto mb-4 !text-dash-textMuted" />
            <p className="text-sm !text-dash-textMuted">No variants yet. Create one to start splitting real traffic and comparing conversion rates.</p>
          </DashCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {variants.map((v) => {
              const isWinner = v.id === winnerId;
              return (
                <DashCard key={v.id} padding="default" className={cn("flex flex-col", isWinner && "bg-green/5 border-green/30", v.status === 'archived' && "opacity-50")}>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold !text-dash-text">{v.name}</h3>
                        {isWinner && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-green/10 text-green rounded text-[9px] font-bold">
                            <CheckCircle2 size={10} /> Leading
                          </span>
                        )}
                        {v.status === 'archived' && (
                          <span className="px-2 py-0.5 bg-dash-surface text-dash-textMuted rounded text-[9px] font-bold">Archived</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs !text-dash-textMuted">Traffic allocation:</p>
                        {v.status === 'active' ? (
                          <input
                            type="number"
                            min={1}
                            max={100}
                            defaultValue={v.traffic_weight}
                            onBlur={e => {
                              const val = Number(e.target.value);
                              if (val !== v.traffic_weight) handleWeightChange(v.id, val);
                            }}
                            className="w-16 h-7 px-2 bg-dash-surface border border-dash-border rounded-lg text-xs !text-dash-text"
                          />
                        ) : (
                          <span className="text-xs !text-dash-textMuted">{v.traffic_weight}%</span>
                        )}
                        <span className="text-xs !text-dash-textMuted">%</span>
                      </div>
                    </div>

                    {v.status === 'active' && !v.is_control && (
                      <button
                        onClick={() => handleArchive(v.id)}
                        className="p-2 bg-dash-surface hover:bg-dash-border/60 rounded-lg !text-dash-textMuted transition-colors motion-reduce:transition-none"
                        title="Archive Variant"
                      >
                        <Archive size={14} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-auto">
                    <div className="p-4 bg-dash-surface rounded-xl">
                      <span className="text-[10px] font-bold !text-dash-textMuted block mb-1">Views</span>
                      <span className="text-xl font-bold !text-dash-text">{v.views.toLocaleString()}</span>
                    </div>
                    <div className="p-4 bg-dash-surface rounded-xl">
                      <span className="text-[10px] font-bold !text-dash-textMuted block mb-1">Submissions</span>
                      <span className="text-xl font-bold !text-dash-text">{v.submissions.toLocaleString()}</span>
                    </div>
                    <div className={cn("p-4 rounded-xl", isWinner ? 'bg-green/10' : 'bg-dash-surface')}>
                      <span className="text-[10px] font-bold !text-dash-textMuted block mb-1">Conv. rate</span>
                      <span className={cn("text-xl font-bold", isWinner ? 'text-green' : '!text-dash-text')}>{v.conversionRate}%</span>
                    </div>
                  </div>
                </DashCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
