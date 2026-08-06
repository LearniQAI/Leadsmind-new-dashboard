'use client';

import React, { useState } from 'react';
import { useFormBuilder, FieldType } from './FormBuilderContext';
import { StepManager } from './StepManager';
import { IntelligenceBuilder } from './IntelligenceBuilder';
import { TagOnSubmitPicker } from './TagOnSubmitPicker';
import { Type, Mail, Phone, AlignLeft, ChevronDown, CheckSquare, Search, LayoutGrid, Layers, Tag as TagIcon, UploadCloud, PenTool, Link2, Plus, Check, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LibraryField {
  type: FieldType;
  label: string;
  category: 'standard' | 'contact' | 'transactional';
  icon: React.ReactNode;
  /** When set, the added field is pre-labeled with this instead of the type's generic default —
   * used for CRM-mapped fields (e.g. "First Name") that share a generic FieldType ('text'). */
  overrideLabel?: string;
}

const FIELD_LIBRARY: LibraryField[] = [
  { type: 'text', label: 'Short Text', category: 'standard', icon: <Type size={14} /> },
  { type: 'textarea', label: 'Long Text', category: 'standard', icon: <AlignLeft size={14} /> },
  { type: 'dropdown', label: 'Dropdown Select', category: 'standard', icon: <ChevronDown size={14} /> },
  { type: 'checkbox', label: 'Checkbox Option', category: 'standard', icon: <CheckSquare size={14} /> },
  { type: 'text', label: 'First Name', category: 'contact', icon: <User size={14} />, overrideLabel: 'First Name' },
  { type: 'text', label: 'Last Name', category: 'contact', icon: <User size={14} />, overrideLabel: 'Last Name' },
  { type: 'email', label: 'Email Address', category: 'contact', icon: <Mail size={14} /> },
  { type: 'phone', label: 'Phone Number', category: 'contact', icon: <Phone size={14} /> },
  { type: 'upload', label: 'File Upload', category: 'transactional', icon: <UploadCloud size={14} /> },
  { type: 'signature', label: 'E-Signature', category: 'transactional', icon: <PenTool size={14} /> },
  // 'payment' intentionally omitted: PaymentBlock collects real card data via Stripe.js
  // but never sends it anywhere for an actual charge (see PaymentBlock.tsx). Re-add once
  // it's wired to a real server-side charge.
];

export function BuilderSidebar() {
  const { addField, state } = useFormBuilder();
  const [activeTab, setActiveTab] = useState<'fields' | 'steps' | 'config'>('fields');
  const [search, setSearch] = useState('');

  const fields = state.fields || [];
  const hasFirstName = fields.some(f => f.type === 'text' && f.label?.toLowerCase().includes('first name'));
  const hasLastName = fields.some(f => f.type === 'text' && f.label?.toLowerCase().includes('last name'));
  const hasEmail = fields.some(f => f.type === 'email');
  const hasPhone = fields.some(f => f.type === 'phone');

  const filteredFields = FIELD_LIBRARY.filter(f =>
    f.label.toLowerCase().includes(search.toLowerCase()) ||
    f.type.toLowerCase().includes(search.toLowerCase())
  );

  const standardFields = filteredFields.filter(f => f.category === 'standard');
  const contactFields = filteredFields.filter(f => f.category === 'contact');
  const transactionalFields = filteredFields.filter(f => f.category === 'transactional');

  const handleDragStart = (e: React.DragEvent, type: FieldType, overrideLabel?: string) => {
    e.dataTransfer.setData('field-type', type);
    if (overrideLabel) e.dataTransfer.setData('field-label', overrideLabel);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const renderFieldCard = (field: LibraryField) => (
    <div
      key={field.label}
      draggable="true"
      onDragStart={(e) => handleDragStart(e, field.type, field.overrideLabel)}
      onClick={() => addField(field.type, undefined, field.overrideLabel)}
      className="builder-field-card group flex items-center justify-between cursor-grab active:cursor-grabbing hover:border-dash-accent/40 hover:bg-dash-accent/5 select-none"
    >
      <div className="flex items-center gap-3">
        <span className="builder-field-card__icon flex items-center justify-center w-7 h-7 rounded-lg bg-dash-surface group-hover:bg-dash-accent/10 group-hover:text-dash-accent transition-colors motion-reduce:transition-none">
          {field.icon}
        </span>
        <span className="text-xs font-bold !text-dash-text">{field.label}</span>
      </div>
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-dash-accent/10 text-dash-accent opacity-0 group-hover:opacity-100 transition-opacity motion-reduce:transition-none">
        <Plus size={11} strokeWidth={2.5} />
      </span>
    </div>
  );

  return (
    <div className="builder-panel w-[280px] flex flex-col">

      {/* Sidebar Navigation Tabs */}
      <div className="flex gap-0.5 border border-dash-border bg-dash-surface p-1 m-2.5 rounded-xl shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)]">
        <button
          onClick={() => setActiveTab('fields')}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-bold rounded-lg transition-all duration-150 motion-reduce:transition-none",
            activeTab === 'fields' ? 'bg-dash-accent text-white shadow-[0_4px_12px_rgba(19,89,255,0.28)]' : '!text-dash-textMuted hover:!text-dash-text hover:bg-white'
          )}
        >
          <LayoutGrid size={12} /> Fields
        </button>
        <button
          onClick={() => setActiveTab('steps')}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-bold rounded-lg transition-all duration-150 motion-reduce:transition-none",
            activeTab === 'steps' ? 'bg-dash-accent text-white shadow-[0_4px_12px_rgba(19,89,255,0.28)]' : '!text-dash-textMuted hover:!text-dash-text hover:bg-white'
          )}
        >
          <Layers size={12} /> Steps
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-bold rounded-lg transition-all duration-150 motion-reduce:transition-none",
            activeTab === 'config' ? 'bg-dash-accent text-white shadow-[0_4px_12px_rgba(19,89,255,0.28)]' : '!text-dash-textMuted hover:!text-dash-text hover:bg-white'
          )}
        >
          <TagIcon size={12} /> Tags
        </button>
      </div>

      {activeTab === 'fields' && (
        <>
          {/* Search */}
          <div className="px-5 py-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 !text-dash-textMuted pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search library fields..."
                className="settings-input pl-9 h-10 text-xs"
              />
            </div>
          </div>

          <div className="builder-panel__body custom-scrollbar flex-1 overflow-y-auto px-5 pb-5 pt-2">
            {/* CRM Contact Checklist */}
            <div className="mb-6 p-3.5 bg-gradient-to-br from-dash-accent/[0.07] to-dash-accent/[0.02] border border-dash-accent/20 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-dash-accent/10 text-dash-accent shrink-0">
                  <Link2 size={12} />
                </span>
                <p className="text-[10px] font-bold uppercase tracking-wide text-dash-accent">CRM sync checklist</p>
              </div>
              <p className="text-[11px] !text-dash-textMuted mb-2.5 leading-relaxed">
                Include these fields to automatically link submissions to CRM contacts.
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className={cn(
                    "flex items-center justify-center w-3.5 h-3.5 rounded-full shrink-0",
                    hasFirstName ? "bg-success/15 text-success" : "border border-dash-border"
                  )}>{hasFirstName && <Check size={9} strokeWidth={3} />}</span>
                  <span className={hasFirstName ? "!text-dash-text font-semibold" : "!text-dash-textMuted"}>First Name</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className={cn(
                    "flex items-center justify-center w-3.5 h-3.5 rounded-full shrink-0",
                    hasLastName ? "bg-success/15 text-success" : "border border-dash-border"
                  )}>{hasLastName && <Check size={9} strokeWidth={3} />}</span>
                  <span className={hasLastName ? "!text-dash-text font-semibold" : "!text-dash-textMuted"}>Last Name</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className={cn(
                    "flex items-center justify-center w-3.5 h-3.5 rounded-full shrink-0",
                    hasEmail ? "bg-success/15 text-success" : "border border-dash-border"
                  )}>{hasEmail && <Check size={9} strokeWidth={3} />}</span>
                  <span className={hasEmail ? "!text-dash-text font-semibold" : "!text-dash-textMuted"}>Email Address</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className={cn(
                    "flex items-center justify-center w-3.5 h-3.5 rounded-full shrink-0",
                    hasPhone ? "bg-success/15 text-success" : "border border-dash-border"
                  )}>{hasPhone && <Check size={9} strokeWidth={3} />}</span>
                  <span className={hasPhone ? "!text-dash-text font-semibold" : "!text-dash-textMuted"}>Phone Number</span>
                </div>
              </div>
            </div>

            {standardFields.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide !text-dash-textMuted">Standard input fields</p>
                  <span className="flex-1 h-px bg-dash-border" />
                </div>
                <div className="flex flex-col gap-2">
                  {standardFields.map(renderFieldCard)}
                </div>
              </div>
            )}

            {contactFields.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide !text-dash-textMuted">Pre-built contact fields</p>
                  <span className="flex-1 h-px bg-dash-border" />
                </div>
                <div className="flex flex-col gap-2">
                  {contactFields.map(renderFieldCard)}
                </div>
              </div>
            )}

            {transactionalFields.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide !text-dash-textMuted">Transactional workflows</p>
                  <span className="flex-1 h-px bg-dash-border" />
                </div>
                <div className="flex flex-col gap-2">
                  {transactionalFields.map(renderFieldCard)}
                </div>
              </div>
            )}

            {filteredFields.length === 0 && (
              <div className="text-center py-8">
                <p className="text-xs !text-dash-textMuted">No matching fields found</p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'steps' && (
        <div className="builder-panel__body custom-scrollbar flex-1 overflow-y-auto px-5 pb-5 pt-2">
          <StepManager />
        </div>
      )}

      {activeTab === 'config' && (
        <div className="builder-panel__body custom-scrollbar flex-1 overflow-y-auto px-5 pb-5 pt-4 flex flex-col gap-8">
          <TagOnSubmitPicker />
          <IntelligenceBuilder />
        </div>
      )}
    </div>
  );
}
