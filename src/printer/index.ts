// src/printer/index.ts
import ThermalPkg from "node-thermal-printer";
import { PRINTER_ADDR, TOP_MARGIN } from "../config";
import { renderTitleImage } from "../image/title";
import { normalizeImage } from "../image/normalize";

const {
  CharacterSet,
  printer: ThermalPrinter,
  types: PrinterTypes,
} = ThermalPkg;

export async function printTicket(
  title?: string,
  body?: string,
  imageBuffer?: Buffer | null,
  opts?: { font?: string },
  qrData?: string
) {
  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: PRINTER_ADDR,
    characterSet: CharacterSet.PC437_USA,
    removeSpecialCharacters: false,
    lineCharacter: "-",
    options: { timeout: 5000 },
  });

  // Soft preflight
  try {
    const ok = await printer.isPrinterConnected();
    if (!ok)
      console.warn(
        "[warn] isPrinterConnected returned false - continuing anyway"
      );
  } catch (e: any) {
    console.warn(
      "[warn] isPrinterConnected threw - continuing:",
      e?.message ?? e
    );
  }

  // Build job
  printer.alignCenter();

  // Render EVA title as an image and clamp to 16 tones
  if (title && title.trim().length) {
    printer.bold(true);
    for (let i = 0; i < TOP_MARGIN; i++) {
      printer.println("");
    }
    if (opts?.font && opts.font.toLowerCase() !== "default") {
      // Render title as image if in nonstandard font
      const titleRaster = await renderTitleImage(title.trim(), {
        font: opts.font,
      });
      const titleClamped = await normalizeImage(titleRaster);
      await printer.printImageBuffer(titleClamped);
      printer.newLine();
    } else {
      // Use built-in title rendering
      printer.alignCenter();
      printer.setTextDoubleHeight();
      printer.println(title.trim());
      printer.setTextNormal();
      printer.alignLeft();
    }
    printer.bold(false);
  }

  // Optional rule
  printer.drawLine();
  printer.alignLeft();

  if (body) printer.println(body);

  if (imageBuffer?.length) {
    printer.newLine();
    // imageBuffer is already normalized by routes
    await printer.printImageBuffer(imageBuffer);
  }

  if (qrData && typeof printer.printQR === "function") {
    printer.newLine();
    printer.alignCenter();
    printer.printQR(qrData, { cellSize: 8, correction: "M" });
  }

  printer.cut();

  try {
    await printer.execute();
  } catch (e: any) {
    (e as any).sentMaybePrinted = true;
    throw e;
  }
}
