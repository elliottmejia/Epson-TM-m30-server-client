// src/image/title.ts
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { PRINTER_WIDTH } from '../config';

// Point this to your font file. Default assumes web/public/EVA.TTF exists.
const EVA_TTF_PATH =
  process.env.EVA_TTF_PATH ||
  path.resolve(process.cwd(), 'web', 'public', 'EVA.TTF');

function esc(x: string) {
  return x
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function renderTitleImage(
  title: string,
  opts?: { fontSizePx?: number; paddingPx?: number; bg?: string; fg?: string }
): Promise<Buffer> {
  if (!fs.existsSync(EVA_TTF_PATH)) {
    throw new Error(`EVA font not found at ${EVA_TTF_PATH}`);
  }

  const fontB64 = fs.readFileSync(EVA_TTF_PATH).toString('base64');

  // Tunables
  const width = PRINTER_WIDTH;                 // dots/pixels
  const padding = opts?.paddingPx ?? 12;       // px
  const fontSize = opts?.fontSizePx ?? Math.floor(width * 0.18); // scale with paper width
  const bg = opts?.bg ?? '#ffffff';
  const fg = opts?.fg ?? '#000000';

  // Heuristic line height
  const lineHeight = Math.round(fontSize * 1.25);
  const height = padding + lineHeight + padding;

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <style>
        @font-face {
          font-family: 'EVA';
          src: url('data:font/ttf;base64,${fontB64}') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
      </style>
    </defs>
    <rect width="100%" height="100%" fill="${bg}"/>
    <text
      x="50%" y="${padding + lineHeight * 0.85}"
      text-anchor="middle"
      font-family="EVA"
      font-size="${fontSize}"
      fill="${fg}"
    >${esc(title)}</text>
  </svg>`.trim();

  // Rasterize the SVG to grayscale pixels at target width
  return await sharp(Buffer.from(svg))
    .flatten({ background: '#ffffff' })
    .grayscale()
    .toBuffer();
}