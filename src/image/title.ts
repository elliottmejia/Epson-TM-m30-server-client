// src/image/title.ts
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import * as opentype from "opentype.js";
import { PRINTER_WIDTH } from "../config";

// Keep the font in your repo. Override with EVA_TTF_PATH if needed.
const EVA_TTF_PATH =
  process.env.EVA_TTF_PATH ||
  path.resolve(process.cwd(), "web", "public", "EVA.TTF");

function esc(x: string) {
  return x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function renderTitleImage(
  title: string,
  opts?: {
    font?: string;
    fontSizePx?: number;
    paddingPx?: number;
    bg?: string;
    fg?: string;
  }
): Promise<Buffer> {
  if (!title?.trim()) return Buffer.alloc(0);

  const fontKey = opts?.font?.toLowerCase() ?? "default";

  const width = PRINTER_WIDTH; // dots/pixels
  const padding = opts?.paddingPx ?? 12; // px
  const fontSize = opts?.fontSizePx ?? 64; // font size

  const bg = opts?.bg ?? "#ffffff";
  const fg = opts?.fg ?? "#000000";

  if (fontKey === "evangelion") {
    if (!fs.existsSync(EVA_TTF_PATH))
      throw new Error(`EVA font not found at ${EVA_TTF_PATH}`);

    // Load font and build a vector path for the title. No @font-face, no data URLs.
    const font = await opentype.load(EVA_TTF_PATH);

    // Build a path at origin to measure it
    const rawPath = font.getPath(title, 0, 0, fontSize);
    const bb = rawPath.getBoundingBox();
    const textW = Math.max(bb.x2 - bb.x1, 1);

    const maxTextWidth = Math.max(width - padding * 2, 16);
    const scale = Math.min(maxTextWidth / textW, 1);

    // Compute metrics to vertically size the SVG
    const units = font.unitsPerEm || 1000;
    const ascent = (font.ascender / units) * fontSize * scale;
    const descent = (Math.abs(font.descender) / units) * fontSize * scale;
    const lineHeight = ascent + descent; // approximate cap + descender
    const height = Math.ceil(padding + lineHeight + padding);

    // Center horizontally: shift so left edge aligns, then center the box
    const tx = Math.round((width - textW * scale) / 2 - bb.x1 * scale);
    // Baseline Y so that the ascender fits above, with a little headroom
    const baselineY = Math.round(padding + ascent * 0.95);

    // Apply transforms
    const pathTransform = new opentype.Path();
    // opentype.js has no matrix concat on Path, so we rebuild with commands
    for (const c of rawPath.commands) {
      const cmd: any = { type: c.type };
      if ("x" in c && "y" in c) {
        cmd.x = c.x * scale + tx;
        cmd.y = c.y * scale + baselineY;
      }
      if ("x1" in c && "y1" in c) {
        cmd.x1 = c.x1 * scale + tx;
        cmd.y1 = c.y1 * scale + baselineY;
      }
      if ("x2" in c && "y2" in c) {
        cmd.x2 = c.x2 * scale + tx;
        cmd.y2 = c.y2 * scale + baselineY;
      }
      pathTransform.commands.push(cmd);
    }

    const d = pathTransform.toPathData(2);

    const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="${bg}" />
    <path d="${d}" fill="${fg}" />
  </svg>`.trim();

    // Rasterize to grayscale. normalizeImage will clamp to 16 tones later.
    return await sharp(Buffer.from(svg))
      .flatten({ background: "#ffffff" })
      .grayscale()
      .toBuffer();
  } else {
    // Fallback: render SVG with <text> element using system font (sans-serif)
    // Measure height: approximate line height as fontSize + padding top and bottom
    const height = Math.ceil(padding + fontSize + padding);

    // Escape the title text for SVG
    const escapedTitle = esc(title);

    const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="${bg}" />
    <text x="50%" y="${
      padding + fontSize * 0.8
    }" fill="${fg}" font-family="sans-serif" font-size="${fontSize}px" dominant-baseline="middle" text-anchor="middle">${escapedTitle}</text>
  </svg>`.trim();

    return await sharp(Buffer.from(svg))
      .flatten({ background: "#ffffff" })
      .grayscale()
      .toBuffer();
  }
}