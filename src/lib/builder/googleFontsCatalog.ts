// Real Google Fonts catalog for the Text Element Typography Controls pass (Systeme-parity
// Master Prompt, Part 2).
//
// Step 0 audit finding, confirmed live: no Google Fonts API key or catalog mechanism exists
// anywhere in this project (searched for GOOGLE_FONTS_API_KEY / webfonts/v1 / .env.local —
// none found). Google's live Web Fonts Developer API (which lists its full ~1800-family
// catalog) requires an API key to query; loading a KNOWN family by name via the public css2
// endpoint does not. Without a key to add (a real infrastructure decision this pass can't make
// silently), this is a curated, real, ~50-family list — not a fabricated "1800 fonts" claim —
// covering the major real categories (sans, serif, display, monospace), each with its actual
// real weight/style availability so the Font style dropdown only ever offers variants that
// really exist for the selected family. Every family here is verified real (all are genuine,
// commonly-used Google Fonts).
export interface GoogleFontVariant {
  value: string; // e.g. '400', '700', '400italic'
  label: string; // e.g. 'Regular', 'Bold', 'Italic'
  weight: number;
  italic: boolean;
}

export interface GoogleFontEntry {
  family: string;
  category: 'sans-serif' | 'serif' | 'display' | 'monospace';
  variants: GoogleFontVariant[];
}

const std = (weights: number[], italics = true): GoogleFontVariant[] => {
  const names: Record<number, string> = {
    100: 'Thin', 200: 'Extra Light', 300: 'Light', 400: 'Regular', 500: 'Medium',
    600: 'Semi Bold', 700: 'Bold', 800: 'Extra Bold', 900: 'Black',
  };
  const out: GoogleFontVariant[] = [];
  for (const w of weights) {
    out.push({ value: String(w), label: names[w] || String(w), weight: w, italic: false });
    if (italics) out.push({ value: `${w}italic`, label: `${names[w] || w} Italic`, weight: w, italic: true });
  }
  return out;
};

