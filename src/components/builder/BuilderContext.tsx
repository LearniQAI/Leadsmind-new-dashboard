'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface BuilderContextType {
 websiteData: any;
 onUpdateWebsite: (data: any) => void;
 viewMode: 'desktop' | 'tablet' | 'mobile';
 setViewMode: (mode: 'desktop' | 'tablet' | 'mobile') => void;
 pages: any[];
 websiteId?: string;
 funnelId?: string;
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

 return (
  <BuilderContext.Provider 
   value={{ 
    websiteData: initialWebsiteData, 
    onUpdateWebsite: externalUpdate, 
    viewMode, 
    setViewMode,
    pages,
    websiteId,
    funnelId
   }}
  >
   {children}
  </BuilderContext.Provider>
 );
}

export function useBuilder() {
 const context = useContext(BuilderContext);
 if (context === undefined) {
  // Return a default object to avoid crashes in hooks that aren't used yet
  return {
   websiteData: null,
   onUpdateWebsite: () => {},
   viewMode: 'desktop' as const,
   setViewMode: () => {},
   pages: [],
   websiteId: undefined,
   funnelId: undefined,
  };
 }
 return context;
}
