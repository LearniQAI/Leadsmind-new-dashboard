import { getGoogleFont } from './googleFontsCatalog';

// Dynamic runtime font loading (Part 2, Step 0 finding: this project's REAL font mechanism —
// confirmed live in the earlier lesson-template passes — is a single static Google Fonts
// css2 <link> declared once in layout.tsx/globals.css, not next/font. That static-URL
// approach doesn't scale to "pick any of ~50 catalog fonts on demand" — this adds a second,
// narrowly-scoped runtime mechanism: inject one <link> per family the user actually selects,
// deduplicated by id so re-selecting a family already loaded is a no-op. This is additive —
// the static base URL (DM Sans, Poppins, Inter, etc.) is untouched.
const loadedFamilies = new Set<string>();

export function loadGoogleFontFamily(family: string) {
  if (typeof document === 'undefined') return;
  if (loadedFamilies.has(family)) return;

  const entry = getGoogleFont(family);
  const weights = entry ? Array.from(new Set(entry.variants.map((v) => v.weight))).sort((a, b) => a - b) : [400];

  const linkId = `gfont-${family.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(linkId)) {
    loadedFamilies.add(family);
    return;
  }

  const familyParam = `${family.replace(/\s+/g, '+')}:ital,wght@${weights.map((w) => `0,${w}`).join(';')}${
    entry?.variants.some((v) => v.italic) ? ';' + weights.map((w) => `1,${w}`).join(';') : ''
  }`;

  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${familyParam}&display=swap`;
  document.head.appendChild(link);
  loadedFamilies.add(family);
}
