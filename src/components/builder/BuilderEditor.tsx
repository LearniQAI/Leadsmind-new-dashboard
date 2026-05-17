"use client";

import React from 'react';
import { Editor, Frame, Element, useEditor } from '@craftjs/core';
import { Sidebar } from './Sidebar';
import { Viewport } from './Viewport';
import { PropertiesPanel } from './PropertiesPanel';
import { RenderNode } from './RenderNode';
import { Container } from './user/Container';
import { Section } from './user/Section';
import { Columns } from './user/Columns';
import { Spacer } from './user/Spacer';
import { Divider } from './user/Divider';
import { Heading } from './user/Heading';
import { Paragraph } from './user/Paragraph';
import { Image as ImageComponent } from './user/Image';
import { Video } from './user/Video';
import { Icon } from './user/Icon';
import { Text } from './user/Text';
import { Form } from './user/Form';
import { Countdown } from './user/Countdown';
import { PricingTable } from './user/PricingTable';
import { FAQ } from './user/FAQ';
import { UserButton } from './user/Button';
import { ProgressBar } from './user/ProgressBar';
import { UserTestimonial } from './user/Testimonial';
import { StarRating } from './user/StarRating';
import { LogoStrip } from './user/LogoStrip';
import { Hero } from './user/Hero';
import { Navbar } from './user/Navbar';
import { Footer } from './user/Footer';
import { BlogFeed } from './user/BlogFeed';
import { BuilderProvider, useBuilder } from './BuilderContext';
import { publishPage, updatePageContent, updateWebsiteSettings } from '@/app/actions/builder';
import { createClient } from '@/lib/supabase/client';

import { toast } from 'sonner';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Send, AlertCircle, Copy as CopyIcon } from 'lucide-react';
import { RESOLVER, wrapForReact19 } from '@/lib/builder/resolver';
import { cn } from '@/lib/utils';
import { LayoutTemplate, Settings2 } from 'lucide-react';

class SafeFrameErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(error: any) {
        if (error?.message?.includes("children") || error?.message?.includes("undefined")) {
            // Silently catch the common CraftJS crawl errors
        }
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-white/20 bg-white/[0.02] rounded-3xl border border-white/5 m-8">
                    <AlertCircle className="w-8 h-8 mb-4 opacity-50" />
                    <p className="text-sm font-bold tracking-tight">The canvas encountered a temporary glitch.</p>
                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-6 border-white/10 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest"
                        onClick={() => window.location.reload()}
                    >
                        Reset Canvas
                    </Button>
                </div>
            );
        }
        return this.props.children;
    }
}

