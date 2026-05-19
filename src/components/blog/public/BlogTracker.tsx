'use client';

import { useEffect, useRef } from 'react';
import { recordPageview } from '@/app/actions/publicBlog';

interface BlogTrackerProps {
  postId: string;
  workspaceId: string;
}

export default function BlogTracker({ postId, workspaceId }: BlogTrackerProps) {
  const trackerRef = useRef({
    startTime: Date.now(),
    maxScrollDepth: 0,
    hasFired: false
  });

  useEffect(() => {
    // Generate or retrieve a persistent anonymous visitor ID
    let visitorId = localStorage.getItem('leadsmind_visitor_id');
    if (!visitorId) {
      visitorId = 'anon_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('leadsmind_visitor_id', visitorId);
    }

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.body.scrollHeight - window.innerHeight;
      const currentScrollDepth = docHeight > 0 ? Math.min(100, Math.round((scrollY / docHeight) * 100)) : 100;
      
      if (currentScrollDepth > trackerRef.current.maxScrollDepth) {
        trackerRef.current.maxScrollDepth = currentScrollDepth;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    const sendAnalytics = () => {
      if (trackerRef.current.hasFired) return;
      trackerRef.current.hasFired = true;

      const timeSpent = Math.round((Date.now() - trackerRef.current.startTime) / 1000);
      const deviceType = window.innerWidth <= 768 ? 'Mobile' : window.innerWidth <= 1024 ? 'Tablet' : 'Desktop';

      // Send payload to backend
      recordPageview({
        postId,
        workspaceId,
        visitorId: visitorId as string,
        scrollDepth: trackerRef.current.maxScrollDepth,
        timeSpent,
        source: document.referrer || 'direct',
        deviceType
      });
    };

    // Fire analytics when user navigates away or closes tab
    window.addEventListener('beforeunload', sendAnalytics);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') sendAnalytics();
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', sendAnalytics);
      document.removeEventListener('visibilitychange', sendAnalytics);
    };
  }, [postId, workspaceId]);

  return null; // Silent component
}
