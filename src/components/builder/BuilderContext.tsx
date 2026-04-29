'use client';

import React, { createContext, useContext, useState } from 'react';

interface BuilderContextType {
  websiteData: any;
  onUpdateWebsite: (data: any) => void;
  viewMode: 'desktop' | 'tablet' | 'mobile';
  setViewMode: (mode: 'desktop' | 'tablet' | 'mobile') => void;
}

const BuilderContext = createContext<BuilderContextType | undefined>(undefined);

export function BuilderProvider({ children }: { children: React.ReactNode }) {
  const [websiteData, setWebsiteData] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const onUpdateWebsite = (data: any) => {
    setWebsiteData((prev: any) => ({ ...prev, ...data }));
  };

  return (
    <BuilderContext.Provider value={{ websiteData, onUpdateWebsite, viewMode, setViewMode }}>
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
    };
  }
  return context;
}