const BuilderEditorContent = ({ type }: { type: 'website' | 'funnel' }) => {
    const { pageId } = useParams();
    const router = useRouter();

    const [isPublishing, setIsPublishing] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const { query, actions } = useEditor();

    const handleSaveDraft = async () => {
        if (!pageId) return;
        setIsSaving(true);
        const content = query.serialize();

        try {
            // Use client-side supabase directly to bypass Server Action payload limits (1MB)
            const supabase = createClient();
            const { error } = await supabase
                .from('pages')
                .update({
                    content,
                    updated_at: new Date().toISOString()
                })
                .eq('id', pageId);

            if (error) throw error;
            toast.success('Draft saved successfully');
        } catch (err: any) {
            console.error('Save error:', err);
            // Fallback to server action if client save fails (e.g. RLS issues)
            const result = await updatePageContent(pageId as string, content);
            if (result.success) {
                toast.success('Draft saved (Server Fallback)');
            } else {
                toast.error('Failed to save draft: ' + (result.error || err.message));
            }
        } finally {
            setIsSaving(false);
        }
    };

    // Auto-save logic
    React.useEffect(() => {
        if (!pageId) return;

        const interval = setInterval(() => {
            handleSaveDraft();
        }, 60000);

        return () => clearInterval(interval);
    }, [pageId]);

    const handleExportJSON = () => {
        const content = query.serialize();
        navigator.clipboard.writeText(content);
        toast.success('Template JSON copied to clipboard!');
    };

    const handlePublish = async () => {
        if (!pageId) return;
        setIsPublishing(true);
        const content = query.serialize();

        try {
            // 1. Save content client-side first
            const supabase = createClient();
            const { error: saveError } = await supabase
                .from('pages')
                .update({ content })
                .eq('id', pageId);

            if (saveError) throw saveError;

            // 2. Trigger publishing logic on server (no need to send large content again)
            const result = await publishPage(pageId as string);

            if (result.success) {
                toast.success('Page published live!');
            } else {
                toast.error('Failed to publish');
            }
        } catch (err: any) {
            console.error('Publish error:', err);
            // Fallback
            const result = await publishPage(pageId as string, content);
            if (result.success) {
                toast.success('Page published (Server Fallback)');
            } else {
                toast.error('Failed to publish: ' + (result.error || err.message));
            }
        } finally {
            setIsPublishing(false);
        }
    };


    const handleUpdateWebsite = (updates: any) => {
        if (!websiteData?.id) return;
        setWebsiteData((prev: any) => ({ ...prev, ...updates }));
        if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
        updateTimerRef.current = setTimeout(async () => {
            try {
                const result = await updateWebsiteSettings(websiteData.id, type, updates);
                if (!result.success) toast.error('Failed to update site settings');
            } catch (err) {
                console.error('Settings update error:', err);
            }
        }, 500);
    };

    const lastLoadedPageId = React.useRef<string | null>(null);
    const [websiteData, setWebsiteData] = React.useState<any>(null);
    const [pages, setPages] = React.useState<any[]>([]);
    const [isLoadingContent, setIsLoadingContent] = React.useState(true);
    const [initialContent, setInitialContent] = React.useState<string | null>(null);
    const updateTimerRef = React.useRef<NodeJS.Timeout | null>(null);

    const BLANK_CANVAS = '{"ROOT":{"type":{"resolvedName":"Container"},"isCanvas":true,"props":{"className":"min-h-screen bg-white"},"nodes":[]}}';

    // Optimized Deserialization Hook
    const hasDeserialized = React.useRef<string | null>(null);
    
    React.useEffect(() => {
        if (!actions || !initialContent) return;
        
        // Prevent redundant deserialization if content hasn't changed
        if (hasDeserialized.current === initialContent) return;

        const performDeserialization = () => {
            const resolver = query.getOptions().resolver;
            if (!resolver || Object.keys(resolver).length === 0) {
                setTimeout(performDeserialization, 100);
                return;
            }

            try {
                const dataToLoad = typeof initialContent === 'string' ? JSON.parse(initialContent) : initialContent;
                
                // Sanitize Payload
                const nodeIds = new Set(Object.keys(dataToLoad));
                Object.keys(dataToLoad).forEach(id => {
                    const node = dataToLoad[id];
                    if (!node.type) node.type = { resolvedName: "Container" };
                    if (!node.props) node.props = {};
                    if (!node.nodes) node.nodes = [];
                    if (node.nodes) {
                        node.nodes = node.nodes.filter((childId: string) => nodeIds.has(childId));
                    }
                });

                if (!dataToLoad["ROOT"]) {
                    dataToLoad["ROOT"] = JSON.parse(BLANK_CANVAS)["ROOT"];
                }

                actions.clearEvents();
                actions.deserialize(JSON.stringify(dataToLoad));
                hasDeserialized.current = initialContent;
                setIsLoadingContent(false);
                
                console.log("[Builder] Content deserialized and stable.");
            } catch (err) {
                console.error("[Builder] Deserialization failed:", err);
                actions.deserialize(BLANK_CANVAS);
                setIsLoadingContent(false);
            }
        };

        performDeserialization();
    }, [initialContent, actions, query]);

    React.useEffect(() => {
        const sanitizeCraftJson = (json: string) => {
            try {
                const data = JSON.parse(json);
                const nodeIds = new Set(Object.keys(data));

                Object.keys(data).forEach(id => {
                    const node = data[id];
                    if (node.nodes) {
                        node.nodes = node.nodes.filter((childId: string) => nodeIds.has(childId));
                    }
                    if (node.linkedNodes) {
                        Object.keys(node.linkedNodes).forEach(key => {
                            if (!nodeIds.has(node.linkedNodes[key])) {
                                delete node.linkedNodes[key];
                            }
                        });
                    }
                });
                return JSON.stringify(data);
            } catch (e) {
                return json;
            }
        };

        async function loadContent() {
            if (!pageId || lastLoadedPageId.current === pageId) return;
            setIsLoadingContent(true);
            const { createClient } = await import('@/lib/supabase/client');
            const supabase = createClient();

            // Fetch Page Content with website/funnel details
            const { data, error: pageError } = await supabase
                .from('pages')
                .select(`
     content, 
     workspace:workspaces(slug), 
     website_page:website_pages(
      id,
      name,
      path_name,
      website:websites(*)
     ),
     funnel_step:funnel_steps(
      id,
      name,
      path,
      funnel:funnels(*)
     )
    `)
                .eq('id', pageId)
                .single();

            if (pageError || !data) {
                console.error('Builder load error:', pageError);
                toast.error('Failed to load page content');
                return;
            }

            // Handle Resource Data (Website or Funnel)
            const rawWebsitePage = (data as any)?.website_page;
            const website = Array.isArray(rawWebsitePage) ? rawWebsitePage[0]?.website : rawWebsitePage?.website;

            const rawFunnelStep = (data as any)?.funnel_step;
            const funnel = Array.isArray(rawFunnelStep) ? rawFunnelStep[0]?.funnel : rawFunnelStep?.funnel;

            const finalResource = Array.isArray(website) ? website[0] : (website || (Array.isArray(funnel) ? funnel[0] : funnel));

            if (finalResource) {
                // Attach workspace info for URL resolution
                const workspace = (data as any)?.workspace;
                const resourceWithWorkspace = { ...finalResource, workspaceSlug: workspace?.slug };
                setWebsiteData(resourceWithWorkspace);

                // Fetch sibling steps/pages
                if (type === 'website') {
                    const { data: siblingPages } = await supabase
                        .from('website_pages')
                        .select(`id, name, path_name, pages (id)`)
                        .eq('website_id', finalResource.id);

                    if (siblingPages) {
                        setPages(siblingPages.map(p => ({
                            id: (p.pages as any)?.[0]?.id || p.id,
                            name: p.name,
                            slug: p.path_name.replace('/', '') || 'home'
                        })));
                    }
                } else {
                    const { data: siblingSteps } = await supabase
                        .from('funnel_steps')
                        .select(`id, name, path, pages (id)`)
                        .eq('funnel_id', finalResource.id)
                        .order('position', { ascending: true });

                    if (siblingSteps) {
                        setPages(siblingSteps.map(s => ({
                            id: (s.pages as any)?.[0]?.id || s.id,
                            stepId: s.id,
                            name: s.name,
                            slug: s.path.replace('/', '') || 'step'
                        })));
                    }
                }
            }

            // Task 4: Empty Canvas Fallback
            const content = data?.content ? sanitizeCraftJson(data.content) : BLANK_CANVAS;
            setInitialContent(content);
            lastLoadedPageId.current = pageId as string;
        }
        loadContent();
    }, [pageId]);

    // Silence internal CraftJS errors
    React.useEffect(() => {
        console.log("DEBUG: Editor mode:", type, "PageID:", pageId);
        console.log("DEBUG: Resolver active:", Object.keys(RESOLVER));

        const handler = (e: ErrorEvent) => {
            if (e.message.includes("children") || e.message.includes("t is undefined")) {
                e.preventDefault();
            }
        };
        return () => window.removeEventListener('error', handler);
    }, [pageId, type]);

    const websiteConfig = websiteData?.config || {};
    const hasNav = websiteConfig.navLinks && websiteConfig.navLinks.length > 0;
    const hasFooter = websiteConfig.footerLinks && websiteConfig.footerLinks.length > 0;
    const navStyle = websiteConfig.navStyle || { bg: '#ffffff', text: '#374151', border: true, size: 'h-16' };
    const footerStyle = websiteConfig.footerStyle || { bg: '#f8fafc', text: '#9ca3af', border: true, layout: 'between' };

    return (
        <BuilderProvider pages={pages} websiteId={websiteData?.id} websiteData={websiteData} onUpdateWebsite={handleUpdateWebsite}>
            <BuilderEditorLayout 
                type={type}
                websiteData={websiteData}
                handleUpdateWebsite={handleUpdateWebsite}
                hasNav={hasNav}
                hasFooter={hasFooter}
                navStyle={navStyle}
                footerStyle={footerStyle}
                websiteConfig={websiteConfig}
                isLoadingContent={isLoadingContent}
                handleExportJSON={handleExportJSON}
                handleSaveDraft={handleSaveDraft}
                handlePublish={handlePublish}
                isSaving={isSaving}
                isPublishing={isPublishing}
                pages={pages}
            />
        </BuilderProvider>
    );
};

