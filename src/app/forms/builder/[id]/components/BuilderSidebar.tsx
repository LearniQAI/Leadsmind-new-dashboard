'use client';

import React, { useState } from 'react';
import { useFormBuilder, FieldType } from './FormBuilderContext';
import { StepManager } from './StepManager';
import { IntelligenceBuilder } from './IntelligenceBuilder';
import { Type, Mail, Phone, AlignLeft, ChevronDown, CheckSquare, Search, LayoutGrid, Layers, Settings2, UploadCloud, PenTool, CreditCard } from 'lucide-react';

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
  const { addField } = useFormBuilder();
  const [activeTab, setActiveTab] = useState<'fields' | 'steps' | 'config'>('fields');
  const [search, setSearch] = useState('');

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
      className="builder-field-card group flex items-center justify-between cursor-grab active:cursor-grabbing hover:border-[#2563eb]/40 hover:bg-[#0c1535]/60 transition-all select-none"
    >
      <div className="flex items-center gap-3">
        <span className="builder-field-card__icon text-white/50 group-hover:text-[#2563eb] transition-colors">
          {field.icon}
        </span>
        <span className="text-xs font-bold text-white/80 font-dm-sans">{field.label}</span>
      </div>
      <span className="text-[9px] text-[#4a5a82] font-black uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
        + Add
      </span>
    </div>
  );

  return (
    <div className="builder-panel" style={{ width: 280, display: 'flex', flexDirection: 'column' }}>
      
      {/* Sidebar Navigation Tabs */}
      <div className="flex border-b border-white/5 bg-white/1 p-1 m-2.5 rounded-xl overflow-hidden">
        <button
          onClick={() => setActiveTab('fields')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${
            activeTab === 'fields'
              ? 'bg-primary text-white shadow-md'
              : 'text-white/40 hover:text-white'
          }`}
        >
          <LayoutGrid size={12} /> Fields
        </button>
        <button
          onClick={() => setActiveTab('steps')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${
            activeTab === 'steps'
              ? 'bg-primary text-white shadow-md'
              : 'text-white/40 hover:text-white'
          }`}
        >
          <Layers size={12} /> Steps
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${
            activeTab === 'config'
              ? 'bg-primary text-white shadow-md'
              : 'text-white/40 hover:text-white'
          }`}
        >
          <Settings2 size={12} /> Config
        </button>
      </div>

      {activeTab === 'fields' && (
        <>
          {/* Search */}
          <div style={{ padding: '8px 20px 8px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--t3)', pointerEvents: 'none' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search library fields..."
                className="settings-input w-full pl-9 h-10 text-xs bg-white/5 border-white/10 rounded-xl"
              />
            </div>
          </div>

          <div className="builder-panel__body custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 20px' }}>
            {standardFields.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <p className="builder-section-label" style={{ marginBottom: 12 }}>Standard Input Fields</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {standardFields.map(renderFieldCard)}
                </div>
              </div>
            )}

            {contactFields.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <p className="builder-section-label" style={{ marginBottom: 12 }}>Pre-built Contact Fields</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {contactFields.map(renderFieldCard)}
                </div>
              </div>
            )}

            {transactionalFields.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <p className="builder-section-label" style={{ marginBottom: 12 }}>Transactional Workflows</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {transactionalFields.map(renderFieldCard)}
                </div>
              </div>
            )}

            {filteredFields.length === 0 && (
              <div className="text-center py-8">
                <p className="text-xs text-white/30 font-dm-sans">No matching fields found</p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'steps' && (
        <div className="builder-panel__body custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 20px' }}>
          <StepManager />
        </div>
      )}

      {activeTab === 'config' && (
        <div className="builder-panel__body custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 32 }}>
          <IntelligenceBuilder />
        </div>
      )}
    </div>
  );
}
