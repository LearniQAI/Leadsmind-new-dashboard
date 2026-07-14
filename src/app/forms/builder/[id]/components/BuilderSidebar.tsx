'use client';

import React, { useState } from 'react';
import { useFormBuilder, FieldType } from './FormBuilderContext';
import { StepManager } from './StepManager';
import { IntelligenceBuilder } from './IntelligenceBuilder';
import { Type, Mail, Phone, AlignLeft, ChevronDown, CheckSquare, Search, LayoutGrid, Layers, Settings2, UploadCloud, PenTool, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LibraryField {
  type: FieldType;
  label: string;
  category: 'standard' | 'contact' | 'transactional';
  icon: React.ReactNode;
}

const FIELD_LIBRARY: LibraryField[] = [
  { type: 'text', label: 'Short Text', category: 'standard', icon: <Type size={14} /> },
  { type: 'textarea', label: 'Long Text', category: 'standard', icon: <AlignLeft size={14} /> },
  { type: 'dropdown', label: 'Dropdown Select', category: 'standard', icon: <ChevronDown size={14} /> },
  { type: 'checkbox', label: 'Checkbox Option', category: 'standard', icon: <CheckSquare size={14} /> },
  { type: 'email', label: 'Email Address', category: 'contact', icon: <Mail size={14} /> },
  { type: 'phone', label: 'Phone Number', category: 'contact', icon: <Phone size={14} /> },
  { type: 'upload', label: 'File Upload', category: 'transactional', icon: <UploadCloud size={14} /> },
  { type: 'signature', label: 'E-Signature', category: 'transactional', icon: <PenTool size={14} /> },
  { type: 'payment', label: 'Payment Block', category: 'transactional', icon: <CreditCard size={14} /> },
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

  const handleDragStart = (e: React.DragEvent, type: FieldType) => {
    e.dataTransfer.setData('field-type', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const renderFieldCard = (field: LibraryField) => (
    <div
      key={field.type}
      draggable="true"
      onDragStart={(e) => handleDragStart(e, field.type)}
      onClick={() => addField(field.type)}
      className="builder-field-card group flex items-center justify-between cursor-grab active:cursor-grabbing hover:border-dash-accent/40 hover:bg-dash-accent/5 select-none"
    >
      <div className="flex items-center gap-3">
        <span className="builder-field-card__icon group-hover:text-dash-accent transition-colors motion-reduce:transition-none">
          {field.icon}
        </span>
        <span className="text-xs font-bold !text-dash-text">{field.label}</span>
      </div>
      <span className="text-[10px] !text-dash-textMuted font-bold opacity-0 group-hover:opacity-100 transition-opacity motion-reduce:transition-none">
        + Add
      </span>
    </div>
  );

  return (
    <div className="builder-panel w-[280px] flex flex-col">

      {/* Sidebar Navigation Tabs */}
      <div className="flex border-b border-dash-border bg-white p-1 m-2.5 rounded-xl overflow-hidden">
        <button
          onClick={() => setActiveTab('fields')}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 py-1.5 text-[10px] font-bold rounded-lg transition-colors motion-reduce:transition-none",
            activeTab === 'fields' ? 'bg-dash-accent text-white shadow-md' : '!text-dash-textMuted hover:!text-dash-text'
          )}
        >
          <LayoutGrid size={12} /> Fields
        </button>
        <button
          onClick={() => setActiveTab('steps')}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 py-1.5 text-[10px] font-bold rounded-lg transition-colors motion-reduce:transition-none",
            activeTab === 'steps' ? 'bg-dash-accent text-white shadow-md' : '!text-dash-textMuted hover:!text-dash-text'
          )}
        >
          <Layers size={12} /> Steps
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 py-1.5 text-[10px] font-bold rounded-lg transition-colors motion-reduce:transition-none",
            activeTab === 'config' ? 'bg-dash-accent text-white shadow-md' : '!text-dash-textMuted hover:!text-dash-text'
          )}
        >
          <Settings2 size={12} /> Config
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
            <div className="mb-5 p-3.5 bg-white border border-dash-border rounded-2xl">
              <p className="builder-section-label mb-2">CRM sync checklist</p>
              <p className="text-[11px] !text-dash-textMuted mb-2.5 leading-relaxed">
                Include these fields to automatically link submissions to CRM contacts.
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className={hasFirstName ? "text-green" : "text-red"}>{hasFirstName ? '✓' : '○'}</span>
                  <span className={hasFirstName ? "!text-dash-text" : "!text-dash-textMuted"}>First Name</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className={hasLastName ? "text-green" : "text-red"}>{hasLastName ? '✓' : '○'}</span>
                  <span className={hasLastName ? "!text-dash-text" : "!text-dash-textMuted"}>Last Name</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className={hasEmail ? "text-green" : "text-red"}>{hasEmail ? '✓' : '○'}</span>
                  <span className={hasEmail ? "!text-dash-text" : "!text-dash-textMuted"}>Email Address</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className={hasPhone ? "text-green" : "text-red"}>{hasPhone ? '✓' : '○'}</span>
                  <span className={hasPhone ? "!text-dash-text" : "!text-dash-textMuted"}>Phone Number</span>
                </div>
              </div>
            </div>

            {standardFields.length > 0 && (
              <div className="mb-6">
                <p className="builder-section-label">Standard input fields</p>
                <div className="flex flex-col gap-2">
                  {standardFields.map(renderFieldCard)}
                </div>
              </div>
            )}

            {contactFields.length > 0 && (
              <div className="mb-6">
                <p className="builder-section-label">Pre-built contact fields</p>
                <div className="flex flex-col gap-2">
                  {contactFields.map(renderFieldCard)}
                </div>
              </div>
            )}

            {transactionalFields.length > 0 && (
              <div className="mb-6">
                <p className="builder-section-label">Transactional workflows</p>
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
          <IntelligenceBuilder />
        </div>
      )}
    </div>
  );
}
