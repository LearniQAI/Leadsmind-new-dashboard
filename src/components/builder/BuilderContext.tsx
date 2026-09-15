'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface BuilderContextType {
  websiteData: any;
  onUpdateWebsite: (data: any) => void;
  viewMode: 'desktop' | 'tablet' | 'mobile';
  setViewMode: (mode: 'desktop' | 'tablet' | 'mobile') => void;
  leftPanelOpen: boolean;
  setLeftPanelOpen: (open: boolean) => void;
  // Which of Sidebar's rail tabs is active (elements/layers/settings/page/steps).
  // Lifted out of Sidebar so other parts of the chrome (e.g. RenderNode's "Add
  // element" action) can jump straight to a specific tab, and so the tab survives
  // BuilderLeftPanel swapping Sidebar out for ElementProperties and back.
  leftPanelTab: string;
  setLeftPanelTab: (tab: string) => void;
  pages: any[];
  websiteId?: string;
  funnelId?: string;
  previewMode: boolean;
  setPreviewMode: (preview: boolean) => void;
  builderSettings: any;
  setBuilderSettings: (settings: any) => void;
  blueprintNodeId: string | null;
  setBlueprintNodeId: (id: string | null) => void;
  isTemplateDirectoryOpen: boolean;
  setIsTemplateDirectoryOpen: (open: boolean) => void;
  isImportModalOpen: boolean;
  setIsImportModalOpen: (open: boolean) => void;
}

const BuilderContext = createContext<BuilderContextType | undefined>(undefined);

interface BuilderProviderProps {
  children: React.ReactNode;
  pages: any[];
  websiteId?: string;
  funnelId?: string;
  websiteData: any;
  onUpdateWebsite: (updates: any) => void;
  /** Live/published rendering has no Desktop/Tablet/Mobile toggle UI — `viewMode` (and every
   *  `useResponsiveValue`-driven `_mobile`/`_tablet` prop) would otherwise sit stuck at its
   *  'desktop' initial value forever, since nothing ever calls `setViewMode` there. Set this
   *  on the published-site provider (PublishedPageRenderer) to track real viewport width via
   *  matchMedia instead, at the same breakpoints Tailwind's own md:/lg: classes use elsewhere
   *  in these same templates, so responsive props actually take effect for real visitors.
   *  The in-editor provider leaves this off — viewMode there is the deliberate manual toggle. */
  autoDetectViewport?: boolean;
}

export function BuilderProvider({
  children,
  pages,
  websiteId,
  funnelId,
  websiteData: initialWebsiteData,
  onUpdateWebsite: externalUpdate,
  autoDetectViewport = false,
}: BuilderProviderProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  useEffect(() => {
    if (!autoDetectViewport || typeof window === 'undefined') return;
    const mobileQuery = window.matchMedia('(max-width: 767px)');
    const tabletQuery = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');
    const resolve = () => setViewMode(mobileQuery.matches ? 'mobile' : tabletQuery.matches ? 'tablet' : 'desktop');
    resolve();
    mobileQuery.addEventListener('change', resolve);
    tabletQuery.addEventListener('change', resolve);
    return () => {
      mobileQuery.removeEventListener('change', resolve);
      tabletQuery.removeEventListener('change', resolve);
    };
  }, [autoDetectViewport]);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [leftPanelTab, setLeftPanelTab] = useState('elements');
  const [previewMode, setPreviewMode] = useState(false);
  const [builderSettings, setBuilderSettings] = useState<any>({});
  const [blueprintNodeId, setBlueprintNodeId] = useState<string | null>(null);
  const [isTemplateDirectoryOpen, setIsTemplateDirectoryOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const { getWorkspaceBuilderSettings } = await import('@/app/actions/builder');
        const res = await getWorkspaceBuilderSettings();
        if (res.success && res.settings) {
          setBuilderSettings(res.settings);
        }
      } catch (err) {
        console.error('Failed to load builder settings:', err);
      }
    }
    loadSettings();
  }, []);

  return (
    <BuilderContext.Provider 
      value={{ 
        websiteData: initialWebsiteData, 
        onUpdateWebsite: externalUpdate, 
        viewMode, 
        setViewMode,
        leftPanelOpen,
        setLeftPanelOpen,
        leftPanelTab,
        setLeftPanelTab,
        pages,
        websiteId,
        funnelId,
        previewMode,
        setPreviewMode,
        builderSettings,
        setBuilderSettings,
        blueprintNodeId,
        setBlueprintNodeId,
        isTemplateDirectoryOpen,
        setIsTemplateDirectoryOpen,
        isImportModalOpen,
        setIsImportModalOpen
      }}
    >
      {children}
    </BuilderContext.Provider>
  );
}

export function useBuilder() {
  const context = useContext(BuilderContext);
  if (context === undefined) {
    return {
      websiteData: null,
      onUpdateWebsite: () => {},
      viewMode: 'desktop' as const,
      setViewMode: () => {},
      leftPanelOpen: true,
      setLeftPanelOpen: () => {},
      leftPanelTab: 'elements',
      setLeftPanelTab: () => {},
      pages: [],
      websiteId: undefined,
      funnelId: undefined,
      previewMode: false,
      setPreviewMode: () => {},
      builderSettings: {},
      setBuilderSettings: () => {},
      blueprintNodeId: null,
      setBlueprintNodeId: () => {},
      isTemplateDirectoryOpen: false,
      setIsTemplateDirectoryOpen: () => {},
      isImportModalOpen: false,
      setIsImportModalOpen: () => {},
    };
  }
  return context;
}

