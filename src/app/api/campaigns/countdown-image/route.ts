import { NextRequest, NextResponse } from 'next/server';
import { generateCountdownPng } from '@/lib/builder/countdownImage';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Deliberately unauthenticated (recipients' email clients fetch this with no session — same
// trust model as a tracking pixel), but the rendering surface is kept intentionally narrow:
// the ONLY thing this route can ever produce is a countdown-styled PNG for a validated date.
// It must never become a generic "render arbitrary text/HTML as an image" service, so every
// input is whitelisted and clamped below rather than passed through.

const DEFAULT_LABEL = 'OFFER EXPIRES IN:';
const DEFAULT_COLOR = '#2563eb';
const MAX_LABEL_LENGTH = 40;
// Absurdly-far bounds so this can't be (ab)used to schedule/probe dates outside anything a real
// campaign countdown would ever need.
const MIN_YEAR = 2000;
const MAX_YEAR = new Date().getFullYear() + 10;

function parseTarget(raw: string | null): Date | null {
  if (!raw) return null;
  // Reject absurdly long input before even attempting to parse.
  if (raw.length > 40) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getUTCFullYear();
  if (year < MIN_YEAR || year > MAX_YEAR) return null;
  return parsed;
}

function sanitizeLabel(raw: string | null): string {
  if (!raw) return DEFAULT_LABEL;
  // Whitelist: letters, numbers, spaces, and a small set of punctuation. Everything else
  // (including any HTML/SVG-meaningful characters) is stripped, not escaped — this text is
  // rendered as a satori text node (never parsed as markup), but we keep the charset narrow
  // regardless so this route can't be repurposed to display arbitrary content.
  const cleaned = raw.replace(/[^A-Za-z0-9 :,!'-]/g, '').trim().slice(0, MAX_LABEL_LENGTH);
  return cleaned || DEFAULT_LABEL;
}

function sanitizeColor(raw: string | null): string {
  if (!raw) return DEFAULT_COLOR;
  const candidate = raw.startsWith('#') ? raw : `#${raw}`;
  return /^#[0-9a-fA-F]{6}$/.test(candidate) ? candidate : DEFAULT_COLOR;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const target = parseTarget(searchParams.get('target'));

    if (!target) {
      return NextResponse.json({ error: 'Invalid or missing target date.' }, { status: 400 });
    }

    const label = sanitizeLabel(searchParams.get('label'));
    const color = sanitizeColor(searchParams.get('color'));

    const png = await generateCountdownPng(target, label, color);

    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        // Every request must recompute against Date.now() — this is the entire point of the
        // block. Any caching (CDN, email proxy, or the client's own image cache) would freeze
        // the "live" countdown right back into a stale snapshot, which is the bug this replaces.
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, 'api.campaigns.countdown_image.failed');
    return NextResponse.json({ error: 'Failed to generate countdown image.' }, { status: 500 });
  }
}
