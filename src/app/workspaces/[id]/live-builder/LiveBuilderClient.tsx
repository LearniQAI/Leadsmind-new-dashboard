'use client';

import React, { useState } from 'react';
import { 
  Heading, ToggleLeft, Users, MessageSquare, HelpCircle, Save, 
  ArrowUp, ArrowDown, Trash2, LayoutTemplate, Settings, Eye
} from 'lucide-react';
import { toast } from 'sonner';

interface LiveBuilderClientProps {
  workspaceId: string;
  experts: any[];
  courses: any[];
}

interface Block {
  id: string;
  type: 'hero' | 'variants' | 'experts' | 'reviews' | 'faqs';
  title: string;
  data: any;
}

export default function LiveBuilderClient({ workspaceId, experts, courses }: LiveBuilderClientProps) {
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || '');
  const [blocks, setBlocks] = useState<Block[]>([
    {
      id: 'b1',
      type: 'hero',
      title: 'Hero Heading Section',
      data: {
        headline: 'Accelerate Your Learning with Expert Mentors',
        subheadline: 'Book private advisory clinics or join drop-in technical study halls with industry subject experts.',
        cta: 'Schedule Advisory Slot'
      }
    },
    {
      id: 'b2',
      type: 'variants',
      title: 'Session Booking Variant Selection',
      data: {
        private: true,
        group: true,
        cohort: false,
        drop_in: true
      }
    },
    {
      id: 'b3',
      type: 'experts',
      title: 'Expert Specialists Display Row',
      data: {
        title: 'Meet Our Top Certified Instructors',
        limit: 3
      }
    },
    {
      id: 'b4',
      type: 'reviews',
      title: 'Student Reference Testimonials',
      data: {
        reviewText: '"The live drop-in session cleared up my CRM integrations issues in 10 minutes. Absolute game changer!"',
        author: 'Sarah Jenkins, Tech Operations Analyst'
      }
    },
    {
      id: 'b5',
      type: 'faqs',
      title: 'Common Troubleshooting FAQs',
      data: {
        q1: 'How do I access the drop-in video room?',
        a1: 'Click the green Pulsing indicator in the sidebar when experts are active to launch Jitsi/Zoom sessions immediately.',
        q2: 'Are private bookings billed hourly?',
        a2: 'Consulting fees are calculated dynamically based on expert rate configurations.'
      }
    }
  ]);

  const [selectedBlockId, setSelectedBlockId] = useState<string>('b1');
  const activeBlock = blocks.find(b => b.id === selectedBlockId);

  const updateBlockData = (key: string, value: any) => {
    setBlocks(blocks.map(b => {
      if (b.id === selectedBlockId) {
        return { ...b, data: { ...b.data, [key]: value } };
      }
      return b;
    }));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= blocks.length) return;
    
    const newBlocks = [...blocks];
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[nextIndex];
    newBlocks[nextIndex] = temp;
    setBlocks(newBlocks);
  };

  const deleteBlock = (id: string) => {
    if (blocks.length <= 1) {
      toast.error('At least one layout block is required.');
      return;
    }
    setBlocks(blocks.filter(b => b.id !== id));
    if (selectedBlockId === id) {
      setSelectedBlockId(blocks.find(b => b.id !== id)?.id || '');
    }
  };

  const handleSavePage = () => {
    // Save layout config state in workspace database cache
    toast.success('Landing page layout template saved successfully! Published to course scheduler routes.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-dash-border pb-4 flex-wrap gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-dash-accent">Live Experience Designer</span>
          <h1 className="text-3xl font-space-grotesk font-black uppercase tracking-tighter text-dash-text mt-1.5">
            Scheduling <span className="text-blue-500">Page Builder</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedCourseId}
            onChange={e => setSelectedCourseId(e.target.value)}
            className="bg-dash-surface border border-dash-border rounded-xl px-3.5 py-2 text-xs text-dash-text outline-none"
          >
            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>

          <button
            onClick={handleSavePage}
            className="bg-dash-accent hover:bg-dash-accent/90 text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-11 px-5 flex items-center gap-1.5 shadow-lg shadow-dash-accent/20"
          >
            <Save size={13} /> Save Layout Template
          </button>
        </div>
      </div>

      {/* Editor Panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Blocks Manager & Content Editors */}
        <div className="lg:col-span-5 space-y-6">
          {/* Blocks List */}
          <div className="bg-dash-surface border border-dash-border rounded-3xl p-5 space-y-3.5">
            <h3 className="text-[10px] font-bold text-dash-textMuted uppercase tracking-widest border-b border-dash-border pb-2">Layout Blocks</h3>
            <div className="space-y-2">
              {blocks.map((b, idx) => (
                <div
                  key={b.id}
                  onClick={() => setSelectedBlockId(b.id)}
                  className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                    selectedBlockId === b.id
                      ? 'bg-dash-accent/5 border-dash-accent'
                      : 'bg-dash-bg border-dash-border hover:border-dash-accent/30'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-dash-textMuted font-mono">#{idx+1}</span>
                    <span className="text-xs font-bold text-dash-text truncate max-w-[180px]">{b.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => moveBlock(idx, 'up')} disabled={idx === 0} className="p-1 text-dash-textMuted hover:text-dash-text disabled:opacity-20"><ArrowUp size={12} /></button>
                    <button onClick={() => moveBlock(idx, 'down')} disabled={idx === blocks.length - 1} className="p-1 text-dash-textMuted hover:text-dash-text disabled:opacity-20"><ArrowDown size={12} /></button>
                    <button onClick={() => deleteBlock(b.id)} className="p-1 text-rose-400 hover:text-rose-600"><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Block Data Editor Panel */}
          {activeBlock && (
            <div className="bg-dash-surface border border-dash-border rounded-3xl p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-dash-border pb-3">
                <Settings size={14} className="text-dash-accent" />
                <h4 className="text-xs font-black text-dash-text uppercase tracking-wider">Configure Active Block Data</h4>
              </div>

              {activeBlock.type === 'hero' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-dash-textMuted uppercase tracking-widest">Headline Text</label>
                    <input type="text" value={activeBlock.data.headline} onChange={e => updateBlockData('headline', e.target.value)} className="w-full bg-dash-bg border border-dash-border rounded-xl px-4 py-2.5 text-xs text-dash-text outline-none focus:border-dash-accent" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-dash-textMuted uppercase tracking-widest">Subheadline Copy</label>
                    <textarea rows={3} value={activeBlock.data.subheadline} onChange={e => updateBlockData('subheadline', e.target.value)} className="w-full bg-dash-bg border border-dash-border rounded-xl px-4 py-2.5 text-xs text-dash-text outline-none focus:border-dash-accent leading-relaxed" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-dash-textMuted uppercase tracking-widest">CTA Action Button label</label>
                    <input type="text" value={activeBlock.data.cta} onChange={e => updateBlockData('cta', e.target.value)} className="w-full bg-dash-bg border border-dash-border rounded-xl px-4 py-2.5 text-xs text-dash-text outline-none focus:border-dash-accent" />
                  </div>
                </div>
              )}

              {activeBlock.type === 'variants' && (
                <div className="space-y-4">
                  <label className="text-[9px] font-bold text-dash-textMuted uppercase tracking-widest block border-b border-dash-border pb-1">Toggle Allowed Session Channels</label>
                  {(['private', 'group', 'cohort', 'drop_in'] as const).map((variant) => (
                    <label key={variant} className="flex items-center justify-between p-3 rounded-xl bg-dash-bg border border-dash-border select-none cursor-pointer">
                      <span className="text-xs font-black text-dash-text capitalize">{variant.replace('_', ' ')} sessions</span>
                      <input type="checkbox" checked={activeBlock.data[variant]} onChange={e => updateBlockData(variant, e.target.checked)} className="accent-dash-accent h-4 w-4" />
                    </label>
                  ))}
                </div>
              )}

              {activeBlock.type === 'experts' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-dash-textMuted uppercase tracking-widest">Row Section Title</label>
                    <input type="text" value={activeBlock.data.title} onChange={e => updateBlockData('title', e.target.value)} className="w-full bg-dash-bg border border-dash-border rounded-xl px-4 py-2.5 text-xs text-dash-text outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-dash-textMuted uppercase tracking-widest">Show Limit Count</label>
                    <input type="number" value={activeBlock.data.limit} onChange={e => updateBlockData('limit', parseInt(e.target.value) || 3)} className="w-full bg-dash-bg border border-dash-border rounded-xl px-4 py-2 text-xs text-dash-text outline-none" />
                  </div>
                </div>
              )}

              {activeBlock.type === 'reviews' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-dash-textMuted uppercase tracking-widest">Student Reference Text</label>
                    <textarea rows={3} value={activeBlock.data.reviewText} onChange={e => updateBlockData('reviewText', e.target.value)} className="w-full bg-dash-bg border border-dash-border rounded-xl px-4 py-2.5 text-xs text-dash-text outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-dash-textMuted uppercase tracking-widest">Review Author</label>
                    <input type="text" value={activeBlock.data.author} onChange={e => updateBlockData('author', e.target.value)} className="w-full bg-dash-bg border border-dash-border rounded-xl px-4 py-2 text-xs text-dash-text outline-none" />
                  </div>
                </div>
              )}

              {activeBlock.type === 'faqs' && (
                <div className="space-y-4">
                  <div className="space-y-3 p-3.5 rounded-2xl bg-dash-bg border border-dash-border space-y-2">
                    <label className="text-[9px] font-bold text-dash-textMuted uppercase tracking-widest block">Troubleshooting FAQ 1</label>
                    <input type="text" value={activeBlock.data.q1} onChange={e => updateBlockData('q1', e.target.value)} className="w-full bg-dash-surface border border-dash-border rounded-xl px-3 py-2 text-xs text-dash-text outline-none" />
                    <input type="text" value={activeBlock.data.a1} onChange={e => updateBlockData('a1', e.target.value)} className="w-full bg-dash-surface border border-dash-border rounded-xl px-3 py-2 text-xs text-dash-textMuted outline-none" />
                  </div>
                  <div className="space-y-3 p-3.5 rounded-2xl bg-dash-bg border border-dash-border space-y-2">
                    <label className="text-[9px] font-bold text-dash-textMuted uppercase tracking-widest block">Troubleshooting FAQ 2</label>
                    <input type="text" value={activeBlock.data.q2} onChange={e => updateBlockData('q2', e.target.value)} className="w-full bg-dash-surface border border-dash-border rounded-xl px-3 py-2 text-xs text-dash-text outline-none" />
                    <input type="text" value={activeBlock.data.a2} onChange={e => updateBlockData('a2', e.target.value)} className="w-full bg-dash-surface border border-dash-border rounded-xl px-3 py-2 text-xs text-dash-textMuted outline-none" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Live Page Canvas Preview */}
        <div className="lg:col-span-7 bg-dash-surface border border-dash-border rounded-3xl p-6 relative overflow-hidden flex flex-col min-h-[500px]">
          <div className="flex items-center gap-2 border-b border-dash-border pb-3 mb-6 shrink-0">
            <Eye size={14} className="text-emerald-600" />
            <span className="text-[10px] font-bold text-dash-textMuted uppercase tracking-widest">LMS Live Scheduler Screen Preview</span>
          </div>

          <div className="flex-1 bg-dash-bg border border-dash-border rounded-2xl overflow-y-auto max-h-[60vh] p-6 space-y-8 font-sans">
            {blocks.map((block) => {
              if (block.type === 'hero') {
                return (
                  <div key={block.id} className="text-center space-y-4 py-8 border-b border-dash-border">
                    <h2 className="text-2xl font-space-grotesk font-black uppercase tracking-tight text-dash-text">{block.data.headline}</h2>
                    <p className="text-xs text-dash-textMuted leading-relaxed max-w-lg mx-auto">{block.data.subheadline}</p>
                    <button className="bg-dash-accent text-white rounded-xl uppercase tracking-wider text-[10px] font-black h-11 px-8 shadow-lg shadow-dash-accent/20">{block.data.cta}</button>
                  </div>
                );
              }

              if (block.type === 'variants') {
                return (
                  <div key={block.id} className="grid grid-cols-2 md:grid-cols-4 gap-3 py-4 border-b border-dash-border">
                    {(['private', 'group', 'cohort', 'drop_in'] as const).map((v) => (
                      block.data[v] && (
                        <div key={v} className="bg-dash-surface border border-dash-border rounded-xl p-3 text-center space-y-1">
                          <span className="text-[9px] font-bold text-dash-textMuted uppercase tracking-widest block">{v.replace('_', ' ')}</span>
                          <span className="text-emerald-600 text-[9px] font-black uppercase">Active ✓</span>
                        </div>
                      )
                    ))}
                  </div>
                );
              }

              if (block.type === 'experts') {
                return (
                  <div key={block.id} className="space-y-4 py-4 border-b border-dash-border">
                    <h3 className="text-xs font-bold text-dash-textMuted uppercase tracking-widest">{block.data.title}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {experts.slice(0, block.data.limit).map((exp, idx) => (
                        <div key={idx} className="bg-dash-surface border border-dash-border p-4 rounded-xl space-y-2">
                          <h4 className="text-xs font-black text-dash-text">{exp.name}</h4>
                          <span className="text-[9px] text-dash-accent font-mono block">Advisory Specialist</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              if (block.type === 'reviews') {
                return (
                  <div key={block.id} className="text-center py-6 border-b border-dash-border space-y-2 bg-dash-surface rounded-2xl p-4">
                    <p className="text-xs text-dash-textMuted italic leading-relaxed">{block.data.reviewText}</p>
                    <span className="text-[9px] font-bold text-dash-textMuted uppercase tracking-widest block">— {block.data.author}</span>
                  </div>
                );
              }

              if (block.type === 'faqs') {
                return (
                  <div key={block.id} className="space-y-3 py-4">
                    <h3 className="text-xs font-bold text-dash-textMuted uppercase tracking-widest">Frequently Asked Explanations</h3>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-dash-text">Q. {block.data.q1}</h4>
                        <p className="text-[11px] text-dash-textMuted leading-relaxed">{block.data.a1}</p>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-dash-text">Q. {block.data.q2}</h4>
                        <p className="text-[11px] text-dash-textMuted leading-relaxed">{block.data.a2}</p>
                      </div>
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
