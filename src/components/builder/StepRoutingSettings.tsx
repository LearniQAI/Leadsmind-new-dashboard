"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { GitBranch } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

const ROUTABLE_STEP_TYPES = ['order_form', 'upsell', 'downsell', 'webinar_registration'];
// webinar_registration only has a "success" concept (there's no decline/payment-
// failure path for a free registration) — the decline dropdown is hidden for it.
const DECLINE_CAPABLE_STEP_TYPES = ['order_form', 'upsell', 'downsell'];

// Steps that branch (per the Phase 2 design doc: live navigation resolves
// config.on_success_step_id/on_decline_step_id first, falling back to order+1
// when unset). Renders nothing for any other step type.
export const StepRoutingSettings = () => {
  const { pageId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stepId, setStepId] = useState<string | null>(null);
  const [stepType, setStepType] = useState<string | null>(null);
  const [funnelId, setFunnelId] = useState<string | null>(null);
  const [onSuccessStepId, setOnSuccessStepId] = useState<string>('');
  const [onDeclineStepId, setOnDeclineStepId] = useState<string>('');
  const [siblingSteps, setSiblingSteps] = useState<{ id: string; name: string }[]>([]);

  const load = useCallback(async () => {
    if (!pageId) return;
    setLoading(true);
    const supabase = createClient();
    const { data: page } = await supabase
      .from('pages')
      .select('funnel_step:funnel_steps(id, funnel_id, step_type, config)')
      .eq('id', pageId as string)
      .single();

    const step = Array.isArray(page?.funnel_step) ? page?.funnel_step[0] : page?.funnel_step;
    if (!step || !ROUTABLE_STEP_TYPES.includes(step.step_type)) {
      setStepId(null);
      setLoading(false);
      return;
    }

    setStepId(step.id);
    setStepType(step.step_type);
    setFunnelId(step.funnel_id);
    setOnSuccessStepId((step.config as any)?.on_success_step_id || '');
    setOnDeclineStepId((step.config as any)?.on_decline_step_id || '');

    const { data: siblings } = await supabase
      .from('funnel_steps')
      .select('id, name')
      .eq('funnel_id', step.funnel_id)
      .neq('id', step.id)
      .order('order');
    setSiblingSteps(siblings || []);
    setLoading(false);
  }, [pageId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!stepId) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('funnel_steps')
      .update({
        config: {
          on_success_step_id: onSuccessStepId || null,
          on_decline_step_id: onDeclineStepId || null,
        },
      })
      .eq('id', stepId);
    setSaving(false);
    if (error) {
      toast.error('Failed to save routing: ' + error.message);
    } else {
      toast.success('Step routing saved');
    }
  };

  if (loading || !stepId) return null;

  const successLabel = stepType === 'order_form' ? 'On payment success →'
    : stepType === 'webinar_registration' ? 'After registering →'
    : 'On accept →';
  const declineLabel = stepType === 'order_form' ? 'On payment decline →' : 'On decline →';
  const showDecline = DECLINE_CAPABLE_STEP_TYPES.includes(stepType || '');

  return (
    <section className="space-y-4 pt-4 border-t border-dash-border">
      <h3 className="text-[10px] font-bold !text-dash-textMuted flex items-center gap-2">
        <GitBranch className="w-3 h-3" /> Step routing
      </h3>
      <p className="text-[10px] !text-dash-textMuted leading-relaxed -mt-2">
        Where visitors go next. Leave unset to fall back to the next step in order.
      </p>

      <div className="space-y-2">
        <Label className="text-[10px] !text-dash-textMuted font-bold">{successLabel}</Label>
        <select
          value={onSuccessStepId}
          onChange={(e) => setOnSuccessStepId(e.target.value)}
          className="w-full bg-white border border-dash-border rounded h-9 text-[11px] px-2 outline-none font-bold !text-dash-text focus:border-dash-accent"
        >
          <option value="">(default — next step in order)</option>
          {siblingSteps.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {showDecline && (
        <div className="space-y-2">
          <Label className="text-[10px] !text-dash-textMuted font-bold">{declineLabel}</Label>
          <select
            value={onDeclineStepId}
            onChange={(e) => setOnDeclineStepId(e.target.value)}
            className="w-full bg-white border border-dash-border rounded h-9 text-[11px] px-2 outline-none font-bold !text-dash-text focus:border-dash-accent"
          >
            <option value="">(none — declining stays here)</option>
            {siblingSteps.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      <Button
        disabled={saving}
        onClick={handleSave}
        size="sm"
        className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[10px] font-bold h-9"
      >
        {saving ? 'Saving...' : 'Save routing'}
      </Button>
    </section>
  );
};
