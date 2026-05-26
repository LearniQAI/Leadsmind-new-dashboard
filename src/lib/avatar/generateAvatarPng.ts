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
        if (!res.ok) throw new Error('Failed to fetch font for avatar generation');
        fontBuffer = await res.arrayBuffer();
      }
    }
  }
  return fontBuffer;
}

export async function generateAvatarPng(initials: string, bgColor: string): Promise<Buffer> {
  const fontData = await getFontBuffer();
  
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '112px',
          height: '112px',
          borderRadius: '56px',
          backgroundColor: bgColor || '#3b82f6',
          color: '#ffffff',
          fontSize: '44px',
          fontWeight: 'bold',
          fontFamily: 'Roboto',
        },
        children: initials.toUpperCase(),
      },
    } as any,
    {
      width: 112,
      height: 112,
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
      value: 112,
    },
  });

  const pngData = resvg.render();
  return pngData.asPng();
}
