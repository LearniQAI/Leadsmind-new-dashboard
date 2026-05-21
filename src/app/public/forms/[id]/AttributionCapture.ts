'use client';

// Client-side utility for extracting attribution data from URL and document

export interface AttributionData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  landing_page?: string;
  first_touch_source?: string;
  first_touch_keyword?: string;
  first_touch_page?: string;
  [key: string]: string | undefined; // For extra hidden fields
}

export function captureAttribution(): AttributionData {
  if (typeof window === 'undefined') return {};

  const searchParams = new URLSearchParams(window.location.search);
  const data: AttributionData = {};

  const utms = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  
  for (const utm of utms) {
    const val = searchParams.get(utm);
    if (val) data[utm] = val;
  }

  // Handle cross-origin iframe referrer appropriately
  // Inside an iframe, document.referrer is the host page
  let referrer = '';
  try {
    referrer = window.top === window.self ? document.referrer : document.referrer;
  } catch (e) {
    referrer = document.referrer;
  }

  if (referrer) {
    data.referrer = referrer;
  }

  try {
    data.landing_page = window.top === window.self ? window.location.href : (document.referrer || window.location.href);
  } catch (e) {
    data.landing_page = window.location.href;
  }

  // FIRST-TOUCH ATTRIBUTION LOGIC WITH LOCALSTORAGE PERSISTENCE
  try {
    const cached = localStorage.getItem('lm_first_touch');
    if (cached) {
      const parsed = JSON.parse(cached);
      data.first_touch_source = parsed.first_touch_source;
      data.first_touch_keyword = parsed.first_touch_keyword;
      data.first_touch_page = parsed.first_touch_page;
    } else {
      // Calculate first-touch attribution
      let ftSource = 'direct';
      let ftKeyword = 'direct';
      const ftPage = window.location.href;

      if (referrer) {
        try {
          const refUrl = new URL(referrer);
          if (refUrl.hostname.includes('google.co.za')) {
            ftSource = 'google.co.za';
            // Extract keyword if q or query is present in referrer
            const refParams = new URLSearchParams(refUrl.search);
            const queryVal = refParams.get('q') || refParams.get('query');
            if (queryVal) {
              ftKeyword = queryVal;
            } else {
              // Fallback to utm_term or default to organic
              ftKeyword = searchParams.get('utm_term') || 'organic';
            }
          } else {
            // Other referrer
            ftSource = refUrl.hostname;
            ftKeyword = searchParams.get('utm_term') || 'referral';
          }
        } catch {
          // Referrer parsing error (plain string)
          if (referrer.includes('google.co.za')) {
            ftSource = 'google.co.za';
            ftKeyword = searchParams.get('utm_term') || 'organic';
          } else {
            ftSource = referrer;
            ftKeyword = searchParams.get('utm_term') || 'referral';
          }
        }
      }

      // Check if UTM source overrides direct/referral for initial landing
      const utmSourceVal = searchParams.get('utm_source');
      if (utmSourceVal) {
        ftSource = utmSourceVal;
        ftKeyword = searchParams.get('utm_term') || searchParams.get('utm_campaign') || 'marketing';
      }

      const firstTouch = {
        first_touch_source: ftSource,
        first_touch_keyword: ftKeyword,
        first_touch_page: ftPage
      };

      localStorage.setItem('lm_first_touch', JSON.stringify(firstTouch));
      
      data.first_touch_source = ftSource;
      data.first_touch_keyword = ftKeyword;
      data.first_touch_page = ftPage;
    }
  } catch (err) {
    console.error('Failed to capture first-touch attribution:', err);
  }

  return data;
}

export function injectUrlHiddenFields(configHiddenFields: any[], attribution: AttributionData): Record<string, any> {
  if (!configHiddenFields || !Array.isArray(configHiddenFields)) return {};
  if (typeof window === 'undefined') return {};
  
  const searchParams = new URLSearchParams(window.location.search);
  const hiddenValues: Record<string, any> = {};

  for (const field of configHiddenFields) {
    // field: { id: '...', name: 'utm_source', type: 'url_param' | 'static', value: 'default_val' }
    if (field.type === 'static') {
      hiddenValues[field.id] = field.value || '';
    } else if (field.type === 'url_param') {
      const paramVal = searchParams.get(field.name);
      hiddenValues[field.id] = paramVal || field.value || '';
    } else if (field.type === 'utm') {
      // Maps to attribution data automatically
      const utmVal = attribution[field.name];
      hiddenValues[field.id] = utmVal || field.value || '';
    }
  }

  return hiddenValues;
}
