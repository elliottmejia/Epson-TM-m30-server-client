export const PRINTER_ADDR =
  process.env.PRINTER_ADDR || 'tcp://192.168.4.90:9100';

// 80 mm paper is usually 576 dots. Many 58 mm units are 384 or 512.
export const PRINTER_WIDTH = Number(process.env.PRINTER_WIDTH || 576);

// Optional hard cap in pixels to protect memory. Tune or remove.
export const MAX_IMAGE_HEIGHT = process.env.MAX_IMAGE_HEIGHT
  ? Number(process.env.MAX_IMAGE_HEIGHT)
  : undefined;