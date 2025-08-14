import sharp from 'sharp';
import { PRINTER_WIDTH } from '../config';

export type QuantizeOpts = {
  maxHeight?: number;
};

function nextMultipleOf8(n: number) {
  return (n + 7) & ~7;
}

/**
 * Clamp to 16 luminance levels and pad width to a byte boundary.
 * Returns a 4‑bit paletted PNG buffer.
 */
export async function normalizeImage(
  buffer: Buffer,
  opts: QuantizeOpts = {}
): Promise<Buffer> {
  if (!buffer) return buffer;

  const { maxHeight } = opts;

  try {
    // 1) Normalize geometry and grayscale
    let base = sharp(buffer)
      .flatten({ background: '#ffffff' })
      .resize({
        width: PRINTER_WIDTH,
        withoutEnlargement: true,
        fit: 'inside'
      })
      .grayscale();

    // Optional height clamp
    const m1 = await base.metadata();
    const w1 = m1.width ?? PRINTER_WIDTH;
    const h1 = m1.height;

    const targetHeight =
      typeof maxHeight === 'number' && h1 && h1 > maxHeight ? maxHeight : h1;

    if (targetHeight && h1 && targetHeight < h1) {
      base = base.extract({ left: 0, top: 0, width: w1, height: targetHeight });
    }

    // Ensure byte aligned row width
    const m2 = await base.metadata();
    const w2 = m2.width ?? PRINTER_WIDTH;
    const padTo = nextMultipleOf8(w2);
    if (padTo > w2) {
      base = base.extend({ right: padTo - w2, background: '#ffffff' });
    }

    // 2) Get raw 8‑bit grayscale
    const { data, info } = await base.raw().toBuffer({ resolveWithObject: true });

    // 3) Quantize to 16 bins
    const src = data;
    const out = Buffer.allocUnsafe(src.length);
    for (let i = 0; i < src.length; i++) {
      const v = src[i];
      const bin = Math.round((v / 255) * 15);     // 0..15
      const vq = Math.round((bin / 15) * 255);    // back to 0..255
      out[i] = vq;
    }

    // 4) Rewrap and encode 4‑bit paletted PNG
    return await sharp(out, {
      raw: { width: info.width, height: info.height, channels: 1 }
    })
      .png({ palette: true, colors: 16 })
      .toBuffer();
  } catch {
    return buffer; // fail soft
  }
}