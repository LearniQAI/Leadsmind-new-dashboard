"use client";

import React, { useEffect, useState } from 'react';
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
    Trash2,
    Settings2,
    Copy,
    Edit3,
    ArrowRight,
    Search,
    Zap
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

    // Rename & Delete State
    const [renameSite, setRenameSite] = useState<any>(null);
    const [deleteSite, setDeleteSite] = useState<any>(null);
    const [isRenaming, setIsRenaming] = useState(false);
    const [dbTemplates, setDbTemplates] = useState<any[]>([]);
    const [templateError, setTemplateError] = useState<string | null>(null);

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
        const result = await updateWebsiteSettings(renameSite.id, { name: renameSite.name });
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
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <MetaData pageTitle="Websites | Leadsmind">
            <Wrapper>
                <div className="app__slide-wrapper">
                    <div className="grid grid-cols-12 gap-x-5">
                        {/* Header Section */}
                        <div className="col-span-12 mb-[25px]">
                            <div className="card__wrapper style_two !mb-0">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="h-6 w-6 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                                                <Globe className="h-3 w-3 text-primary" />
                                            </div>
                                            <span className="text-[9px] font-black text-primary uppercase tracking-[0.4em]">Multi-Page Architecture</span>
                                        </div>
                                        <h2 className="text-4xl font-black tracking-tighter text-heading dark:text-heading-dark italic uppercase leading-none mb-2">
                                            Websites
                                        </h2>
                                        <p className="text-body dark:text-body-dark opacity-60 text-xs font-medium italic">
                                            Deploy and manage high-conversion online properties with neural design optimization.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="relative hidden lg:block">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-placeholder" />
                                            <Input 
                                                placeholder="SEARCH NODES..." 
                                                className="h-12 w-[240px] bg-bgBody dark:bg-bgBody-dark border-border dark:border-border-dark rounded-xl pl-11 text-[10px] font-bold uppercase tracking-widest focus:border-primary/50 transition-all"
                                            />
                                        </div>
                                        <Button 
                                            onClick={() => setIsModalOpen(true)} 
                                            className="bg-primary hover:bg-primary-dark text-white rounded-xl font-bold uppercase italic text-[10px] h-12 px-8 shadow-lg shadow-primary/20 group"
                                        >
                                            <Plus className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
                                            Deploy New Site
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Websites Grid */}
                        <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 xxl:grid-cols-3 gap-5">
                            {websites.map((site) => (
                                <div key={site.id} className="card__wrapper group hover:border-primary/30 transition-all duration-500">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-lg shadow-primary/5">
                                            <Globe size={20} />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className={cn(
                                                "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border-none",
                                                site.is_published 
                                                    ? "bg-emerald-500/10 text-emerald-500" 
                                                    : "bg-amber-500/10 text-amber-500"
                                            )}>
                                                {site.is_published ? 'Live Node' : 'Draft'}
                                            </Badge>
                                            
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-placeholder hover:text-primary transition-colors">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-56 bg-bgBody dark:bg-bgBody-dark border-border dark:border-border-dark p-2 rounded-xl shadow-2xl">
                                                    <DropdownMenuItem 
                                                        className="flex items-center gap-3 p-3 rounded-lg text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:bg-primary/10 hover:text-primary transition-all"
                                                        onClick={() => {
                                                            const pageId = site.website_pages?.[0]?.page_id;
                                                            router.push(`/editor/website/${site.id}/${pageId}`);
                                                        }}
                                                    >
                                                        <Edit3 size={14} /> Launch Builder
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem 
                                                        className="flex items-center gap-3 p-3 rounded-lg text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:bg-primary/10 hover:text-primary transition-all"
                                                        onClick={() => setRenameSite({ id: site.id, name: site.name })}
                                                    >
                                                        <Settings2 size={14} /> Rename Site
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem 
                                                        className="flex items-center gap-3 p-3 rounded-lg text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:bg-primary/10 hover:text-primary transition-all"
                                                        onClick={() => handleDuplicate(site.id)}
                                                    >
                                                        <Copy size={14} /> Clone Node
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator className="bg-border dark:bg-border-dark my-1" />
                                                    <DropdownMenuItem 
                                                        className="flex items-center gap-3 p-3 rounded-lg text-[10px] font-bold uppercase tracking-widest cursor-pointer text-rose-500 hover:bg-rose-500/10 transition-all"
                                                        onClick={() => setDeleteSite(site)}
                                                    >
                                                        <Trash2 size={14} /> Purge Website
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>

                                    <div className="mb-8">
                                        <h4 className="text-xl font-black text-heading dark:text-heading-dark uppercase italic tracking-tighter mb-1 group-hover:text-primary transition-colors">
                                            {site.name}
                                        </h4>
                                        <div className="flex items-center gap-2 text-placeholder dark:text-placeholder-dark text-[10px] font-bold tracking-widest">
                                            <span className="opacity-40 uppercase">Domain:</span>
                                            <span className="text-primary/70 italic lowercase">{site.subdomain}.leadsmind.ai</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-6 border-t border-border dark:border-border-dark">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-placeholder uppercase tracking-widest mb-1">Last Update</span>
                                            <span className="text-[10px] font-bold text-heading dark:text-heading-dark italic">
                                                {formatDistanceToNow(new Date(site.updated_at || site.created_at))} ago
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Link href={`/p/${site.workspace?.slug}/${site.subdomain}`} target="_blank">
                                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-bgBody dark:bg-bgBody-dark border border-border dark:border-border-dark hover:text-primary hover:border-primary/30 transition-all">
                                                    <ExternalLink className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                            <Link href={`/editor/website/${site.id}/${site.website_pages?.[0]?.pages?.[0]?.id}`}>
                                                <Button className="h-10 px-5 bg-bgBody dark:bg-bgBody-dark border border-border dark:border-border-dark text-heading dark:text-heading-dark rounded-xl font-black uppercase italic text-[9px] tracking-widest hover:bg-primary hover:text-white hover:border-primary transition-all flex items-center gap-2">
                                                    Edit <ArrowRight size={12} />
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Create Button Card */}
                            <div 
                                onClick={() => setIsModalOpen(true)}
                                className="card__wrapper border-2 border-dashed border-border dark:border-border-dark bg-transparent flex flex-col items-center justify-center gap-4 py-16 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group"
                            >
                                <div className="h-16 w-16 rounded-full bg-bgBody dark:bg-bgBody-dark border border-border dark:border-border-dark flex items-center justify-center text-placeholder group-hover:text-primary group-hover:scale-110 group-hover:border-primary/30 transition-all duration-500">
                                    <Plus size={32} />
                                </div>
                                <div className="text-center">
                                    <h5 className="text-[11px] font-black uppercase tracking-[0.3em] text-placeholder group-hover:text-primary transition-colors">Initialize Website</h5>
                                    <p className="text-[9px] font-bold text-placeholder opacity-40 italic mt-1">Deploy fresh neural node</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* MODALS */}
                
                {/* New Website Modal */}
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 bg-bgBody dark:bg-bgBody-dark border-border dark:border-border-dark text-heading dark:text-heading-dark overflow-hidden rounded-3xl z-[9999]">
                        <DialogHeader className="p-8 pb-4">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                                    <LayoutTemplate className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">Deploy Neural Node</DialogTitle>
                                    <DialogDescription className="text-body dark:text-body-dark text-[10px] font-bold uppercase tracking-widest opacity-60">
                                        Initialize from blank canvas or select specialized template.
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto p-8 pt-4 space-y-8">
                            <div className="space-y-3">
                                <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest opacity-60">Website Designation</Label>
                                <Input
                                    id="name"
                                    placeholder="Enter Site Name..."
                                    value={newSiteName}
                                    onChange={(e) => setNewSiteName(e.target.value)}
                                    className="h-14 bg-white/5 border-border dark:border-border-dark text-heading dark:text-heading-dark rounded-2xl px-6 font-bold uppercase tracking-widest placeholder:opacity-20"
                                />
                            </div>

                            <div className="space-y-6">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Starting Blueprint</Label>
                                
                                {templateError ? (
                                    <div className="p-12 rounded-3xl border-2 border-dashed border-rose-500/20 bg-rose-500/5 flex flex-col items-center justify-center gap-5 text-center">
                                        <div className="h-14 w-14 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
                                            <AlertCircle className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h4 className="font-black uppercase italic tracking-tight text-white">Interface Interrupted</h4>
                                            <p className="text-[10px] text-white/40 mt-1 uppercase tracking-widest">{templateError}</p>
                                        </div>
                                        <Button 
                                            variant="outline" 
                                            onClick={fetchTemplates}
                                            className="h-12 border-rose-500/20 hover:bg-rose-500/10 text-rose-500 font-black uppercase tracking-widest text-[10px] px-8 rounded-xl"
                                        >
                                            Restart Connection
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                                        <div
                                            onClick={() => setSelectedTemplate(null)}
                                            className={cn(
                                                "cursor-pointer rounded-2xl border-2 p-6 transition-all flex flex-col items-center justify-center gap-3 aspect-video group relative overflow-hidden",
                                                selectedTemplate === null 
                                                    ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(108,71,255,0.2)]" 
                                                    : "border-border dark:border-border-dark bg-white/5 hover:border-primary/40"
                                            )}
                                        >
                                            <div className="w-10 h-10 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                <Plus className="w-5 h-5" />
                                            </div>
                                            <span className="font-black text-[10px] uppercase tracking-widest">Blank Slate</span>
                                        </div>

                                        {dbTemplates.map((t) => (
                                            <div
                                                key={t.id}
                                                onClick={() => setSelectedTemplate(t.id)}
                                                className={cn(
                                                    "cursor-pointer rounded-2xl border-2 transition-all flex flex-col justify-end aspect-video group relative overflow-hidden",
                                                    selectedTemplate === t.id 
                                                        ? "border-primary shadow-[0_0_20px_rgba(108,71,255,0.2)]" 
                                                        : "border-border dark:border-border-dark hover:border-primary/40"
                                                )}
                                            >
                                                {(t.thumbnail || t.preview_image) && (
                                                    <img 
                                                        src={t.thumbnail || t.preview_image} 
                                                        alt={t.name}
                                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-40 group-hover:opacity-80"
                                                    />
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-bgBody via-transparent to-transparent z-10" />
                                                <div className="relative z-20 p-5">
                                                    <span className="font-black text-[10px] block uppercase tracking-widest mb-1 group-hover:text-primary transition-colors">{t.name}</span>
                                                    <span className="text-[9px] font-bold text-placeholder italic line-clamp-1 opacity-60">{t.description}</span>
                                                </div>
                                                {selectedTemplate === t.id && (
                                                    <div className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-primary border-4 border-bgBody flex items-center justify-center shadow-xl">
                                                        <Check className="w-3 h-3 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="p-8 border-t border-border dark:border-border-dark bg-primary/5">
                            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="text-[10px] font-black uppercase tracking-widest text-placeholder hover:text-white h-12">
                                Abort
                            </Button>
                            <Button
                                onClick={handleCreate}
                                disabled={creating || !newSiteName}
                                className="bg-primary hover:bg-primary-dark text-white rounded-xl font-black uppercase italic text-[11px] h-14 px-12 shadow-lg shadow-primary/30 transition-all active:scale-[0.98]"
                            >
                                {creating ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : <Zap className="w-5 h-5 mr-3" />}
                                Initialize Deployment
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Rename Modal */}
                <Dialog open={!!renameSite} onOpenChange={(open) => !open && setRenameSite(null)}>
                    <DialogContent className="sm:max-w-[425px] bg-bgBody dark:bg-bgBody-dark border-border dark:border-border-dark text-heading dark:text-heading-dark rounded-3xl z-[9999]">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black italic uppercase tracking-tighter">Rename Node</DialogTitle>
                            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                                Update the website designation.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-6">
                            <Label htmlFor="rename-name" className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2 block">New Designation</Label>
                            <Input
                                id="rename-name"
                                value={renameSite?.name || ''}
                                onChange={(e) => setRenameSite({ ...renameSite, name: e.target.value })}
                                className="h-14 bg-white/5 border-border dark:border-border-dark text-heading dark:text-heading-dark rounded-2xl px-6 font-bold uppercase tracking-widest"
                                autoFocus
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setRenameSite(null)} className="text-[10px] font-black uppercase tracking-widest h-12">
                                Cancel
                            </Button>
                            <Button onClick={handleRename} disabled={isRenaming} className="bg-primary hover:bg-primary-dark h-12 px-8 rounded-xl font-black uppercase italic text-[10px]">
                                {isRenaming ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                                Apply Changes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Modal */}
                <Dialog open={!!deleteSite} onOpenChange={(open) => !open && setDeleteSite(null)}>
                    <DialogContent className="sm:max-w-[425px] bg-bgBody dark:bg-bgBody-dark border-border dark:border-border-dark text-heading dark:text-heading-dark rounded-3xl z-[9999]">
                        <DialogHeader>
                            <DialogTitle className="text-rose-500 flex items-center gap-3 text-xl font-black italic uppercase tracking-tighter">
                                <AlertCircle className="w-6 h-6" />
                                Purge Node
                            </DialogTitle>
                            <DialogDescription className="text-body dark:text-body-dark pt-2 font-medium italic">
                                Are you sure you want to delete <span className="text-primary font-black uppercase italic">"{deleteSite?.name}"</span>?
                                This action is permanent and will remove all pages, settings, and analytics associated with this website.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="mt-8">
                            <Button variant="ghost" onClick={() => setDeleteSite(null)} className="text-[10px] font-black uppercase tracking-widest h-12">
                                Retain Node
                            </Button>
                            <Button variant="destructive" onClick={handleConfirmDelete} className="bg-rose-500 hover:bg-rose-600 h-12 px-8 rounded-xl font-black uppercase italic text-[10px]">
                                Delete Permanently
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </Wrapper>
        </MetaData>
    );
}
