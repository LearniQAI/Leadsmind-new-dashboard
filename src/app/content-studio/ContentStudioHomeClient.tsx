'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createDocument, deleteDocument } from '@/app/actions/contentStudio';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import {
  Plus,
  Search,
  FileText,
  Trash2,
  Clock,
  ExternalLink,
  Sparkles,
  Share2,
  Mail,
  Loader2,
  X,
  FilePenLine,
  SlidersHorizontal,
  PenTool
} from 'lucide-react';
import Link from 'next/link';

interface Document {
  id: string;
  title: string;
  body_html: string;
  body_plain: string;
  content_type: string;
  target_platform: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ContentStudioHomeProps {
  initialDocuments: Document[];
}

export default function ContentStudioHomeClient({ initialDocuments }: ContentStudioHomeProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeType, setActiveType] = useState<string>('all');
  const [activeStatus, setActiveStatus] = useState<string>('all');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('blog');
  const [newPlatform, setNewPlatform] = useState('custom');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const res = await createDocument({
        title: newTitle.trim() || 'Untitled Document',
        content_type: newType,
        target_platform: newPlatform,
        body_html: '',
        body_plain: '',
        status: 'draft'
      });

      if (res.error) {
        toast.error(res.error);
      } else if (res.data) {
        router.push(`/content-studio/${res.data.id}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Creation failed');
    } finally {
      setIsSubmitting(false);
      setShowCreateModal(false);
    }
  };

  const handleDeleteDocument = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setConfirmConfig({
      isOpen: true,
      title: 'Delete Document?',
      description: 'Permanently delete this document and all version snapshots?',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        const original = [...documents];
        setDocuments(documents.filter(d => d.id !== id));

        const res = await deleteDocument(id);
        if (res.error) {
          toast.error(res.error);
          setDocuments(original);
        } else {
          toast.success('Document deleted successfully.');
        }
      }
    });
  };

  // Filtering
  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          doc.body_plain.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = activeType === 'all' || doc.content_type === activeType;
    const matchesStatus = activeStatus === 'all' || doc.status === activeStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  // KPI Calculations
  const totalCount = documents.length;
  const blogCount = documents.filter(d => d.content_type === 'blog').length;
  const socialCount = documents.filter(d => d.content_type === 'social').length;
  const emailCount = documents.filter(d => d.content_type === 'email').length;

  return (
    <MetaData pageTitle="Content Studio">
      <Wrapper>
        <div className="py-8 px-6 max-w-7xl mx-auto space-y-6">
          
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold font-space-grotesk text-white uppercase tracking-tight">
                CONTENT <span className="text-primary">STUDIO</span>
              </h1>
              <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest font-mono">
                WORKSPACE CONTENT GENERATION AND PLATFORM ORCHESTRATION
              </p>
            </div>
            <div>
              <button
                onClick={() => {
                  setNewTitle('');
                  setNewType('blog');
                  setNewPlatform('custom');
                  setShowCreateModal(true);
                }}
                className="bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-blue-600 transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
              >
                <Plus className="w-4 h-4" /> Create Document
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            <div className="bg-[#080f28] border border-white/5 rounded-xl p-5 relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-primary">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">All Documents</span>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <h3 className="font-space-grotesk text-2xl font-black text-white">{totalCount}</h3>
              <p className="text-[10px] text-white/30 mt-1">Total active documents in workspace</p>
            </div>

            <div className="bg-[#080f28] border border-white/5 rounded-xl p-5 relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-purple-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Blog Articles</span>
                <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <PenTool className="w-4 h-4" />
                </div>
              </div>
              <h3 className="font-space-grotesk text-2xl font-black text-white">{blogCount}</h3>
              <p className="text-[10px] text-white/30 mt-1">Long-form outline documents</p>
            </div>

            <div className="bg-[#080f28] border border-white/5 rounded-xl p-5 relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-cyan-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Social Copies</span>
                <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                  <Share2 className="w-4 h-4" />
                </div>
              </div>
              <h3 className="font-space-grotesk text-2xl font-black text-white">{socialCount}</h3>
              <p className="text-[10px] text-white/30 mt-1">Twitter, LinkedIn & Platform posts</p>
            </div>

            <div className="bg-[#080f28] border border-white/5 rounded-xl p-5 relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-amber-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Email Templates</span>
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <Mail className="w-4 h-4" />
                </div>
              </div>
              <h3 className="font-space-grotesk text-2xl font-black text-white">{emailCount}</h3>
              <p className="text-[10px] text-white/30 mt-1">Newsletters & Sequence copies</p>
            </div>

          </div>

          {/* Toolbar */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-[#080f28] border border-white/5 p-4 rounded-xl">
            
            {/* Search */}
            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#04091a] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-primary transition"
              />
            </div>

            {/* Type Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[9.5px] font-bold uppercase text-white/40 tracking-wider mr-2 hidden sm:inline flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5" /> Type:
              </span>
              {[
                { id: 'all', label: 'All' },
                { id: 'blog', label: 'Blog' },
                { id: 'social', label: 'Social' },
                { id: 'email', label: 'Email' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveType(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeType === tab.id
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'bg-[#04091a] text-white/60 hover:text-white border border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Status Filters */}
            <div className="flex items-center gap-1.5">
              <span className="text-[9.5px] font-bold uppercase text-white/40 tracking-wider mr-2 hidden sm:inline">
                Status:
              </span>
              {[
                { id: 'all', label: 'All' },
                { id: 'draft', label: 'Draft' },
                { id: 'published', label: 'Published' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveStatus(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeStatus === tab.id
                      ? 'bg-[#04091a] text-white border border-white/10'
                      : 'text-white/40 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

          </div>

          {/* Grid Layout of Cards */}
          {filteredDocs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Dashed Add New Card */}
              <div
                onClick={() => {
                  setNewTitle('');
                  setNewType('blog');
                  setNewPlatform('custom');
                  setShowCreateModal(true);
                }}
                className="bg-white/[0.015] border-2 border-dashed border-white/10 hover:border-primary/40 hover:bg-primary/[0.02] rounded-xl flex flex-col items-center justify-center gap-2 py-10 cursor-pointer transition-all duration-300 min-h-[190px]"
              >
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover:text-primary">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-white/60">New Document Canvas</span>
                <span className="text-[10px] text-white/30 text-center px-4 leading-normal">Start writing long-form or platform outlines</span>
              </div>

              {/* Document items */}
              {filteredDocs.map((doc) => {
                const words = doc.body_plain ? doc.body_plain.split(/\s+/).filter(Boolean).length : 0;
                
                return (
                  <Link
                    href={`/content-studio/${doc.id}`}
                    key={doc.id}
                    className="bg-[#080f28] border border-white/5 rounded-xl p-5 hover:border-white/15 hover:bg-[#0c1535] hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between min-h-[190px] relative group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          doc.content_type === 'blog' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                          doc.content_type === 'social' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {doc.content_type}
                        </span>
                        
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                          doc.status === 'published' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          'bg-white/5 text-white/40 border border-white/10'
                        }`}>
                          {doc.status}
                        </span>
                      </div>

                      <h4 className="font-space-grotesk text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-primary transition mb-1.5">
                        {doc.title}
                      </h4>
                      
                      <p className="text-[11px] text-white/40 line-clamp-3 leading-normal mb-3 font-dm-sans">
                        {doc.body_plain || 'Start typing content outlines inside this document workspace...'}
                      </p>
                    </div>

                    <div className="border-t border-white/5 pt-3 flex items-center justify-between text-[10px] text-white/30 font-semibold font-mono uppercase">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(doc.updated_at).toLocaleDateString()}
                      </span>
                      <span>{words} Words</span>
                      
