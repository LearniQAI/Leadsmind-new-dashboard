/**
 * countdownImage — server-side renderer for the Email Campaigns "Countdown Timer" block.
 *
 * The compiled campaign HTML (see emailRenderer.ts, case 'countdown') no longer bakes a
 * static digit snapshot into body_html at compile time (save/schedule/send-now) — instead it
 * points an <img> tag at the API route backed by this module, so every fetch (by the email
 * client, at whatever moment the recipient actually opens the message) computes remaining
 * time fresh against `Date.now()`. Same technique real ESPs (Mailchimp/Klaviyo) use for
 * "live" countdown blocks in email, since email clients can't run JS.
 *
 * Visual output intentionally mirrors the exact panel markup this replaced (see git history
 * of emailRenderer.ts's countdown case): label row + 4 boxes (Days/Hrs/Mins/Secs), same
 * colors/sizes, just rasterized instead of laid out as an HTML <table>.
 */
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';
import path from 'path';

let fontBuffer: ArrayBuffer | null = null;

async function getFontBuffer(): Promise<ArrayBuffer> {
  if (!fontBuffer) {
    const localPath = path.join(process.cwd(), 'src/lib/avatar/roboto-medium.ttf');
    if (fs.existsSync(localPath)) {
      const buffer = fs.readFileSync(localPath);
      fontBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    } else {
      const res = await fetch('https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf');
      if (!res.ok) throw new Error('Failed to fetch font for countdown image generation');
      fontBuffer = await res.arrayBuffer();
    }
  }
  return fontBuffer;
}

const WIDTH = 300;
const HEIGHT = 96;

interface CountdownImageOptions {
  /** Milliseconds remaining until target, already computed by the caller at request time. */
  distanceMs: number;
  /** Sanitized/validated by the caller — this module does not accept raw untrusted strings. */
  label: string;
  /** Sanitized/validated hex color (e.g. "#2563eb") — this module does not accept raw untrusted strings. */
  primaryColor: string;
}

function segment(value: string, sub: string) {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '58px',
        height: '54px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
      },
      children: [
        {
          type: 'div',
          props: {
            style: { fontSize: '20px', fontWeight: 800, color: '#0f172a', lineHeight: 1 },
            children: value,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              fontSize: '9px',
              fontWeight: 400,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginTop: '3px',
            },
            children: sub,
          },
        },
      ],
    },
  };
}

/** Renders the live "time remaining" panel — used while distanceMs > 0. */
async function renderActive(opts: CountdownImageOptions): Promise<Buffer> {
  const { distanceMs, label, primaryColor } = opts;
  const days = String(Math.floor(distanceMs / (1000 * 60 * 60 * 24))).padStart(2, '0');
  const hours = String(Math.floor((distanceMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0');
  const minutes = String(Math.floor((distanceMs % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
  const seconds = String(Math.floor((distanceMs % (1000 * 60)) / 1000)).padStart(2, '0');

  const fontData = await getFontBuffer();

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: `${WIDTH}px`,
          height: `${HEIGHT}px`,
          backgroundColor: '#ffffff',
          fontFamily: 'Roboto',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                fontSize: '10.5px',
                fontWeight: 700,
                color: primaryColor,
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                marginBottom: '10px',
              },
              children: label,
            },
          },
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'row', gap: '6px' },
              children: [
                segment(days, 'Days'),
                segment(hours, 'Hrs'),
                segment(minutes, 'Mins'),
                segment(seconds, 'Secs'),
              ],
            },
          },
        ],
      },
    } as any,
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [{ name: 'Roboto', data: fontData, weight: 500, style: 'normal' }],
    }
  );

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH * 2 } });
  return resvg.render().asPng();
}

/** Renders the distinct "offer ended" state — used once distanceMs <= 0. Never negative digits. */
async function renderEnded(): Promise<Buffer> {
  const fontData = await getFontBuffer();

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: `${WIDTH}px`,
          height: `${HEIGHT}px`,
          backgroundColor: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          fontFamily: 'Roboto',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                fontSize: '15px',
                fontWeight: 800,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              },
              children: 'Offer Ended',
            },
          },
        ],
      },
    } as any,
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [{ name: 'Roboto', data: fontData, weight: 500, style: 'normal' }],
    }
  );

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH * 2 } });
  return resvg.render().asPng();
}

export const COUNTDOWN_IMAGE_WIDTH = WIDTH;
export const COUNTDOWN_IMAGE_HEIGHT = HEIGHT;

/**
 * Computes distance from `targetDate` to now (at call time) and renders the matching PNG —
 * the live panel while time remains, the distinct "ended" panel once it has passed.
 */
export async function generateCountdownPng(targetDate: Date, label: string, primaryColor: string): Promise<Buffer> {
  const distanceMs = targetDate.getTime() - Date.now();
  if (distanceMs <= 0) {
    return renderEnded();
  }
  return renderActive({ distanceMs, label, primaryColor });
}
