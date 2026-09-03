'use client';

import React, { useState, useEffect } from 'react';
import TemplatePremium from './TemplatePremium';

interface ViewerState {
  enrolled: boolean;
  active: boolean;
}

interface LandingPageRendererProps {
  course: any;
  modules: any[];
  lessons: any[];
  previewMode?: boolean;
  /** Real signed-in viewer's enrolment state for this course; null = not enrolled / not signed in. */
  viewerState?: ViewerState | null;
}

// Single Premium Course Description Page pass: every course now renders the one
// theme-independent premium template below, regardless of the old per-course
// Clean/Bold/Cohort choice (courses.landing_page_settings.template / use_custom_landing_page
// are no longer read here). This is the PUBLIC marketing page only — the in-course player's
// own Signal/Ember/Grove theming (courseThemeTokens.ts) is untouched and lives entirely
// elsewhere.
//
// The 3 old template components (TemplateCleanMinimal, TemplateBoldFeatureRich,
// TemplateCommunityCoaching) are left in the repo, unused from this entry point, rather than
// deleted — see the build report for why.
export default function LandingPageRenderer({
  course,
  modules,
  lessons,
  previewMode = false,
  viewerState = null,
}: LandingPageRendererProps) {
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

  return (
    <TemplatePremium
      course={course}
      modules={modules}
      lessons={lessons}
      previewData={previewData}
      viewerState={previewMode ? null : viewerState}
    />
  );
}
