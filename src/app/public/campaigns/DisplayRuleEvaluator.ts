export interface DisplayRule {
  type: 'device' | 'url' | 'referrer' | 'session';
  operator?: 'equals' | 'contains' | 'starts_with' | 'not_equals';
  value: any;
}

export function evaluateDisplayRules(rules: DisplayRule[]): boolean {
  if (!rules || rules.length === 0) return true;
  if (typeof window === 'undefined') return false;

  for (const rule of rules) {
    let passed = true;

    switch (rule.type) {
      case 'device':
        passed = evaluateDeviceRule(rule.value as string[]);
        break;
      case 'url':
        passed = evaluateUrlRule(rule.operator, rule.value as string);
        break;
      case 'referrer':
        passed = evaluateReferrerRule(rule.operator, rule.value as string);
        break;
    }

    // If ANY rule fails (AND logic), don't display
    // Depending on requirements this could be OR logic, but AND is safer for targeting
    if (!passed) return false;
  }

  return true;
}

function evaluateDeviceRule(allowedDevices: string[]): boolean {
  if (!allowedDevices || allowedDevices.length === 0) return true;
  
  const ua = navigator.userAgent;
  let currentDevice = 'desktop';
  if (/mobile/i.test(ua)) currentDevice = 'mobile';
  if (/ipad|tablet/i.test(ua)) currentDevice = 'tablet';

  return allowedDevices.includes(currentDevice);
}

function evaluateUrlRule(operator: string = 'contains', expected: string): boolean {
  let url = '';
  try { url = window.top === window.self ? window.location.href : document.referrer; }
  catch (e) { url = window.location.href; }
  
  if (!url) return false;
  url = url.toLowerCase();
  expected = expected.toLowerCase();

  switch (operator) {
    case 'equals': return url === expected;
    case 'contains': return url.includes(expected);
    case 'starts_with': return url.startsWith(expected);
    case 'not_equals': return url !== expected;
    default: return url.includes(expected);
  }
}

function evaluateReferrerRule(operator: string = 'contains', expected: string): boolean {
  let ref = '';
  try { ref = window.top === window.self ? document.referrer : ''; }
  catch (e) { ref = document.referrer; }

  ref = ref.toLowerCase();
  expected = expected.toLowerCase();

  if (!ref && operator !== 'not_equals') return false; // If requiring a referrer but there is none

  switch (operator) {
    case 'equals': return ref === expected;
    case 'contains': return ref.includes(expected);
    case 'starts_with': return ref.startsWith(expected);
    case 'not_equals': return ref !== expected;
    default: return ref.includes(expected);
  }
}
