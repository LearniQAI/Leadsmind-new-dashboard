"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus,
  Globe,
  MoreVertical,
  ExternalLink,
  Loader2,
  Check,
  AlertCircle,
  LayoutTemplate,
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";

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

  useEffect(() => {
    if (workspace?.id) {
      fetchWebsites();
    }
    fetchTemplates();
  }, [workspace?.id]);

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

  const fetchWebsites = async () => {
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
  };

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

      toast.success(`Successfully purged ${successCount} nodes`);
      setSelectedIds(new Set());
      fetchWebsites();
      setIsBulkDeleteModalOpen(false);
    } catch (err) {
      toast.error('Bulk purge operation encountered errors');
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
      loading: 'Replicating node...',
      success: (res) => {
        if (res.success) {
          fetchWebsites();
          return 'Website replicated successfully';
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
      loading: 'Purging data...',
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
      <div className="h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563eb]" />
      </div>
    );
  }

  return (
    <MetaData pageTitle="Websites | Leadsmind">
      <Wrapper>
        <div className="flex flex-col gap-y-6 px-6 py-5">

          {/* PAGE HEADER */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="ph-left">
              <h1 className="text-[22px] font-bold font-display tracking-tight text-[#eef2ff]">
                Marketing <span className="text-[#3b82f6]">Websites</span>
              </h1>
              <p className="text-[11.5px] text-[#4a5a82] uppercase tracking-[0.8px] font-medium mt-1">
                Deploy and manage high-conversion online properties with neural design optimization
              </p>
            </div>
            <div className="ph-right flex items-center gap-3">
              <div className="relative hidden lg:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#4a5a82]" />
                <Input
                  placeholder="SEARCH NODES..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-[220px] bg-white/5 border-white/10 rounded-[8px] pl-9 text-[11px] font-medium placeholder:text-[#4a5a82] focus:border-[#2563eb]/50 transition-all shadow-inner"
                />
              </div>
              <Button
                onClick={() => setIsModalOpen(true)}
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-[8px] font-semibold text-[13px] h-9 px-5 shadow-lg shadow-[#2563eb]/20 transition-all active:scale-[0.98]"
              >
                <Plus className="mr-2 h-4 w-4" />
                New
              </Button>
            </div>
          </div>

          {/* TOOLBAR */}
          <div className="flex items-center justify-between border-y border-white/[0.07] py-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilter('all')}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[10.5px] font-semibold transition-all",
                  filter === 'all' ? "bg-[#2563eb]/15 text-[#60a5fa] border border-[#2563eb]/20" : "text-[#4a5a82] hover:text-[#94a3c8] border border-transparent"
                )}
              >
                All Nodes ({websites.length})
              </button>
              <button
                onClick={() => setFilter('live')}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[10.5px] font-semibold transition-all flex items-center gap-1.5",
                  filter === 'live' ? "bg-[#10b981]/15 text-[#34d399] border border-[#10b981]/20" : "text-[#4a5a82] hover:text-[#94a3c8] border border-transparent"
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                Live ({websites.filter(s => s.is_published).length})
              </button>
              <button
                onClick={() => setFilter('draft')}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[10.5px] font-semibold transition-all flex items-center gap-1.5",
                  filter === 'draft' ? "bg-[#8b5cf6]/15 text-[#a78bfa] border border-[#8b5cf6]/20" : "text-[#4a5a82] hover:text-[#94a3c8] border border-transparent"
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
                Draft ({websites.filter(s => !s.is_published).length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className="h-8 px-4 text-[10px] font-bold uppercase tracking-widest rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20"
                >
                  {isBulkDeleting ? <Loader2 size={12} className="animate-spin mr-2" /> : <Trash2 size={12} className="mr-2" />}
                  Purge Selected ({selectedIds.size})
                </Button>
              )}

              <div className="h-4 w-[1px] bg-white/[0.07] mx-2" />
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className={cn(
                  "p-2 transition-colors rounded-lg",
                  viewMode === 'list' ? "bg-[#2563eb]/10 text-[#3b82f6]" : "text-[#4a5a82] hover:text-[#eef2ff]"
                )}
                title={viewMode === 'grid' ? "Switch to List View" : "Switch to Grid View"}
              >
                {viewMode === 'grid' ? <LayoutList className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
              </button>
              <button className="p-2 text-[#4a5a82] hover:text-[#eef2ff] transition-colors" title="Sort & Filter">
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          {filteredWebsites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 bg-white/[0.02] border border-dashed border-white/[0.07] rounded-[16px] text-center mt-4">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 text-[#4a5a82] border border-white/5 shadow-xl">
                <Globe size={32} strokeWidth={1.5} />
              </div>
              <h3 className="text-[15px] font-semibold text-[#eef2ff] mb-2 font-display uppercase tracking-wider">No websites found</h3>
              <p className="text-[13px] text-[#4a5a82] max-w-[300px] leading-relaxed mb-6">
                Initialize your first marketing node to start capturing traffic and deploying specialized neural funnels.
              </p>
              <Button
                onClick={() => setIsModalOpen(true)}
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-[8px] font-semibold text-[13px] h-10 px-6 shadow-lg shadow-[#2563eb]/20"
              >
                <Plus className="mr-2 h-4 w-4" />
                Initialize First Site
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xxl:grid-cols-3 gap-[14px] mt-2">
              {filteredWebsites.map((site) => (
                <div
                  key={site.id}
                  className={cn(
                    "relative bg-[#0c1535]/85 border border-white/[0.07] rounded-[12px] p-[18px] transition-all duration-300 hover:bg-[#152550]/90 hover:border-white/[0.13] hover:-translate-y-0.5 group overflow-hidden shadow-sm",
                    site.is_published ? "before:bg-[#10b981]" : "before:bg-[#8b5cf6]",
                    "before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[2.5px] before:rounded-t-[12px] before:z-10",
                    selectedIds.has(site.id) && "border-[#3b82f6]/50 bg-[#3b82f6]/5"
                  )}
                >
                  <div className="flex justify-between items-start mb-5 relative z-20">
                    <div className="flex items-center gap-3">
                      <div
                        onClick={() => toggleSelection(site.id)}
                        className={cn(
                          "w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-all",
                          selectedIds.has(site.id) ? "bg-[#3b82f6] border-[#3b82f6]" : "bg-white/5 border-white/10 hover:border-white/20"
                        )}
                      >
                        {selectedIds.has(site.id) && <Check size={12} className="text-white" strokeWidth={4} />}
                      </div>
                      <div className="h-10 w-10 rounded-[10px] bg-white/[0.05] border border-white/[0.07] flex items-center justify-center text-[#94a3c8] group-hover:text-[#3b82f6] group-hover:bg-[#3b82f6]/10 group-hover:border-[#3b82f6]/20 transition-all shadow-inner">
                        <Globe size={18} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border shadow-sm",
                        site.is_published
                          ? "bg-[#10b981]/10 text-[#34d399] border-[#10b981]/20"
                          : "bg-[#8b5cf6]/10 text-[#a78bfa] border-[#8b5cf6]/20"
                      )}>
                        {site.is_published ? 'Live Node' : 'Draft'}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="w-8 h-8 flex items-center justify-center rounded-[8px] text-[#4a5a82] hover:text-[#eef2ff] hover:bg-white/5 transition-all">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 bg-[#0c1535] border-white/[0.07] p-1.5 rounded-[12px] shadow-2xl z-[9999]">
                          <DropdownMenuItem
                            className="flex items-center gap-2.5 p-2.5 rounded-[8px] text-[12px] font-medium text-[#94a3c8] cursor-pointer hover:bg-white/[0.05] hover:text-[#eef2ff] transition-all"
                            onClick={() => {
                              const pageId = site.website_pages?.[0]?.pages?.[0]?.id;
                              router.push(`/editor/website/${site.id}/${pageId}`);
                            }}
                          >
                            <Edit3 size={14} className="text-[#3b82f6]" /> Launch Builder
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="flex items-center gap-2.5 p-2.5 rounded-[8px] text-[12px] font-medium text-[#94a3c8] cursor-pointer hover:bg-white/[0.05] hover:text-[#eef2ff] transition-all"
                            onClick={() => setRenameSite({ id: site.id, name: site.name })}
                          >
                            <Settings2 size={14} /> Rename Site
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="flex items-center gap-2.5 p-2.5 rounded-[8px] text-[12px] font-medium text-[#94a3c8] cursor-pointer hover:bg-white/[0.05] hover:text-[#eef2ff] transition-all"
                            onClick={() => handleDuplicate(site.id)}
                          >
                            <Copy size={14} /> Clone Node
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/[0.07] my-1" />
                          <DropdownMenuItem
                            className="flex items-center gap-2.5 p-2.5 rounded-[8px] text-[12px] font-medium text-[#ef4444] cursor-pointer hover:bg-[#ef4444]/10 transition-all"
                            onClick={() => setDeleteSite(site)}
                          >
                            <Trash2 size={14} /> Purge Website
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="mb-6 relative z-20">
                    <h4 className="text-[15px] font-bold text-[#eef2ff] tracking-tight font-display mb-1 group-hover:text-[#3b82f6] transition-colors leading-tight">
                      {site.name}
                    </h4>
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <span className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-wider shrink-0">Domain:</span>
                      <span className="text-[11px] font-medium text-[#3b82f6]/70 lowercase truncate">{site.subdomain}.leadsmind.ai</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/[0.07] relative z-20">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-[#4a5a82] uppercase tracking-wider mb-0.5">Last Sync</span>
                      <span className="text-[11.5px] font-medium text-[#94a3c8]">
                        {formatDistanceToNow(new Date(site.updated_at || site.created_at))} ago
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Link href={`/p/${site.workspace?.slug}/${site.subdomain}`} target="_blank">
                        <button className="h-8.5 w-8.5 flex items-center justify-center rounded-[8px] bg-white/[0.04] border border-white/[0.07] text-[#4a5a82] hover:text-[#3b82f6] hover:bg-[#3b82f6]/10 hover:border-[#3b82f6]/20 transition-all">
                          <ExternalLink size={14} />
                        </button>
                      </Link>
                      <Link href={`/editor/website/${site.id}/${site.website_pages?.[0]?.pages?.[0]?.id}`}>
                        <Button className="h-8.5 px-4 bg-[#2563eb] text-white rounded-[8px] font-bold text-[11.5px] hover:bg-[#1d4ed8] transition-all flex items-center gap-2 shadow-md shadow-[#2563eb]/10">
                          Manage <ArrowRight size={13} />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}

              {/* Dashed Add New Card */}
              <div
                onClick={() => setIsModalOpen(true)}
                className="relative bg-white/[0.03] border-1.5 border-dashed border-white/[0.07] rounded-[12px] flex flex-col items-center justify-center gap-3 min-h-[180px] cursor-pointer hover:bg-[#2563eb]/[0.06] hover:border-[#2563eb]/30 transition-all group shadow-sm"
              >
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/[0.07] flex items-center justify-center text-[#4a5a82] group-hover:text-[#2563eb] group-hover:scale-110 group-hover:border-[#2563eb]/30 transition-all duration-500 shadow-inner">
                  <Plus size={24} />
                </div>
                <div className="text-center">
                  <h5 className="text-[12px] font-bold uppercase tracking-widest text-[#94a3c8] group-hover:text-[#eef2ff] transition-colors">Initialize Website</h5>
                  <p className="text-[11px] text-[#4a5a82] font-medium mt-0.5 opacity-60">Deploy fresh neural node</p>
                </div>
              </div>
            </div>
          ) : (
            /* LIST VIEW */
            <div className="flex flex-col gap-2 mt-2">
              <div className="grid grid-cols-[40px_1fr_150px_150px_150px] gap-4 px-6 py-2 text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest">
                <div></div>
                <div>Node Name</div>
                <div>Status</div>
                <div>Last Updated</div>
                <div className="text-right">Actions</div>
              </div>
              {filteredWebsites.map((site) => (
                <div
                  key={site.id}
                  className={cn(
                    "grid grid-cols-[40px_1fr_150px_150px_150px] gap-4 items-center bg-[#0c1535]/60 border border-white/[0.05] rounded-[10px] px-6 py-3 hover:bg-[#152550]/80 hover:border-white/10 transition-all group",
                    selectedIds.has(site.id) && "bg-[#3b82f6]/5 border-[#3b82f6]/30"
                  )}
                >
                  <div
                    onClick={() => toggleSelection(site.id)}
                    className={cn(
                      "w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-all",
                      selectedIds.has(site.id) ? "bg-[#3b82f6] border-[#3b82f6]" : "bg-white/5 border-white/10 hover:border-white/20"
                    )}
                  >
                    {selectedIds.has(site.id) && <Check size={12} className="text-white" strokeWidth={4} />}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-[#4a5a82]">
                      <Globe size={14} />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-[#eef2ff] leading-tight">{site.name}</h4>
                      <p className="text-[10px] text-[#4a5a82] font-medium">{site.subdomain}.leadsmind.ai</p>
                    </div>
                  </div>
                  <div>
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                      site.is_published ? "text-emerald-500 bg-emerald-500/10" : "text-violet-500 bg-violet-500/10"
                    )}>
                      {site.is_published ? 'Live' : 'Draft'}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#94a3c8] font-medium">
                    {formatDistanceToNow(new Date(site.updated_at || site.created_at))} ago
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/editor/website/${site.id}/${site.website_pages?.[0]?.pages?.[0]?.id}`}>
                      <button className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/5 text-[#4a5a82] hover:text-[#3b82f6] hover:bg-[#3b82f6]/10 transition-all">
                        <Edit3 size={14} />
                      </button>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/5 text-[#4a5a82] hover:text-[#eef2ff] transition-all">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#0c1535] border-white/10">
                        <DropdownMenuItem onClick={() => handleDuplicate(site.id)}>Clone</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setRenameSite({ id: site.id, name: site.name })}>Rename</DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/5" />
                        <DropdownMenuItem className="text-red-500" onClick={() => setDeleteSite(site)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MODALS */}

        {/* New Website Modal - High Fidelity Blueprint Selection */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-[950px] max-h-[90vh] flex flex-col p-0 bg-[#080f28] border-white/[0.07] text-[#eef2ff] overflow-hidden rounded-[16px] shadow-2xl z-[9999]">
            <DialogHeader className="px-6 py-5 border-b border-white/[0.07] bg-[#0c1535]/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-[10px] bg-[#2563eb]/10 flex items-center justify-center border border-[#2563eb]/20 shadow-[0_0_15px_rgba(37,99,235,0.1)]">
                  <Zap className="h-5 w-5 text-[#3b82f6]" />
                </div>
                <div>
                  <DialogTitle className="text-[18px] font-bold font-display uppercase tracking-tight">Deploy <span className="text-[#3b82f6]">Neural Node</span></DialogTitle>
                  <DialogDescription className="text-[10.5px] text-[#4a5a82] font-medium uppercase tracking-[0.8px] mt-0.5">
                    Select a blueprint or start from a blank canvas
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-hidden flex bg-[#04091a]/30 min-h-0">
              {/* Sidebar for Filtering */}
              <div className="w-[240px] border-r border-white/[0.05] p-6 space-y-8 hidden md:block overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-[#4a5a82]">Templates Library</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#4a5a82]" />
                    <Input
                      placeholder="Search blueprints..."
                      value={templateSearch}
                      onChange={(e) => setTemplateSearch(e.target.value)}
                      className="h-9 bg-white/[0.04] border-white/10 rounded-[8px] pl-9 text-[11px] font-medium placeholder:text-[#2a3557] focus:border-[#2563eb]/50 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-[#4a5a82]">Categories</Label>
                  <div className="flex flex-col gap-1.5">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setTemplateCategory(cat)}
                        className={cn(
                          "px-3 py-2 rounded-lg text-left text-[11px] font-semibold transition-all",
                          templateCategory === cat
                            ? "bg-[#2563eb]/10 text-[#3b82f6] border border-[#2563eb]/20"
                            : "text-[#4a5a82] hover:text-[#eef2ff] hover:bg-white/5"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <div className="p-4 rounded-xl bg-[#2563eb]/5 border border-[#2563eb]/10">
                    <h5 className="text-[10px] font-bold text-[#3b82f6] uppercase tracking-wider mb-2">Pro Tip</h5>
                    <p className="text-[9px] text-[#4a5a82] leading-relaxed">
                      Choose a template that matches your industry for the best pre-configured neural hooks.
                    </p>
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col min-w-0 min-h-0">
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                  <div className="space-y-8">
                    {/* Step 1: Designation */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-4.5 h-4.5 rounded-full bg-[#2563eb]/15 text-[#3b82f6] text-[9px] font-bold flex items-center justify-center border border-[#2563eb]/20">1</span>
                        <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-wider text-[#4a5a82]">Website Designation</Label>
                      </div>
                      <Input
                        id="name"
                        placeholder="E.g. Lunar AI Marketing Site..."
                        value={newSiteName}
                        onChange={(e) => setNewSiteName(e.target.value)}
                        className="h-11 bg-white/[0.04] border-white/10 text-[#eef2ff] rounded-[10px] px-5 text-[14px] font-medium placeholder:text-[#2a3557] focus:border-[#2563eb]/50 focus:bg-white/[0.06] transition-all outline-none"
                      />
                    </div>

                    {/* Step 2: Blueprints */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-4.5 h-4.5 rounded-full bg-[#2563eb]/15 text-[#3b82f6] text-[9px] font-bold flex items-center justify-center border border-[#2563eb]/20">2</span>
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-[#4a5a82]">Strategic Blueprints</Label>
                        </div>
                        <div className="text-[9px] font-bold text-[#4a5a82] uppercase tracking-[0.2em] bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                          {filteredTemplates.length + 1} Options Matching
                        </div>
                      </div>

                      {templateError ? (
                        <div className="p-12 rounded-[16px] border border-dashed border-[#ef4444]/20 bg-[#ef4444]/5 flex flex-col items-center justify-center gap-5 text-center">
                          <div className="h-14 w-14 rounded-full bg-[#ef4444]/10 text-[#ef4444] flex items-center justify-center">
                            <AlertCircle className="w-8 h-8" />
                          </div>
                          <div>
                            <h4 className="font-bold text-[#eef2ff] uppercase tracking-tight">Interface Link Interrupted</h4>
                            <p className="text-[11px] text-[#4a5a82] mt-1 max-w-[240px] uppercase tracking-widest">{templateError}</p>
                          </div>
                          <Button
                            variant="outline"
                            onClick={fetchTemplates}
                            className="h-11 border-white/10 hover:bg-white/10 text-[#94a3c8] font-bold uppercase tracking-widest text-[10px] px-8 rounded-[8px]"
                          >
                            Restart Sync
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                          {/* Blank Canvas Option */}
                          {(templateCategory === 'All' || templateSearch === '') && (
                            <div
                              onClick={() => setSelectedTemplate(null)}
                              className={cn(
                                "group relative cursor-pointer rounded-[14px] border-2 transition-all duration-300 overflow-hidden flex flex-col h-full min-h-[220px]",
                                selectedTemplate === null
                                  ? "border-[#2563eb] bg-[#2563eb]/5 shadow-[0_0_30px_rgba(37,99,235,0.2)]"
                                  : "border-white/[0.05] bg-white/[0.03] hover:border-white/[0.15] hover:bg-white/[0.05]"
                              )}
                            >
                              <div className="flex-1 flex items-center justify-center bg-white/[0.02] border-b border-white/[0.05] relative">
                                <div className="w-12 h-12 rounded-full border-2 border-dashed border-[#4a5a82] flex items-center justify-center text-[#4a5a82] group-hover:scale-110 group-hover:text-[#2563eb] group-hover:border-[#2563eb]/40 transition-all duration-500 shadow-inner">
                                  <Plus size={24} />
                                </div>
                                {selectedTemplate === null && (
                                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#2563eb] border-[4px] border-[#080f28] flex items-center justify-center shadow-lg">
                                    <Check className="w-3 h-3 text-white" strokeWidth={4} />
                                  </div>
                                )}
                              </div>
                              <div className="p-4 bg-[#0c1535]/50">
                                <span className="font-bold text-[12px] block uppercase tracking-wider text-[#eef2ff]">Blank Slate</span>
                                <span className="text-[10px] font-medium text-[#4a5a82] line-clamp-1 mt-1">Start with a zero pre-set clean canvas</span>
                              </div>
                            </div>
                          )}

                          {/* Professional Blueprints */}
                          {filteredTemplates.map((t) => (
                            <div
                              key={t.id}
                              onClick={() => setSelectedTemplate(t.id)}
                              className={cn(
                                "group relative cursor-pointer rounded-[14px] border-2 transition-all duration-300 overflow-hidden flex flex-col h-full min-h-[220px]",
                                selectedTemplate === t.id
                                  ? "border-[#2563eb] bg-[#2563eb]/5 shadow-[0_0_30px_rgba(37,99,235,0.2)]"
                                  : "border-white/[0.05] bg-white/[0.03] hover:border-white/[0.15] hover:bg-white/[0.05]"
                              )}
                            >
                              <div className="flex-1 bg-[#04091a] relative overflow-hidden">
                                {(t.thumbnail || t.preview_image) && (
                                  <img
                                    src={t.thumbnail || t.preview_image}
                                    alt={t.name}
                                    className={cn(
                                      "absolute inset-0 w-full h-full object-cover transition-all duration-1000",
                                      selectedTemplate === t.id ? "scale-110 opacity-90 blur-[1px]" : "opacity-40 group-hover:opacity-70 group-hover:scale-110"
                                    )}
                                  />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-[#04091a] via-[#04091a]/20 to-transparent opacity-80" />

                                {selectedTemplate === t.id && (
                                  <div className="absolute inset-0 flex items-center justify-center z-20">
                                    <div className="w-10 h-10 rounded-full bg-[#2563eb] flex items-center justify-center shadow-2xl scale-125 transition-all">
                                      <Check className="w-5 h-5 text-white" strokeWidth={4} />
                                    </div>
                                  </div>
                                )}

                                <div className="absolute top-3 left-3 flex gap-2">
                                  <div className="px-2.5 py-0.5 rounded-full bg-[#2563eb]/20 backdrop-blur-md border border-[#2563eb]/30 text-[8px] font-black uppercase tracking-widest text-[#3b82f6]">
                                    {t.category}
                                  </div>
                                  {t.is_premium && (
                                    <div className="px-2.5 py-0.5 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-500/30 text-[8px] font-black uppercase tracking-widest text-amber-500">
                                      Premium
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="p-4 bg-[#0c1535]/50 backdrop-blur-md">
                                <span className={cn(
                                  "font-bold text-[12px] block uppercase tracking-wider transition-colors leading-tight",
                                  selectedTemplate === t.id ? "text-[#3b82f6]" : "text-[#eef2ff] group-hover:text-[#3b82f6]"
                                )}>{t.name}</span>
                                <span className="text-[10px] font-medium text-[#4a5a82] line-clamp-1 mt-1">{t.description}</span>
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

            <div className="px-6 py-5 border-t border-white/[0.07] bg-[#0c1535]/40 flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                className="text-[11px] font-bold uppercase tracking-widest text-[#4a5a82] hover:text-[#eef2ff] hover:bg-white/5 h-10 px-6 rounded-[8px]"
              >
                Abort
              </Button>
              <Button
                onClick={handleCreate}
                disabled={creating || !newSiteName}
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-[8px] font-bold uppercase text-[11px] h-10 px-8 shadow-lg shadow-[#2563eb]/30 transition-all active:scale-[0.98]"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-3.5 h-3.5 mr-2" />}
                Initialize Deployment
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Rename Node Modal */}
        <Dialog open={!!renameSite} onOpenChange={(open) => !open && setRenameSite(null)}>
          <DialogContent className="sm:max-w-[420px] bg-[#080f28] border-white/[0.07] text-[#eef2ff] rounded-[16px] shadow-2xl p-0 overflow-hidden z-[9999]">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="text-[18px] font-bold font-display uppercase tracking-tight">Rename <span className="text-[#3b82f6]">Node</span></DialogTitle>
              <DialogDescription className="text-[11px] font-medium uppercase tracking-[0.8px] text-[#4a5a82] mt-0.5">
                Update the website identification string
              </DialogDescription>
            </DialogHeader>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rename-name" className="text-[10px] font-bold uppercase tracking-wider text-[#4a5a82]">New Designation</Label>
                <Input
                  id="rename-name"
                  value={renameSite?.name || ''}
                  onChange={(e) => setRenameSite({ ...renameSite, name: e.target.value })}
                  className="h-12 bg-white/5 border-white/10 text-[#eef2ff] rounded-[8px] px-4 font-medium focus:border-[#2563eb]/50 outline-none"
                  autoFocus
                />
              </div>
            </div>
            <div className="p-6 bg-white/[0.02] border-t border-white/[0.07] flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setRenameSite(null)} className="text-[11px] font-bold uppercase tracking-widest text-[#4a5a82] hover:text-[#eef2ff] h-10">
                Cancel
              </Button>
              <Button onClick={handleRename} disabled={isRenaming} className="bg-[#2563eb] hover:bg-[#1d4ed8] h-10 px-6 rounded-[8px] font-bold uppercase text-[11px]">
                {isRenaming ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                Apply Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={!!deleteSite} onOpenChange={(open) => !open && setDeleteSite(null)}>
          <DialogContent className="sm:max-w-[440px] bg-[#080f28] border-white/[0.07] text-[#eef2ff] rounded-[16px] shadow-2xl p-0 overflow-hidden z-[9999]">
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-[#ef4444]/10 text-[#ef4444] flex items-center justify-center mx-auto mb-6 border border-[#ef4444]/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                <Trash2 size={28} />
              </div>
              <DialogTitle className="text-[20px] font-bold font-display uppercase tracking-tight text-[#ef4444]">
                Purge <span className="text-[#eef2ff]">Node</span>
              </DialogTitle>
              <DialogDescription className="text-[13px] text-[#4a5a82] mt-4 leading-relaxed font-medium">
                Are you sure you want to delete <span className="text-[#eef2ff] font-bold underline decoration-[#ef4444]/40 underline-offset-4">"{deleteSite?.name}"</span>?
                This action is destructive and will remove all associated infrastructure.
              </DialogDescription>
            </div>
            <div className="p-8 bg-[#ef4444]/[0.02] border-t border-white/[0.07] flex flex-col-reverse sm:flex-row gap-3">
              <Button variant="ghost" onClick={() => setDeleteSite(null)} className="text-[11px] font-bold uppercase tracking-widest text-[#4a5a82] hover:text-[#eef2ff] h-12 flex-1 rounded-[10px]">
                Retain Property
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete} className="bg-[#ef4444] hover:bg-[#b91c1c] text-white h-12 flex-1 rounded-[10px] font-bold uppercase text-[11px] shadow-lg shadow-[#ef4444]/20 transition-all active:scale-[0.98]">
                Purge Permanently
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        {/* Bulk Delete Confirmation Modal */}
        <Dialog open={isBulkDeleteModalOpen} onOpenChange={setIsBulkDeleteModalOpen}>
          <DialogContent className="sm:max-w-[440px] bg-[#080f28] border-white/[0.07] text-[#eef2ff] rounded-[16px] shadow-2xl p-0 overflow-hidden z-[9999]">
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-[#ef4444]/10 text-[#ef4444] flex items-center justify-center mx-auto mb-6 border border-[#ef4444]/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                <Trash2 size={28} />
              </div>
              <DialogTitle className="text-[20px] font-bold font-display uppercase tracking-tight text-[#ef4444]">
                Bulk <span className="text-[#eef2ff]">Purge</span>
              </DialogTitle>
              <DialogDescription className="text-[13px] text-[#4a5a82] mt-4 leading-relaxed font-medium">
                You are about to permanently delete <span className="text-[#eef2ff] font-bold">{selectedIds.size} selected nodes</span>.
                This action is irreversible and will remove all associated pages, assets, and configurations.
              </DialogDescription>
            </div>
            <div className="p-8 bg-[#ef4444]/[0.02] border-t border-white/[0.07] flex flex-col-reverse sm:flex-row gap-3">
              <Button
                variant="ghost"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="text-[11px] font-bold uppercase tracking-widest text-[#4a5a82] hover:text-[#eef2ff] h-12 flex-1 rounded-[10px]"
              >
                Abort Action
              </Button>
              <Button
                variant="destructive"
                onClick={confirmBulkDelete}
                disabled={isBulkDeleting}
                className="bg-[#ef4444] hover:bg-[#b91c1c] text-white h-12 flex-1 rounded-[10px] font-bold uppercase text-[11px] shadow-lg shadow-[#ef4444]/20 transition-all active:scale-[0.98]"
              >
                {isBulkDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 size={16} className="mr-2" />}
                Purge All Selected
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </Wrapper>
    </MetaData>
  );
}