                      <button
                        onClick={(e) => handleDeleteDocument(doc.id, e)}
                        className="opacity-0 group-hover:opacity-100 hover:text-red transition duration-150 p-1 rounded bg-white/5 border border-white/5"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </Link>
                );
              })}

            </div>
          ) : (
            <div className="bg-[#080f28] border border-white/5 rounded-xl py-16 flex flex-col items-center justify-center text-center px-4">
              <PenTool className="w-12 h-12 text-white/10 mb-4 animate-pulse" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">No documents created yet</h3>
              <p className="text-xs text-white/40 max-w-sm leading-relaxed mb-4">
                Initialize your content pipeline by creating your first blog post draft, social thread, or email sequence copy.
              </p>
              <button
                onClick={() => {
                  setNewTitle('');
                  setNewType('blog');
                  setNewPlatform('custom');
                  setShowCreateModal(true);
                }}
                className="bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-blue-600 transition flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Create First Document
              </button>
            </div>
          )}

        </div>

        {/* Create Document Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#080f28] border border-white/10 p-6 rounded-xl w-full max-w-md shadow-2xl relative animate-scale-in">
              
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 text-white/40 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="mb-4 flex items-center gap-2">
                <FilePenLine className="w-5 h-5 text-primary" />
                <h3 className="font-space-grotesk text-sm font-bold text-white uppercase tracking-wider">
                  New Document Canvas
                </h3>
              </div>

              <form onSubmit={handleCreateDocument} className="space-y-4">
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Document Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 5 LeadsMind Strategies for CRM Scaling"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full bg-[#04091a] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Content Type</label>
                    <select
                      value={newType}
                      onChange={e => setNewType(e.target.value)}
                      className="w-full bg-[#04091a] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary transition cursor-pointer"
                    >
                      <option value="blog">Blog Outline</option>
                      <option value="social">Social Copy</option>
                      <option value="email">Email Template</option>
                      <option value="other">Custom Content</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Target Platform</label>
                    <select
                      value={newPlatform}
                      onChange={e => setNewPlatform(e.target.value)}
                      className="w-full bg-[#04091a] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary transition cursor-pointer"
                    >
                      <option value="custom">Generic Custom</option>
                      <option value="medium">Medium</option>
                      <option value="devto">Dev.to</option>
                      <option value="twitter">Twitter / X</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="facebook">Facebook</option>
                      <option value="newsletter">Email Newsletter</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg text-xs font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newTitle.trim()}
                    className="px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <PenTool className="w-3.5 h-3.5" />
                    )}
                    Initialize Outline
                  </button>
                </div>

              </form>

            </div>
          </div>
        )}

        {confirmConfig && (
          <ConfirmDialog
            isOpen={confirmConfig.isOpen}
            onClose={() => setConfirmConfig(prev => prev ? { ...prev, isOpen: false } : null)}
            onConfirm={confirmConfig.onConfirm}
            title={confirmConfig.title}
            description={confirmConfig.description}
            confirmLabel={confirmConfig.confirmLabel}
            variant="danger"
          />
        )}

      </Wrapper>
    </MetaData>
  );
}
