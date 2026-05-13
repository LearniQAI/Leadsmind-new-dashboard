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
   {primaryColor && (
    <style dangerouslySetInnerHTML={{ __html: `
     :root {
      --primary-color: ${primaryColor};
     }
     .bg-primary, .btn-primary { background-color: ${primaryColor} !important; }
     .text-primary { color: ${primaryColor} !important; }
     .border-primary { border-color: ${primaryColor} !important; }
     .btn-primary-light { background-color: ${primaryColor}1A !important; color: ${primaryColor} !important; }
    `}} />
   )}
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
