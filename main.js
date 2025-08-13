// server/main.js
import { Elysia, t } from 'elysia';
import ThermalPkg from 'node-thermal-printer';

const { CharacterSet, printer: ThermalPrinter, types: PrinterTypes } = ThermalPkg;

async function printTicket(title, body) {
  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: 'tcp://192.168.4.90:9100',
    characterSet: CharacterSet.PC437_USA,
    removeSpecialCharacters: false,
    replaceSpecialCharacters: true,
    lineCharacter: '-',
    options: { timeout: 5000 }
  });

  const ok = await printer.isPrinterConnected();
  if (!ok) throw new Error('Printer not reachable at 192.168.4.90:9100');

  printer.alignCenter();
  printer.setTextDoubleHeight();
  printer.println(title ?? '');
  printer.setTextNormal();
  printer.drawLine();
  printer.alignLeft();
  printer.println(body ?? '');
  printer.drawLine();
  printer.cut();

  const sent = await printer.execute();
  if (!sent) throw new Error('Execute returned false - nothing sent');
}

const app = new Elysia()
  .get('/health', () => ({ ok: true }))
  .post(
    '/print',
    async ({ body, set }) => {
      try {
        const { title, body: content } = body || {};
        await printTicket(title, content);
        return { ok: true };
      } catch (err) {
        set.status = 500;
        const msg = err && err.message ? err.message : String(err);
        return { error: msg };
      }
    },
    { body: t.Object({ title: t.String(), body: t.String() }) }
  )
  .listen(3000);

console.log('Elysia server listening on http://localhost:3000');