export const GOOGLE_FONTS: GoogleFontEntry[] = [
  { family: 'Inter', category: 'sans-serif', variants: std([300, 400, 500, 600, 700, 800], false) },
  { family: 'Poppins', category: 'sans-serif', variants: std([300, 400, 500, 600, 700, 800]) },
  { family: 'Roboto', category: 'sans-serif', variants: std([300, 400, 500, 700]) },
  { family: 'Open Sans', category: 'sans-serif', variants: std([300, 400, 500, 600, 700, 800]) },
  { family: 'Lato', category: 'sans-serif', variants: std([300, 400, 700, 900]) },
  { family: 'Montserrat', category: 'sans-serif', variants: std([300, 400, 500, 600, 700, 800]) },
  { family: 'Nunito', category: 'sans-serif', variants: std([300, 400, 600, 700, 800]) },
  { family: 'Nunito Sans', category: 'sans-serif', variants: std([300, 400, 600, 700, 800]) },
  { family: 'Work Sans', category: 'sans-serif', variants: std([300, 400, 500, 600, 700]) },
  { family: 'Rubik', category: 'sans-serif', variants: std([300, 400, 500, 600, 700]) },
  { family: 'Manrope', category: 'sans-serif', variants: std([300, 400, 500, 600, 700, 800], false) },
  { family: 'DM Sans', category: 'sans-serif', variants: std([400, 500, 700]) },
  { family: 'Space Grotesk', category: 'sans-serif', variants: std([400, 500, 600, 700], false) },
  { family: 'Sora', category: 'sans-serif', variants: std([400, 600, 700, 800], false) },
  { family: 'Public Sans', category: 'sans-serif', variants: std([400, 500, 600, 700]) },
  { family: 'IBM Plex Sans', category: 'sans-serif', variants: std([400, 500, 600]) },
  { family: 'Archivo', category: 'sans-serif', variants: std([400, 700, 800, 900], false) },
  { family: 'Karla', category: 'sans-serif', variants: std([300, 400, 600, 700]) },
  { family: 'Mulish', category: 'sans-serif', variants: std([300, 400, 600, 700, 800]) },
  { family: 'Barlow', category: 'sans-serif', variants: std([300, 400, 500, 600, 700]) },
  { family: 'Fira Sans', category: 'sans-serif', variants: std([300, 400, 500, 600, 700]) },
  { family: 'Quicksand', category: 'sans-serif', variants: std([300, 400, 500, 600, 700], false) },
  { family: 'Josefin Sans', category: 'sans-serif', variants: std([300, 400, 600, 700]) },
  { family: 'Raleway', category: 'sans-serif', variants: std([300, 400, 500, 600, 700, 800]) },
  { family: 'Outfit', category: 'sans-serif', variants: std([300, 400, 500, 600, 700, 800], false) },
  { family: 'Plus Jakarta Sans', category: 'sans-serif', variants: std([300, 400, 500, 600, 700, 800]) },
  { family: 'Urbanist', category: 'sans-serif', variants: std([300, 400, 500, 600, 700, 800]) },
  { family: 'Lexend', category: 'sans-serif', variants: std([300, 400, 500, 600, 700], false) },
  { family: 'Figtree', category: 'sans-serif', variants: std([300, 400, 500, 600, 700, 800]) },
  { family: 'Playfair Display', category: 'serif', variants: std([400, 500, 600, 700, 800, 900]) },
  { family: 'Merriweather', category: 'serif', variants: std([300, 400, 700, 900]) },
  { family: 'Lora', category: 'serif', variants: std([400, 500, 600, 700]) },
  { family: 'Source Serif 4', category: 'serif', variants: std([400, 500, 600, 700]) },
  { family: 'Crimson Text', category: 'serif', variants: std([400, 600, 700]) },
  { family: 'Cormorant Garamond', category: 'serif', variants: std([300, 400, 500, 600, 700]) },
  { family: 'PT Serif', category: 'serif', variants: std([400, 700]) },
  { family: 'Libre Baskerville', category: 'serif', variants: std([400, 700]) },
  { family: 'Bitter', category: 'serif', variants: std([300, 400, 500, 600, 700]) },
  { family: 'Spectral', category: 'serif', variants: std([300, 400, 500, 600, 700]) },
  { family: 'Fraunces', category: 'serif', variants: std([300, 400, 500, 600, 700]) },
  { family: 'Fredoka', category: 'display', variants: std([300, 400, 500, 600, 700], false) },
  { family: 'Baloo 2', category: 'display', variants: std([400, 500, 600, 700, 800], false) },
  { family: 'Bebas Neue', category: 'display', variants: std([400], false) },
  { family: 'Anton', category: 'display', variants: std([400], false) },
  { family: 'Oswald', category: 'display', variants: std([300, 400, 500, 600, 700], false) },
  { family: 'Abril Fatface', category: 'display', variants: std([400], false) },
  { family: 'Pacifico', category: 'display', variants: std([400], false) },
  { family: 'Caveat', category: 'display', variants: std([400, 500, 600, 700], false) },
  { family: 'JetBrains Mono', category: 'monospace', variants: std([400, 500, 600, 700], false) },
  { family: 'IBM Plex Mono', category: 'monospace', variants: std([400, 500, 600]) },
  { family: 'Space Mono', category: 'monospace', variants: std([400, 700]) },
  { family: 'Roboto Mono', category: 'monospace', variants: std([300, 400, 500, 600, 700]) },
];

export const getGoogleFont = (family: string): GoogleFontEntry | undefined =>
  GOOGLE_FONTS.find((f) => f.family === family);

export const searchGoogleFonts = (query: string): GoogleFontEntry[] => {
  if (!query.trim()) return GOOGLE_FONTS;
  const q = query.trim().toLowerCase();
  return GOOGLE_FONTS.filter((f) => f.family.toLowerCase().includes(q));
};
