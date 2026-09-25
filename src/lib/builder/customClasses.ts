// The Container "Tailwind class inspector" accepts a curated vocabulary
// (customClassVocabulary.json), which tailwind.config.js safelists — so every accepted class is
// guaranteed to be in the built CSS. Anything else is flagged in the panel instead of being
// silently purged from the production bundle.
import vocab from './customClassVocabulary.json';

export const CUSTOM_CLASS_GROUPS: { label: string; classes: string[] }[] = vocab.groups;
export const CUSTOM_CLASS_VARIANTS: string[] = vocab.variants;
const ALLOWED = new Set(CUSTOM_CLASS_GROUPS.flatMap((g) => g.classes));

/** Split a class field into classes that will apply and ones that won't. `hover:`/`focus:`
 *  prefixes (which the field adds itself) are accepted on the matching field. */
export function checkCustomClasses(value: string, state: 'normal' | 'hover' | 'focus' = 'normal'): { supported: string[]; unsupported: string[] } {
  const supported: string[] = [];
  const unsupported: string[] = [];
  for (const raw of (value || '').split(/\s+/).filter(Boolean)) {
    const bare = state !== 'normal' && raw.startsWith(`${state}:`) ? raw.slice(state.length + 1) : raw;
    (ALLOWED.has(bare) ? supported : unsupported).push(raw);
  }
  return { supported, unsupported };
}
