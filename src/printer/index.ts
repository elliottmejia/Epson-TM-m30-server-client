import ThermalPkg from 'node-thermal-printer';
import { PRINTER_ADDR } from '../config';

const { CharacterSet, printer: ThermalPrinter, types: PrinterTypes } = ThermalPkg;

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
    lineCharacter: '-',
    options: { timeout: 5000 }
  });

  // Soft preflight
  try {
    const ok = await printer.isPrinterConnected();
    if (!ok) console.warn('[warn] isPrinterConnected returned false - continuing anyway');
  } catch (e: any) {
    console.warn('[warn] isPrinterConnected threw - continuing:', e?.message ?? e);
  }

  // Build job
  printer.alignCenter();
  if (typeof printer.setTextDoubleHeight === 'function') printer.setTextDoubleHeight();
  printer.println(title ?? '');
  if (typeof printer.setTextNormal === 'function') printer.setTextNormal();
  printer.drawLine();
  printer.alignLeft();

  if (body) printer.println(body);
  if (imageBuffer?.length) {
    printer.newLine();
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