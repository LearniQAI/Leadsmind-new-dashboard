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
      const altPath = path.join(__dirname, 'roboto-medium.ttf');
      if (fs.existsSync(altPath)) {
        const buffer = fs.readFileSync(altPath);
        fontBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      } else {
        const res = await fetch('https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf');
        if (!res.ok) throw new Error('Failed to fetch font for waveform generation');
        fontBuffer = await res.arrayBuffer();
      }
    }
  }
  return fontBuffer;
}

export async function generateWaveformPng(frequencies: number[], color = '#5C4AC7'): Promise<Buffer> {
  const fontData = await getFontBuffer();
  
  // Safe fallback if frequencies is empty
  const freqs = frequencies.length > 0 ? frequencies : [12, 24, 36, 18, 15, 30, 42, 20, 16, 25, 35, 12];
  
  // Render waveform bars as satori nodes
  const children = freqs.map((val, idx) => ({
    type: 'div',
    key: idx,
    props: {
      style: {
        width: '6px',
        height: `${Math.max(10, Math.min(100, val))}%`,
        backgroundColor: color,
        borderRadius: '3px',
        margin: '0 2px',
      }
    }
  }));

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '500px',
          height: '100px',
          backgroundColor: '#F1EFE8', // matching soft tan audio block background
          padding: '10px 20px',
          borderRadius: '12px',
        },
        children: children,
      },
    } as any,
    {
      width: 500,
      height: 100,
      fonts: [
        {
          name: 'Roboto',
          data: fontData,
          weight: 500,
          style: 'normal',
        },
      ],
    }
  );

  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: 500,
    },
  });

  const pngData = resvg.render();
  return pngData.asPng();
}
