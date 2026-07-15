"use client";

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus,
  Globe,
  MoreVertical,
  ExternalLink,
  Loader2,
  Check,
  AlertCircle,
  LayoutGrid,
  LayoutList,
  Trash2,
  Settings2,
  Copy,
  Edit3,
  ArrowRight,
  Search,
  Zap,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  createWebsite,
  duplicateWebsite,
  deleteWebsite,
  updateWebsiteSettings,
  getTemplates
} from '@/app/actions/builder';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useDashboardContext } from "@/components/layouts/DashboardProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import { WebsitesSkeleton } from "@/components/builder/skeletons/WebsitesSkeleton";
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashStatusPill } from '@/components/dashboard-ui/StatusPill';
import { DashEmptyState } from '@/components/dashboard-ui/EmptyState';
import { DashFormField, DashInput } from '@/components/dashboard-ui/FormField';
import {
  DashModal, DashModalContent, DashModalHeader, DashModalTitle, DashModalDescription, DashModalFooter
} from '@/components/dashboard-ui/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

export default function WebsiteManager() {
  const { workspace } = useDashboardContext();
  const [websites, setWebsites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'live' | 'draft'>('all');

  // Rename & Delete State
  const [renameSite, setRenameSite] = useState<any>(null);
  const [deleteSite, setDeleteSite] = useState<any>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [dbTemplates, setDbTemplates] = useState<any[]>([]);
  const [templateError, setTemplateError] = useState<string | null>(null);

  // New features state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Template Filter States
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateCategory, setTemplateCategory] = useState('All');

  const router = useRouter();
  const supabase = createClient();

  const fetchTemplates = async () => {
    setTemplateError(null);
    try {
      const templates = await getTemplates('website');
      setDbTemplates(templates);
    } catch (err: any) {
      console.error('Error fetching templates:', err);
      setTemplateError(err.message || 'Failed to load templates');
    }
  };

  const fetchWebsites = useCallback(async () => {
    if (!workspace?.id) return;

    try {
      const { data, error } = await supabase
        .from('websites')
        .select(`
          *,
          workspace:workspaces!inner(slug, id),
          website_pages(id, pages(id))
        `)
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching websites:', error);
        toast.error('Failed to load websites');
        return;
      }

      if (data) setWebsites(data);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [workspace?.id, supabase]);

  useEffect(() => {
    if (workspace?.id) {
      fetchWebsites();
    }
    fetchTemplates();
  }, [workspace?.id, fetchWebsites]);

  const filteredWebsites = useMemo(() => {
    let result = [...websites];

    // Status Filter
    if (filter === 'live') result = result.filter(s => s.is_published);
    if (filter === 'draft') result = result.filter(s => !s.is_published);

    // Search Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.subdomain?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [websites, filter, searchQuery]);

  const categories = useMemo(() => {
    const cats = new Set(dbTemplates.map(t => t.category).filter(Boolean));
    return ['All', ...Array.from(cats).sort()];
  }, [dbTemplates]);

  const filteredTemplates = useMemo(() => {
    return dbTemplates.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
        t.description.toLowerCase().includes(templateSearch.toLowerCase());
      const matchesCategory = templateCategory === 'All' || t.category === templateCategory;
      return matchesSearch && matchesCategory;
    });
  }, [dbTemplates, templateSearch, templateCategory]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleteModalOpen(true);
  };

  const confirmBulkDelete = async () => {
    setIsBulkDeleting(true);
    let successCount = 0;

    try {
      for (const id of Array.from(selectedIds)) {
        const res = await deleteWebsite(id);
        if (res.success) successCount++;
      }

      toast.success(`Successfully deleted ${successCount} websites`);
      setSelectedIds(new Set());
      fetchWebsites();
      setIsBulkDeleteModalOpen(false);
    } catch (err) {
      toast.error('Bulk delete operation encountered errors');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleCreate = async () => {
    if (!newSiteName) {
      toast.error('Please enter a website name');
      return;
    }
    setCreating(true);
    const subdomain = newSiteName.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');
    const result = await createWebsite(newSiteName, subdomain, selectedTemplate || undefined);

    if (result.success) {
      toast.success('Website created successfully');
      router.push(`/editor/website/${result.websiteId}/${result.pageId}`);
    } else {
      setCreating(false);
      toast.error(result.error);
    }
  };

  const handleDuplicate = async (id: string) => {
    toast.promise(duplicateWebsite(id), {
      loading: 'Duplicating website...',
      success: (res) => {
        if (res.success) {
          fetchWebsites();
          return 'Website duplicated successfully';
        }
        throw new Error(res.error);
      },
      error: (err) => err.message
    });
  };

  const handleRename = async () => {
    if (!renameSite || !renameSite.name) return;
    setIsRenaming(true);
    const result = await updateWebsiteSettings(renameSite.id, 'website', { name: renameSite.name });
    if (result.success) {
      toast.success('Website renamed');
      fetchWebsites();
      setRenameSite(null);
    } else {
      toast.error('Failed to rename');
    }
    setIsRenaming(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteSite) return;

    toast.promise(deleteWebsite(deleteSite.id), {
      loading: 'Deleting website...',
      success: (res) => {
        if (res.success) {
          fetchWebsites();
          setDeleteSite(null);
          return 'Website deleted';
        }
        throw new Error(res.error);
      },
      error: (err) => err.message
    });
  };

  if (loading) {
    return (
      <MetaData pageTitle="Websites | Leadsmind">
        <Wrapper>
          <div className="flex flex-col min-h-screen bg-white overflow-hidden">
            <WebsitesSkeleton />
          </div>
        </Wrapper>
      </MetaData>
    );
  }

  return (
    <MetaData pageTitle="Websites | Leadsmind">
      <Wrapper>
        <div className="flex flex-col gap-y-6 px-6 py-5">

          {/* PAGE HEADER */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold !text-dash-text">
                Marketing <span className="text-dash-accent">websites</span>
              </h1>
              <p className="!text-dash-textMuted text-[12px] font-medium mt-2">
                Deploy and manage high-conversion online properties
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden lg:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 !text-dash-textMuted" />
                <DashInput
                  placeholder="Search websites..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-[220px] pl-9 text-[11px]"
                />
              </div>
              <DashButton onClick={() => setIsModalOpen(true)}>
                <Plus className="h-4 w-4" />
                New
              </DashButton>
            </div>
          </div>

          {/* TOOLBAR */}
          <div className="flex items-center justify-between border-y border-dash-border py-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilter('all')}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[10.5px] font-semibold transition-colors motion-reduce:transition-none",
                  filter === 'all' ? "bg-dash-accent/10 text-dash-accent border border-dash-accent/20" : "!text-dash-textMuted hover:!text-dash-text border border-transparent"
                )}
              >
                All websites ({websites.length})
              </button>
              <button
                onClick={() => setFilter('live')}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[10.5px] font-semibold transition-colors motion-reduce:transition-none flex items-center gap-1.5",
                  filter === 'live' ? "bg-green/10 text-green border border-green/20" : "!text-dash-textMuted hover:!text-dash-text border border-transparent"
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green" />
                Live ({websites.filter(s => s.is_published).length})
              </button>
              <button
                onClick={() => setFilter('draft')}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[10.5px] font-semibold transition-colors motion-reduce:transition-none flex items-center gap-1.5",
                  filter === 'draft' ? "bg-purple-50 text-purple-600 border border-purple-200" : "!text-dash-textMuted hover:!text-dash-text border border-transparent"
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                Draft ({websites.filter(s => !s.is_published).length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <DashButton
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                >
                  {isBulkDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  Delete selected ({selectedIds.size})
                </DashButton>
              )}

              <div className="h-4 w-[1px] bg-dash-border mx-2" />
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className={cn(
                  "p-2 transition-colors motion-reduce:transition-none rounded-lg",
                  viewMode === 'list' ? "bg-dash-accent/10 text-dash-accent" : "!text-dash-textMuted hover:!text-dash-text"
                )}
                title={viewMode === 'grid' ? "Switch to List View" : "Switch to Grid View"}
              >
                {viewMode === 'grid' ? <LayoutList className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
              </button>
              <button className="p-2 !text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none" title="Sort & Filter">
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          {filteredWebsites.length === 0 ? (
            <div className="mt-4">
              <DashEmptyState
                icon={Globe}
                title="No websites found"
                description="Create your first website to start capturing traffic and deploying funnels."
                actionLabel="Create first website"
                onAction={() => setIsModalOpen(true)}
              />
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-2">
              {filteredWebsites.map((site) => (
                <div
                  key={site.id}
                  className={cn(
                    "relative bg-white border border-dash-border rounded-xl p-[18px] transition-colors motion-reduce:transition-none hover:border-dash-text/20 group overflow-hidden shadow-sm",
                    site.is_published ? "before:bg-green" : "before:bg-purple-600",
                    "before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[2.5px] before:z-10",
                    selectedIds.has(site.id) && "border-dash-accent/50 bg-dash-accent/5"
                  )}
                >
                  <div className="flex justify-between items-start mb-5 relative z-20">
                    <div className="flex items-center gap-3">
                      <div
                        onClick={() => toggleSelection(site.id)}
                        className={cn(
                          "w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-colors motion-reduce:transition-none",
                          selectedIds.has(site.id) ? "bg-dash-accent border-dash-accent" : "bg-dash-surface border-dash-border hover:border-dash-text/30"
                        )}
                      >
                        {selectedIds.has(site.id) && <Check size={12} className="text-white" strokeWidth={4} />}
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-dash-surface border border-dash-border flex items-center justify-center !text-dash-textMuted group-hover:text-dash-accent group-hover:bg-dash-accent/10 group-hover:border-dash-accent/20 transition-colors motion-reduce:transition-none">
                        <Globe size={18} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <DashStatusPill variant={site.is_published ? 'success' : 'accent'}>
                        {site.is_published ? 'Live' : 'Draft'}
                      </DashStatusPill>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="w-8 h-8 flex items-center justify-center rounded-lg !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface transition-colors motion-reduce:transition-none">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 bg-white border border-dash-border p-1.5 rounded-xl shadow-lg">
                          <DropdownMenuItem
                            className="flex items-center gap-2.5 p-2.5 rounded-lg text-[12px] font-medium !text-dash-textMuted cursor-pointer hover:bg-dash-surface hover:!text-dash-text transition-colors motion-reduce:transition-none"
                            onClick={() => {
                              const pageId = site.website_pages?.[0]?.pages?.[0]?.id;
                              router.push(`/editor/website/${site.id}/${pageId}`);
                            }}
                          >
                            <Edit3 size={14} className="text-dash-accent" /> Launch builder
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="flex items-center gap-2.5 p-2.5 rounded-lg text-[12px] font-medium !text-dash-textMuted cursor-pointer hover:bg-dash-surface hover:!text-dash-text transition-colors motion-reduce:transition-none"
                            onClick={() => setRenameSite({ id: site.id, name: site.name })}
                          >
                            <Settings2 size={14} /> Rename site
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="flex items-center gap-2.5 p-2.5 rounded-lg text-[12px] font-medium !text-dash-textMuted cursor-pointer hover:bg-dash-surface hover:!text-dash-text transition-colors motion-reduce:transition-none"
                            onClick={() => handleDuplicate(site.id)}
                          >
                            <Copy size={14} /> Clone site
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-dash-border my-1" />
                          <DropdownMenuItem
                            className="flex items-center gap-2.5 p-2.5 rounded-lg text-[12px] font-medium text-red cursor-pointer hover:bg-red/10 transition-colors motion-reduce:transition-none"
                            onClick={() => setDeleteSite(site)}
                          >
                            <Trash2 size={14} /> Delete website
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="mb-6 relative z-20">
                    <h4 className="text-[15px] font-bold !text-dash-text mb-1 group-hover:text-dash-accent transition-colors motion-reduce:transition-none leading-tight">
                      {site.name}
                    </h4>
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <span className="text-[10px] font-bold !text-dash-textMuted shrink-0">Domain:</span>
                      <span className="text-[11px] font-medium text-dash-accent/70 lowercase truncate">{site.subdomain}.leadsmind.io</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-dash-border relative z-20">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold !text-dash-textMuted mb-0.5">Last sync</span>
                      <span className="text-[11.5px] font-medium !text-dash-textMuted">
                        {formatDistanceToNow(new Date(site.updated_at || site.created_at))} ago
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Link href={`/p/${site.workspace?.slug}/${site.subdomain}`} target="_blank">
                        <button className="h-8.5 w-8.5 flex items-center justify-center rounded-lg bg-dash-surface border border-dash-border !text-dash-textMuted hover:text-dash-accent hover:bg-dash-accent/10 hover:border-dash-accent/20 transition-colors motion-reduce:transition-none">
                          <ExternalLink size={14} />
                        </button>
                      </Link>
                      <Link href={site.website_pages?.[0]?.pages?.[0]?.id
                        ? `/editor/website/${site.id}/${site.website_pages[0].pages[0].id}`
                        : `/editor/website/${site.id}`}>
                        <DashButton size="sm">
                          Manage <ArrowRight size={13} />
                        </DashButton>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}

              {/* Dashed Add New Card */}
              <div
                onClick={() => setIsModalOpen(true)}
                className="relative bg-dash-surface border-[1.5px] border-dashed border-dash-border rounded-xl flex flex-col items-center justify-center gap-3 min-h-[180px] cursor-pointer hover:bg-dash-accent/5 hover:border-dash-accent/30 transition-colors motion-reduce:transition-none group"
              >
                <div className="w-12 h-12 rounded-full bg-white border border-dash-border flex items-center justify-center !text-dash-textMuted group-hover:text-dash-accent group-hover:border-dash-accent/30 transition-colors motion-reduce:transition-none">
                  <Plus size={24} />
                </div>
                <div className="text-center">
                  <h5 className="text-[12px] font-bold !text-dash-textMuted group-hover:!text-dash-text transition-colors motion-reduce:transition-none">Create website</h5>
                  <p className="text-[11px] !text-dash-textMuted font-medium mt-0.5 opacity-70">Deploy a fresh site</p>
                </div>
              </div>
            </div>
          ) : (
            /* LIST VIEW */
            <div className="flex flex-col gap-2 mt-2">
              <div className="grid grid-cols-[40px_1fr_150px_150px_150px] gap-4 px-6 py-2 text-[10px] font-bold !text-dash-textMuted">
                <div></div>
                <div>Site name</div>
                <div>Status</div>
                <div>Last updated</div>
                <div className="text-right">Actions</div>
              </div>
              {filteredWebsites.map((site) => (
                <div
                  key={site.id}
                  className={cn(
                    "grid grid-cols-[40px_1fr_150px_150px_150px] gap-4 items-center bg-white border border-dash-border rounded-lg px-6 py-3 hover:border-dash-text/20 transition-colors motion-reduce:transition-none group",
                    selectedIds.has(site.id) && "bg-dash-accent/5 border-dash-accent/30"
                  )}
                >
                  <div
                    onClick={() => toggleSelection(site.id)}
                    className={cn(
                      "w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-colors motion-reduce:transition-none",
                      selectedIds.has(site.id) ? "bg-dash-accent border-dash-accent" : "bg-dash-surface border-dash-border hover:border-dash-text/30"
                    )}
                  >
                    {selectedIds.has(site.id) && <Check size={12} className="text-white" strokeWidth={4} />}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-dash-surface flex items-center justify-center !text-dash-textMuted">
                      <Globe size={14} />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold !text-dash-text leading-tight">{site.name}</h4>
                      <p className="text-[10px] !text-dash-textMuted font-medium">{site.subdomain}.leadsmind.io</p>
                    </div>
                  </div>
                  <div>
                    <DashStatusPill variant={site.is_published ? 'success' : 'accent'}>
                      {site.is_published ? 'Live' : 'Draft'}
                    </DashStatusPill>
                  </div>
                  <div className="text-[11px] !text-dash-textMuted font-medium">
                    {formatDistanceToNow(new Date(site.updated_at || site.created_at))} ago
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Link href={site.website_pages?.[0]?.pages?.[0]?.id
                      ? `/editor/website/${site.id}/${site.website_pages[0].pages[0].id}`
                      : `/editor/website/${site.id}`}>
                      <button className="h-8 w-8 flex items-center justify-center rounded-lg bg-dash-surface !text-dash-textMuted hover:text-dash-accent hover:bg-dash-accent/10 transition-colors motion-reduce:transition-none">
                        <Edit3 size={14} />
                      </button>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="h-8 w-8 flex items-center justify-center rounded-lg bg-dash-surface !text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white border border-dash-border shadow-lg rounded-xl">
                        <DropdownMenuItem onClick={() => handleDuplicate(site.id)} className="!text-dash-textMuted hover:!text-dash-text">Clone</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setRenameSite({ id: site.id, name: site.name })} className="!text-dash-textMuted hover:!text-dash-text">Rename</DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-dash-border" />
                        <DropdownMenuItem className="text-red hover:bg-red/10" onClick={() => setDeleteSite(site)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MODALS */}

        {/* New Website Modal - Blueprint Selection */}
        <DashModal open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DashModalContent className="max-w-[950px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
            <div className="px-6 py-5 border-b border-dash-border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-dash-accent/10 flex items-center justify-center border border-dash-accent/20">
                  <Zap className="h-5 w-5 text-dash-accent" />
                </div>
                <div>
                  <DashModalTitle>Create <span className="text-dash-accent">website</span></DashModalTitle>
                  <DashModalDescription>
                    Select a template or start from a blank canvas
                  </DashModalDescription>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex bg-dash-surface min-h-0">
              {/* Sidebar for Filtering */}
              <div className="w-[240px] border-r border-dash-border p-6 space-y-8 hidden md:block overflow-y-auto custom-scrollbar">
                <div className="space-y-3">
                  <label className="text-[11px] font-bold !text-dash-textMuted">Templates library</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 !text-dash-textMuted" />
                    <DashInput
                      placeholder="Search templates..."
                      value={templateSearch}
                      onChange={(e) => setTemplateSearch(e.target.value)}
                      className="h-9 pl-9 text-[11px]"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-bold !text-dash-textMuted">Categories</label>
                  <div className="flex flex-col gap-1.5">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setTemplateCategory(cat)}
                        className={cn(
                          "px-3 py-2 rounded-lg text-left text-[11px] font-semibold transition-colors motion-reduce:transition-none",
                          templateCategory === cat
                            ? "bg-dash-accent/10 text-dash-accent border border-dash-accent/20"
                            : "!text-dash-textMuted hover:!text-dash-text hover:bg-white"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <div className="p-4 rounded-xl bg-dash-accent/5 border border-dash-accent/10">
                    <h5 className="text-[11px] font-bold text-dash-accent mb-2">Pro tip</h5>
                    <p className="text-[10px] !text-dash-textMuted leading-relaxed">
                      Choose a template that matches your industry for the best pre-configured layout.
                    </p>
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-white">
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                  <div className="space-y-8">
                    {/* Step 1: Designation */}
                    <DashFormField label="Website name" htmlFor="name">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-4.5 h-4.5 rounded-full bg-dash-accent/10 text-dash-accent text-[9px] font-bold flex items-center justify-center border border-dash-accent/20">1</span>
                      </div>
                      <DashInput
                        id="name"
                        placeholder="E.g. Lunar AI Marketing Site..."
                        value={newSiteName}
                        onChange={(e) => setNewSiteName(e.target.value)}
                        className="h-11 text-[14px]"
                      />
                    </DashFormField>

                    {/* Step 2: Blueprints */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-4.5 h-4.5 rounded-full bg-dash-accent/10 text-dash-accent text-[9px] font-bold flex items-center justify-center border border-dash-accent/20">2</span>
                          <label className="text-[11px] font-bold !text-dash-textMuted">Templates</label>
                        </div>
                        <div className="text-[10px] font-bold !text-dash-textMuted bg-dash-surface px-2.5 py-1 rounded-full border border-dash-border">
                          {filteredTemplates.length + 1} options matching
                        </div>
                      </div>

                      {templateError ? (
                        <div className="p-12 rounded-2xl border border-dashed border-red/20 bg-red/5 flex flex-col items-center justify-center gap-5 text-center">
                          <div className="h-14 w-14 rounded-full bg-red/10 text-red flex items-center justify-center">
                            <AlertCircle className="w-8 h-8" />
                          </div>
                          <div>
                            <h4 className="font-bold !text-dash-text">Could not load templates</h4>
                            <p className="text-[11px] !text-dash-textMuted mt-1 max-w-[240px]">{templateError}</p>
                          </div>
                          <DashButton variant="secondary" onClick={fetchTemplates}>
                            Retry
                          </DashButton>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                          {/* Blank Canvas Option */}
                          {(templateCategory === 'All' || templateSearch === '') && (
                            <div
                              onClick={() => setSelectedTemplate(null)}
                              className={cn(
                                "group relative cursor-pointer rounded-2xl border-2 transition-colors motion-reduce:transition-none overflow-hidden flex flex-col h-full min-h-[220px]",
                                selectedTemplate === null
                                  ? "border-dash-accent bg-dash-accent/5"
                                  : "border-dash-border bg-dash-surface hover:border-dash-text/20"
                              )}
                            >
                              <div className="flex-1 flex items-center justify-center bg-white border-b border-dash-border relative">
                                <div className="w-12 h-12 rounded-full border-2 border-dashed border-dash-border flex items-center justify-center !text-dash-textMuted group-hover:text-dash-accent group-hover:border-dash-accent/40 transition-colors motion-reduce:transition-none">
                                  <Plus size={24} />
                                </div>
                                {selectedTemplate === null && (
                                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-dash-accent border-[4px] border-white flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" strokeWidth={4} />
                                  </div>
                                )}
                              </div>
                              <div className="p-4 bg-dash-surface">
                                <span className="font-bold text-[12px] block !text-dash-text">Blank slate</span>
                                <span className="text-[10px] font-medium !text-dash-textMuted line-clamp-1 mt-1">Start with a clean canvas</span>
                              </div>
                            </div>
                          )}

                          {/* Professional Blueprints */}
                          {filteredTemplates.map((t) => (
                            <div
                              key={t.id}
                              onClick={() => setSelectedTemplate(t.id)}
                              className={cn(
                                "group relative cursor-pointer rounded-2xl border-2 transition-colors motion-reduce:transition-none overflow-hidden flex flex-col h-full min-h-[220px]",
                                selectedTemplate === t.id
                                  ? "border-dash-accent bg-dash-accent/5"
                                  : "border-dash-border bg-dash-surface hover:border-dash-text/20"
                              )}
                            >
                              <div className="flex-1 bg-dash-surface relative overflow-hidden">
                                {(t.thumbnail || t.preview_image) && (
                                  <img
                                    src={t.thumbnail || t.preview_image}
                                    alt={t.name}
                                    className={cn(
                                      "absolute inset-0 w-full h-full object-cover transition-all duration-500 motion-reduce:transition-none",
                                      selectedTemplate === t.id ? "scale-105 opacity-90" : "opacity-80 group-hover:opacity-100"
                                    )}
                                  />
                                )}

                                {selectedTemplate === t.id && (
                                  <div className="absolute inset-0 flex items-center justify-center z-20 bg-dash-text/10">
                                    <div className="w-10 h-10 rounded-full bg-dash-accent flex items-center justify-center">
                                      <Check className="w-5 h-5 text-white" strokeWidth={4} />
                                    </div>
                                  </div>
                                )}

                                <div className="absolute top-3 left-3 flex gap-2">
                                  <div className="px-2.5 py-0.5 rounded-full bg-white/90 backdrop-blur-sm border border-dash-border text-[9px] font-bold text-dash-accent">
                                    {t.category}
                                  </div>
                                  {t.is_premium && (
                                    <div className="px-2.5 py-0.5 rounded-full bg-amber-50/90 backdrop-blur-sm border border-amber-200 text-[9px] font-bold text-amber-600">
                                      Premium
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="p-4 bg-white">
                                <span className={cn(
                                  "font-bold text-[12px] block transition-colors motion-reduce:transition-none leading-tight",
                                  selectedTemplate === t.id ? "text-dash-accent" : "!text-dash-text group-hover:text-dash-accent"
                                )}>{t.name}</span>
                                <span className="text-[10px] font-medium !text-dash-textMuted line-clamp-1 mt-1">{t.description}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 border-t border-dash-border bg-white flex items-center justify-end gap-3">
              <DashButton variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancel
              </DashButton>
              <DashButton onClick={handleCreate} disabled={creating || !newSiteName}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                Create website
              </DashButton>
            </div>
          </DashModalContent>
        </DashModal>

        {/* Rename Site Modal */}
        <DashModal open={!!renameSite} onOpenChange={(open) => !open && setRenameSite(null)}>
          <DashModalContent className="sm:max-w-[420px]">
            <DashModalHeader>
              <DashModalTitle>Rename <span className="text-dash-accent">website</span></DashModalTitle>
              <DashModalDescription>
                Update the website's display name
              </DashModalDescription>
            </DashModalHeader>
            <div className="space-y-4">
              <DashFormField label="New name" htmlFor="rename-name">
                <DashInput
                  id="rename-name"
                  value={renameSite?.name || ''}
                  onChange={(e) => setRenameSite({ ...renameSite, name: e.target.value })}
                  className="h-12"
                  autoFocus
                />
              </DashFormField>
            </div>
            <DashModalFooter>
              <DashButton variant="ghost" onClick={() => setRenameSite(null)}>
                Cancel
              </DashButton>
              <DashButton onClick={handleRename} disabled={isRenaming}>
                {isRenaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Apply changes
              </DashButton>
            </DashModalFooter>
          </DashModalContent>
        </DashModal>

        <ConfirmDialog
          isOpen={!!deleteSite}
          onClose={() => setDeleteSite(null)}
          onConfirm={handleConfirmDelete}
          title="Delete website?"
          description={`Are you sure you want to delete "${deleteSite?.name}"? This action is destructive and will remove all associated pages and assets.`}
          confirmLabel="Delete permanently"
          variant="danger"
        />

        <ConfirmDialog
          isOpen={isBulkDeleteModalOpen}
          onClose={() => setIsBulkDeleteModalOpen(false)}
          onConfirm={confirmBulkDelete}
          title="Bulk delete?"
          description={`You are about to permanently delete ${selectedIds.size} selected websites. This action is irreversible and will remove all associated pages, assets, and configurations.`}
          confirmLabel={isBulkDeleting ? 'Deleting...' : 'Delete all selected'}
          variant="danger"
        />
      </Wrapper>
    </MetaData>
  );
}
