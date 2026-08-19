'use client';

import React, { useState } from 'react';
import {
  DashModal, DashModalContent, DashModalHeader, DashModalTitle, DashModalDescription,
  DashModalFooter, DashButton, DashFormField, DashInput,
} from '@/components/dashboard-ui';
import { toast } from 'sonner';
import { createAdCampaign, type AdCampaignInput } from '@/app/actions/marketing';

interface AddCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const EMPTY_FORM: AdCampaignInput = {
  name: '',
  platform: 'meta',
  status: 'active',
  budget_daily: undefined,
  spend_to_date: 0,
  impressions: 0,
  clicks: 0,
  conversions: 0,
  leads_created: 0,
};

export function AddCampaignModal({ open, onOpenChange, onCreated }: AddCampaignModalProps) {
  const [form, setForm] = useState<AdCampaignInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const field = (key: keyof AdCampaignInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setForm(f => ({ ...f, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Campaign name is required');
      return;
    }
    setSaving(true);
    try {
      const res = await createAdCampaign(form);
      if (res.error) throw new Error(res.error);
      toast.success('Campaign added');
      setForm(EMPTY_FORM);
      onCreated();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add campaign');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashModal open={open} onOpenChange={onOpenChange}>
      <DashModalContent>
        <DashModalHeader>
          <DashModalTitle>Add campaign metrics</DashModalTitle>
          <DashModalDescription>
            No ad-platform sync is connected yet, so enter real campaign metrics manually. These numbers feed
            directly into AI recommendations, so keep them accurate.
          </DashModalDescription>
        </DashModalHeader>

        <div className="grid grid-cols-2 gap-4">
          <DashFormField label="Campaign name" required className="col-span-2">
            <DashInput value={form.name} onChange={field('name')} placeholder="Spring Promo — Meta" />
          </DashFormField>

          <DashFormField label="Platform" required>
            <select
              value={form.platform}
              onChange={field('platform')}
              className="w-full h-11 rounded-xl border border-dash-border bg-white px-3.5 text-sm !text-dash-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent"
            >
              <option value="meta">Meta</option>
              <option value="google">Google</option>
            </select>
          </DashFormField>

          <DashFormField label="Status" required>
            <select
              value={form.status}
              onChange={field('status')}
              className="w-full h-11 rounded-xl border border-dash-border bg-white px-3.5 text-sm !text-dash-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="ended">Ended</option>
            </select>
          </DashFormField>

          <DashFormField label="Daily budget">
            <DashInput type="number" min={0} step="0.01" value={form.budget_daily ?? ''} onChange={field('budget_daily')} />
          </DashFormField>

          <DashFormField label="Spend to date">
            <DashInput type="number" min={0} step="0.01" value={form.spend_to_date ?? 0} onChange={field('spend_to_date')} />
          </DashFormField>

          <DashFormField label="Impressions">
            <DashInput type="number" min={0} value={form.impressions ?? 0} onChange={field('impressions')} />
          </DashFormField>

          <DashFormField label="Clicks">
            <DashInput type="number" min={0} value={form.clicks ?? 0} onChange={field('clicks')} />
          </DashFormField>

          <DashFormField label="Conversions">
            <DashInput type="number" min={0} value={form.conversions ?? 0} onChange={field('conversions')} />
          </DashFormField>

          <DashFormField label="Leads created">
            <DashInput type="number" min={0} value={form.leads_created ?? 0} onChange={field('leads_created')} />
          </DashFormField>
        </div>

        <DashModalFooter>
          <DashButton variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </DashButton>
          <DashButton onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Add campaign'}
          </DashButton>
        </DashModalFooter>
      </DashModalContent>
    </DashModal>
  );
}
