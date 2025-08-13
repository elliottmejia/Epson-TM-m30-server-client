// server/main.js
import { Elysia, t } from 'elysia';
import ThermalPkg from 'node-thermal-printer';

const { CharacterSet, printer: ThermalPrinter, types: PrinterTypes } = ThermalPkg;

const PRINTER_ADDR = process.env.PRINTER_ADDR || "tcp://192.168.4.90:9100";

async function printTicket(title, body, imageBuffer) {
  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: PRINTER_ADDR,
    characterSet: CharacterSet.PC437_USA,
    removeSpecialCharacters: false,
    replaceSpecialCharacters: true,
    lineCharacter: "-",
    options: { timeout: 5000 },
  });

  const ok = await printer.isPrinterConnected();
  if (!ok) throw new Error(`Printer not reachable at ${PRINTER_ADDR}`);

  printer.alignCenter();
  printer.setTextDoubleHeight();
  printer.println(title ?? "");
  printer.setTextNormal();
  printer.drawLine();
  printer.alignLeft();
  if (body) printer.println(body);

  if (imageBuffer && imageBuffer.length) {
    printer.newLine();
    await printer.printImageBuffer(imageBuffer);
  }

  printer.drawLine();
  printer.cut();

  const sent = await printer.execute();
  if (!sent) throw new Error("Execute returned false - nothing sent");
}

const app = new Elysia()
  .get("/health", () => ({ ok: true, printer: PRINTER_ADDR }))

  // JSON route: optional imageBase64 (data URI or raw base64)
  .post(
    "/print",
    async ({ body, set }) => {
      try {
        const { title, body: content, imageBase64 } = body;
        let imageBuffer = null;
        if (imageBase64 && typeof imageBase64 === "string") {
          const b64 = imageBase64.replace(
            /^data:image\/[a-zA-Z0-9.+-]+;base64,/,
            ""
          );
          imageBuffer = Buffer.from(b64, "base64");
        }
        await printTicket(title, content, imageBuffer);
        return { ok: true };
      } catch (err) {
        set.status = 500;
        return { error: err?.message ?? String(err) };
      }
    },
    {
      body: t.Object({
        title: t.String(),
        body: t.String(),
        imageBase64: t.Optional(t.String()),
      }),
    }
  )

  // Built‑in multipart route: fields title, body, file field image
  .post(
    "/print-multipart",
    async ({ body, set }) => {
      try {
        const title = body?.title ?? "";
        const content = body?.body ?? "";
        let imageBuffer = null;
        const file = body?.image;

        if (file && typeof file.arrayBuffer === "function") {
          const ab = await file.arrayBuffer();
          imageBuffer = Buffer.from(ab);
        }

        await printTicket(title, content, imageBuffer);
        return { ok: true };
      } catch (err) {
        set.status = 500;
        return { error: err?.message ?? String(err) };
      }
    },
    // Elysia 1.x accepts schemas for multipart too
    {
      body: t.Object({
        title: t.String(),
        body: t.String(),
        image: t.Optional(t.Any()),
      }),
    }
  )
  .listen(3000);

console.log('Elysia server listening on http://localhost:3000');