const BuilderEditorLayout = ({ 
    type, 
    websiteData, 
    handleUpdateWebsite,
    hasNav,
    hasFooter,
    navStyle,
    footerStyle,
    websiteConfig,
    isLoadingContent,
    handleExportJSON,
    handleSaveDraft,
    handlePublish,
    isSaving,
    isPublishing,
    pages
}: any) => {
    const {
        sidebarOpen,
        setSidebarOpen,
        propertiesOpen,
        setPropertiesOpen
    } = useBuilder();

    const router = useRouter();
    const { pageId } = useParams();

    return (
            <div className="h-screen w-full flex flex-col overflow-hidden bg-[#050508] text-white">
                {/* Header Section */}
                <header className="h-[70px] border-b border-white/5 bg-[#0b0b14]/80 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-50">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3 pr-6 border-r border-white/5">
                            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                                <span className="font-black text-lg tracking-tighter">L</span>
                            </div>
                            <div>
                                <span className="block text-[11px] font-black uppercase tracking-tighter text-white leading-none">Leadsmind</span>
                                <span className="block text-[8px] font-bold uppercase tracking-[0.2em] text-primary mt-0.5">Neural Node Builder</span>
                            </div>
                        </div>

                        {/* Sidebar Toggles */}
                        <div className="flex items-center gap-2 px-4 border-r border-white/5">
                            <Button
                                variant="ghost"
                                size="icon"
                                title="Toggle Elements Sidebar"
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className={cn(
                                    "h-9 w-9 rounded-lg border border-white/5 transition-all",
                                    sidebarOpen ? "bg-white/10 text-white" : "text-white/30 hover:text-white"
                                )}
                            >
                                <LayoutTemplate className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                title="Toggle Properties Panel"
                                onClick={() => setPropertiesOpen(!propertiesOpen)}
                                className={cn(
                                    "h-9 w-9 rounded-lg border border-white/5 transition-all",
                                    propertiesOpen ? "bg-white/10 text-white" : "text-white/30 hover:text-white"
                                )}
                            >
                                <Settings2 className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Page Switcher */}
                        <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Editing Mode:</span>
                            </div>
                            <select
                                value={pageId as string}
                                onChange={(e) => router.push(`/editor/${type}/${websiteData?.id}/${e.target.value}`)}
                                className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-white outline-none cursor-pointer hover:text-primary transition-colors min-w-[120px]"
                            >
                                {pages.map((p) => (
                                    <option key={p.id} value={p.id} className="bg-[#0b0b14] text-white">{p.name} ({p.slug})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-4 border-r border-white/5 mr-2">
                            <div className="text-right hidden sm:block">
                                <span className="block text-[9px] font-black uppercase tracking-widest text-white/30 mb-0.5">Node Status</span>
                                <span className="block text-[10px] font-black uppercase text-emerald-500">System Online</span>
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            onClick={handleExportJSON}
                            className="h-11 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl border border-white/5 hover:bg-white/5 text-white/40 hover:text-white transition-all mr-2"
                            title="Export for Template System"
                        >
                            <CopyIcon className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={handleSaveDraft}
                            disabled={isSaving}
                            className="h-11 px-6 text-[10px] font-black uppercase tracking-widest rounded-xl border border-white/5 hover:bg-white/5 text-white/60 hover:text-white transition-all"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                            Save Node
                        </Button>
                        <Button
                            onClick={handlePublish}
                            disabled={isPublishing}
                            className="h-11 px-8 text-[10px] font-black uppercase tracking-widest rounded-xl bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/20 transition-all active:scale-95"
                        >
                            {isPublishing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                            Deploy Live
                        </Button>
                    </div>
                </header>

                <div className="flex flex-1 overflow-hidden relative">
                    {/* Left Sidebar Transition Wrapper */}
                    <div
                        className={cn(
                            "transition-all duration-300 ease-in-out border-r border-white/5 bg-[#0b0b14] overflow-hidden shrink-0",
                            sidebarOpen ? "w-[300px] opacity-100" : "w-0 opacity-0 border-none"
                        )}
                    >
                        <div className="w-[300px] h-full"> {/* Fixed width and height inner to prevent squishing and enable scrolling */}
                            <Sidebar
                                type={type}
                                website={websiteData}
                                onUpdateWebsite={handleUpdateWebsite}
                            />
                        </div>
                    </div>
                    <Viewport>
                        <div className="flex flex-col min-h-screen w-full font-sans bg-white pointer-events-none select-none">
                            {hasNav && (
                                <nav
                                    className={`w-full sticky top-0 z-50 transition-all ${navStyle.border ? 'border-b border-black/10' : ''} ${navStyle.glass ? 'backdrop-blur-md bg-opacity-70' : ''}`}
                                    style={{ backgroundColor: navStyle.glass ? undefined : navStyle.bg }}
                                >
                                    {navStyle.glass && (
                                        <div className="absolute inset-0 z-[-1] opacity-70" style={{ backgroundColor: navStyle.bg }} />
                                    )}
                                    <div className={`max-w-7xl mx-auto px-4 flex items-center justify-between ${navStyle.size}`}>
                                        <div className="font-black tracking-tighter text-xl" style={{ color: navStyle.text }}>
                                            {websiteData?.name || 'Leadsmind'}
                                        </div>
                                        <div className="flex items-center gap-8">
                                            <div className="flex items-center gap-6">
                                                {websiteConfig.navLinks.map((link: any, i: number) => (
                                                    <a
                                                        key={i}
                                                        href="#"
                                                        className="text-sm font-bold opacity-80"
                                                        style={{ color: navStyle.text }}
                                                    >
                                                        {link.label}
                                                    </a>
                                                ))}
                                            </div>
                                            {navStyle.ctaText && (
                                                <div
                                                    className="px-5 py-2 text-sm font-bold rounded-full"
                                                    style={{ backgroundColor: navStyle.ctaBg || '#000', color: navStyle.ctaColor || '#fff' }}
                                                >
                                                    {navStyle.ctaText}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </nav>
                            )}

                            <div className="flex-1 pointer-events-auto min-h-[500px]">
                                {isLoadingContent ? (
                                    <div className="w-full h-full flex items-center justify-center py-40">
                                        <Loader2 className="w-8 h-8 animate-spin text-[#6c47ff]" />
                                    </div>
                                ) : (
                                    <Frame />
                                )}
                            </div>

                            {hasFooter && (
                                <footer
                                    className={`w-full mt-auto py-16 ${footerStyle.border ? 'border-t border-black/10' : ''}`}
                                    style={{ backgroundColor: footerStyle.bg }}
                                >
                                    <div className={`max-w-7xl mx-auto px-4 flex flex-col gap-8 ${footerStyle.layout === 'center' ? 'items-center text-center' : 'md:flex-row items-start justify-between'}`}>
                                        <div className="flex flex-col gap-3 max-w-sm">
                                            <div className="font-black tracking-tighter text-2xl" style={{ color: footerStyle.text }}>
                                                {websiteData?.name || 'Leadsmind'}
                                            </div>
                                            {footerStyle.tagline && (
                                                <p className="text-sm opacity-80 leading-relaxed" style={{ color: footerStyle.text }}>
                                                    {footerStyle.tagline}
                                                </p>
                                            )}
                                            <div className="text-sm font-medium mt-2 opacity-60" style={{ color: footerStyle.text }}>
                                                © {new Date().getFullYear()} {websiteData?.name || 'Leadsmind'}. All rights reserved.
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6 flex-wrap">
                                            {websiteConfig.footerLinks.map((link: any, i: number) => (
                                                <a
                                                    key={i}
                                                    href="#"
                                                    className="text-sm font-bold opacity-80"
                                                    style={{ color: footerStyle.text }}
                                                >
                                                    {link.label}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                </footer>
                            )}
                        </div>
                    </Viewport>
                    {/* Right Properties Transition Wrapper */}
                    <div
                        className={cn(
                            "transition-all duration-300 ease-in-out border-l border-white/5 bg-[#0b0b14] overflow-hidden shrink-0",
                            propertiesOpen ? "w-[320px] opacity-100" : "w-0 opacity-0 border-none"
                        )}
                    >
                        <div className="w-[320px] h-full">
                            <PropertiesPanel />
                        </div>
                    </div>
                </div>
            </div>
    );
};

export const BuilderEditor = ({ type }: { type: 'website' | 'funnel' }) => {
    return (
        <Editor
            resolver={RESOLVER}
            enabled={true}
            onRender={({ render }) => <RenderNode render={render} />}
        >
            <BuilderEditorContent type={type} />
        </Editor>
    );
};


