/**
 * Replaces {{tag}} with values from URL parameters or provided data object.
 * Supports fallback formatting like {{name|Guest}}
 */
export function replaceMergeTags(text: string, data: Record<string, any> = {}): string {
  if (!text) return text;
  
  // Use URL search params as default source if we are in a browser
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const searchData: Record<string, any> = {};
  params.forEach((value, key) => {
    searchData[key] = value;
  });

  const combinedData = { ...searchData, ...data };

  return text.replace(/\{\{([^}]+)\}\}/g, (match, tag) => {
    const [key, fallback] = tag.split('|').map((s: string) => s.trim());
    const val = combinedData[key];
    
    if (val !== undefined && val !== null && val !== '') {
        return val;
    }
    
    return fallback !== undefined ? fallback : match;
  });
}

/**
 * Resolves a LinkSelector value into a valid URL string
 */
export function resolveLink(link: any, context?: { basePath?: string, websiteId?: string | null, funnelId?: string | null }): string {
    if (!link) return '#';
    if (typeof link === 'string') return link;

    const { type, value } = link;
    const basePath = context?.basePath || '';

    switch (type) {
        case 'url':
            return value || '#';
        case 'page':
            // Prepend basePath if it exists
            const pathValue = value === 'home' ? '' : `/${value}`;
            return `${basePath}${pathValue}` || '/';
        case 'section':
            return `#${value}`;
        case 'action':
            if (value === 'submit') return 'javascript:void(0)'; // Handle via component logic
            if (value === 'next') return '/next-step'; // Mock for now
            return '#';
        default:
            return '#';
    }
}


