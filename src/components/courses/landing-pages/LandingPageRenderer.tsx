'use client';

import React, { useState, useEffect } from 'react';
import TemplateCleanMinimal from './TemplateCleanMinimal';
import TemplateBoldFeatureRich from './TemplateBoldFeatureRich';
import TemplateCommunityCoaching from './TemplateCommunityCoaching';

interface LandingPageRendererProps {
  course: any;
  modules: any[];
  lessons: any[];
  previewMode?: boolean;
}

export default function LandingPageRenderer({ course, modules, lessons, previewMode = false }: LandingPageRendererProps) {
  const [previewData, setPreviewData] = useState<any>(null);

  useEffect(() => {
    // Listen for postMessage updates from parent window (the Admin Live Preview panel)
    const handleMessage = (event: MessageEvent) => {
      // Allow any origin for maximum development flexibility, but verify data shape
      if (event.data?.type === 'lms-preview-update') {
        setPreviewData(event.data.data);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Notify parent frame that preview window is initialized and ready to receive updates
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'lms-preview-ready' }, '*');
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Determine active template layout
  let activeTemplate = 'clean_minimal'; // Global default layout
  if (previewMode || course?.use_custom_landing_page) {
    activeTemplate = previewData?.template || course?.landing_page_settings?.template || 'clean_minimal';
  }

  // Render the selected template
  switch (activeTemplate) {
    case 'bold_feature_rich':
      return (
        <TemplateBoldFeatureRich
          course={course}
          modules={modules}
          lessons={lessons}
          previewData={previewData}
        />
      );
    case 'community_coaching':
      return (
        <TemplateCommunityCoaching
          course={course}
          modules={modules}
          lessons={lessons}
          previewData={previewData}
        />
      );
    case 'clean_minimal':
    default:
      return (
        <TemplateCleanMinimal
          course={course}
          modules={modules}
          lessons={lessons}
          previewData={previewData}
        />
      );
  }
}
