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
