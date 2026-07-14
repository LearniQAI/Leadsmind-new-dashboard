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
  Share2,
  Mail,
  Loader2,
  FilePenLine,
  SlidersHorizontal,
  PenTool
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashStatusPill } from '@/components/dashboard-ui/StatusPill';
import { DashEmptyState } from '@/components/dashboard-ui/EmptyState';
import { DashFormField, DashInput } from '@/components/dashboard-ui/FormField';
import {
  DashModal, DashModalContent, DashModalHeader, DashModalTitle, DashModalFooter
} from '@/components/dashboard-ui/Modal';

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

  const openCreateModal = () => {
    setNewTitle('');
    setNewType('blog');
    setNewPlatform('custom');
    setShowCreateModal(true);
  };

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
      title: 'Delete document?',
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

  const typeStatusVariant = (type: string) =>
    type === 'blog' ? 'accent' : type === 'social' ? 'info' : 'warning';

  return (
    <MetaData pageTitle="Content Studio">
      <Wrapper>
        <div className="py-8 px-6 max-w-7xl mx-auto space-y-6">

          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dash-border pb-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold !text-dash-text">
                Content <span className="text-dash-accent">studio</span>
              </h1>
              <p className="!text-dash-textMuted text-[12px] font-medium">
                Workspace content generation and platform orchestration
              </p>
            </div>
            <DashButton onClick={openCreateModal}>
              <Plus className="w-4 h-4" /> Create document
            </DashButton>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

            <DashCard padding="default" className="relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-dash-accent">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold !text-dash-textMuted">All documents</span>
                <div className="w-8 h-8 rounded-full bg-dash-accent/10 flex items-center justify-center text-dash-accent">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-bold !text-dash-text">{totalCount}</h3>
              <p className="text-[10px] !text-dash-textMuted mt-1">Total active documents in workspace</p>
            </DashCard>

            <DashCard padding="default" className="relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-purple-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold !text-dash-textMuted">Blog articles</span>
                <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                  <PenTool className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-bold !text-dash-text">{blogCount}</h3>
              <p className="text-[10px] !text-dash-textMuted mt-1">Long-form outline documents</p>
            </DashCard>

            <DashCard padding="default" className="relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-dash-accent">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold !text-dash-textMuted">Social copies</span>
                <div className="w-8 h-8 rounded-full bg-dash-accent/10 flex items-center justify-center text-dash-accent">
                  <Share2 className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-bold !text-dash-text">{socialCount}</h3>
              <p className="text-[10px] !text-dash-textMuted mt-1">Twitter, LinkedIn & platform posts</p>
            </DashCard>

            <DashCard padding="default" className="relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-amber-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold !text-dash-textMuted">Email templates</span>
                <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                  <Mail className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-bold !text-dash-text">{emailCount}</h3>
              <p className="text-[10px] !text-dash-textMuted mt-1">Newsletters & sequence copies</p>
            </DashCard>

          </div>

          {/* Toolbar */}
          <DashCard padding="default" className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">

            {/* Search */}
            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 !text-dash-textMuted absolute left-3 top-1/2 -translate-y-1/2" />
              <DashInput
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-9 pl-9 text-xs"
              />
            </div>

            {/* Type Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold !text-dash-textMuted mr-2 hidden sm:inline-flex items-center gap-1">
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
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors motion-reduce:transition-none",
                    activeType === tab.id
                      ? 'bg-dash-accent/10 text-dash-accent border border-dash-accent/20'
                      : 'bg-dash-surface !text-dash-textMuted hover:!text-dash-text border border-transparent'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Status Filters */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold !text-dash-textMuted mr-2 hidden sm:inline">
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
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors motion-reduce:transition-none",
                    activeStatus === tab.id
                      ? 'bg-dash-surface !text-dash-text border border-dash-border'
                      : '!text-dash-textMuted hover:!text-dash-text'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

          </DashCard>

          {/* Grid Layout of Cards */}
          {filteredDocs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Dashed Add New Card */}
              <div
                onClick={openCreateModal}
                className="bg-dash-surface border-2 border-dashed border-dash-border hover:border-dash-accent/40 hover:bg-dash-accent/5 rounded-xl flex flex-col items-center justify-center gap-2 py-10 cursor-pointer transition-colors motion-reduce:transition-none min-h-[190px] group"
              >
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center !text-dash-textMuted group-hover:text-dash-accent">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold !text-dash-text">New document canvas</span>
                <span className="text-[10px] !text-dash-textMuted text-center px-4 leading-normal">Start writing long-form or platform outlines</span>
              </div>

              {/* Document items */}
              {filteredDocs.map((doc) => {
                const words = doc.body_plain ? doc.body_plain.split(/\s+/).filter(Boolean).length : 0;

                return (
                  <Link
                    href={`/content-studio/${doc.id}`}
                    key={doc.id}
                  >
                    <DashCard padding="default" className="flex flex-col justify-between min-h-[190px] relative group h-full">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <DashStatusPill variant={typeStatusVariant(doc.content_type)}>
                            {doc.content_type}
                          </DashStatusPill>
                          <DashStatusPill variant={doc.status === 'published' ? 'success' : 'neutral'}>
                            {doc.status}
                          </DashStatusPill>
                        </div>

                        <h4 className="text-sm font-bold !text-dash-text line-clamp-2 leading-snug group-hover:text-dash-accent transition-colors motion-reduce:transition-none mb-1.5">
                          {doc.title}
                        </h4>

                        <p className="text-[11px] !text-dash-textMuted line-clamp-3 leading-normal mb-3">
                          {doc.body_plain || 'Start typing content outlines inside this document workspace...'}
                        </p>
                      </div>

                      <div className="border-t border-dash-border pt-3 flex items-center justify-between text-[10px] !text-dash-textMuted font-semibold">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(doc.updated_at).toLocaleDateString()}
                        </span>
                        <span>{words} words</span>

                        <button
                          onClick={(e) => handleDeleteDocument(doc.id, e)}
                          className="opacity-0 group-hover:opacity-100 hover:text-red transition-colors motion-reduce:transition-none duration-150 p-1 rounded bg-dash-surface border border-dash-border"
                          title="Delete Document"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </DashCard>
                  </Link>
                );
              })}

            </div>
          ) : (
            <DashCard padding="default">
              <DashEmptyState
                icon={PenTool}
                title="No documents created yet"
                description="Initialize your content pipeline by creating your first blog post draft, social thread, or email sequence copy."
                actionLabel="Create first document"
                onAction={openCreateModal}
              />
            </DashCard>
          )}

        </div>

        {/* Create Document Modal */}
        <DashModal open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DashModalContent className="max-w-md">
            <DashModalHeader>
              <DashModalTitle className="flex items-center gap-2">
                <FilePenLine className="w-5 h-5 text-dash-accent" />
                New document canvas
              </DashModalTitle>
            </DashModalHeader>

            <form onSubmit={handleCreateDocument} className="space-y-4">

              <DashFormField label="Document title">
                <DashInput
                  type="text"
                  required
                  placeholder="e.g. 5 LeadsMind Strategies for CRM Scaling"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                />
              </DashFormField>

              <div className="grid grid-cols-2 gap-3">
                <DashFormField label="Content type">
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value)}
                    className="w-full h-11 rounded-xl border border-dash-border bg-white px-3.5 text-sm !text-dash-text outline-none focus-visible:ring-2 focus-visible:ring-dash-accent cursor-pointer"
                  >
                    <option value="blog">Blog Outline</option>
                    <option value="social">Social Copy</option>
                    <option value="email">Email Template</option>
                    <option value="other">Custom Content</option>
                  </select>
                </DashFormField>

                <DashFormField label="Target platform">
                  <select
                    value={newPlatform}
                    onChange={e => setNewPlatform(e.target.value)}
                    className="w-full h-11 rounded-xl border border-dash-border bg-white px-3.5 text-sm !text-dash-text outline-none focus-visible:ring-2 focus-visible:ring-dash-accent cursor-pointer"
                  >
                    <option value="custom">Generic Custom</option>
                    <option value="medium">Medium</option>
                    <option value="devto">Dev.to</option>
                    <option value="twitter">Twitter / X</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="facebook">Facebook</option>
                    <option value="newsletter">Email Newsletter</option>
                  </select>
                </DashFormField>
              </div>

              <DashModalFooter>
                <DashButton type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </DashButton>
                <DashButton type="submit" disabled={isSubmitting || !newTitle.trim()}>
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <PenTool className="w-3.5 h-3.5" />
                  )}
                  Initialize outline
                </DashButton>
              </DashModalFooter>

            </form>
          </DashModalContent>
        </DashModal>

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
