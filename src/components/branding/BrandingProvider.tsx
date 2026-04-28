'use client';

import React, { createContext, useContext, useEffect } from 'react';

interface BrandingContextType {
  primaryColor?: string;
  platformName?: string;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({
  children,
  primaryColor,
  platformName,
}: {
  children: React.ReactNode;
  primaryColor?: string;
  platformName?: string;
}) {
  useEffect(() => {
    if (primaryColor) {
      document.documentElement.style.setProperty('--primary-color', primaryColor);
    }
  }, [primaryColor]);

  return (
    <BrandingContext.Provider value={{ primaryColor, platformName }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
}
