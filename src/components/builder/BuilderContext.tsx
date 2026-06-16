'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface BuilderContextType {
  websiteData: any;
  onUpdateWebsite: (data: any) => void;
  viewMode: 'desktop' | 'tablet' | 'mobile';
  setViewMode: (mode: 'desktop' | 'tablet' | 'mobile') => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  propertiesOpen: boolean;
  setPropertiesOpen: (open: boolean) => void;
  pages: any[];
  websiteId?: string;
  funnelId?: string;
  previewMode: boolean;
  setPreviewMode: (preview: boolean) => void;
  builderSettings: any;
  setBuilderSettings: (settings: any) => void;
  blueprintNodeId: string | null;
  setBlueprintNodeId: (id: string | null) => void;
}

const BuilderContext = createContext<BuilderContextType | undefined>(undefined);

interface BuilderProviderProps {
  children: React.ReactNode;
  pages: any[];
  websiteId?: string;
  funnelId?: string;
  websiteData: any;
  onUpdateWebsite: (updates: any) => void;
}

export function BuilderProvider({ 
  children, 
  pages, 
  websiteId, 
  funnelId,
  websiteData: initialWebsiteData, 
  onUpdateWebsite: externalUpdate 
}: BuilderProviderProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [propertiesOpen, setPropertiesOpen] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);
  const [builderSettings, setBuilderSettings] = useState<any>({});
  const [blueprintNodeId, setBlueprintNodeId] = useState<string | null>(null);

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
        sidebarOpen,
        setSidebarOpen,
        propertiesOpen,
        setPropertiesOpen,
        pages,
        websiteId,
        funnelId,
        previewMode,
        setPreviewMode,
        builderSettings,
        setBuilderSettings,
        blueprintNodeId,
        setBlueprintNodeId
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
      sidebarOpen: true,
      setSidebarOpen: () => {},
      propertiesOpen: true,
      setPropertiesOpen: () => {},
      pages: [],
      websiteId: undefined,
      funnelId: undefined,
      previewMode: false,
      setPreviewMode: () => {},
      builderSettings: {},
      setBuilderSettings: () => {},
      blueprintNodeId: null,
      setBlueprintNodeId: () => {},
    };
  }
  return context;
}

