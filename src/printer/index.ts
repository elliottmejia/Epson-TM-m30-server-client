// src/printer/index.ts
import ThermalPkg from "node-thermal-printer";
import { PRINTER_ADDR } from "../config";
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
  imageBuffer?: Buffer | null
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
    const titleRaster = await renderTitleImage(title.trim());
    const titleClamped = await normalizeImage(titleRaster);
    await printer.printImageBuffer(titleClamped);
    printer.newLine();
  }

  // Optional rule
  printer.drawLine();
  printer.alignLeft();

  if (body) printer.println(body);

  if (imageBuffer?.length) {
    printer.newLine();
    // imageBuffer is already normalized by your routes
    await printer.printImageBuffer(imageBuffer);
  }

  printer.drawLine();
  printer.cut();

  try {
    await printer.execute();
  } catch (e: any) {
    (e as any).sentMaybePrinted = true;
    throw e;
  }
}
