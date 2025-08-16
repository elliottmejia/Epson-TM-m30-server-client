import { Elysia, t } from 'elysia';
import { printTicket } from '../printer';
import { normalizeImage } from '../image/normalize';
import { MAX_IMAGE_HEIGHT } from '../config';

export function mountPrintRoutes(app: Elysia) {
  return app
    .post(
      "/api/v1/print",
      async ({ body, set }) => {
        try {
          const {
            title,
            body: content,
            imageBase64,
            font,
            qr,
          } = body as {
            title?: string;
            body?: string;
            imageBase64?: string;
            font?: string;
            qr?: string | null;
          };

          let imageBuffer: Buffer | null = null;
          if (imageBase64) {
            const b64 = imageBase64.replace(
              /^data:image\/[a-zA-Z0-9.+-]+;base64,/,
              ""
            );
            imageBuffer = Buffer.from(b64, "base64");
            imageBuffer = await normalizeImage(imageBuffer, {
              maxHeight: MAX_IMAGE_HEIGHT,
            });
          }

          await printTicket(
            title,
            content,
            imageBuffer,
            { font },
            qr ?? undefined
          );
          return { ok: true };
        } catch (err: any) {
          if ((err as any)?.sentMaybePrinted) {
            set.status = 202;
            return {
              ok: false,
              maybePrinted: true,
              error: String(err.message ?? err),
            };
          }
          set.status = 500;
          return { error: String(err?.message ?? err) };
        }
      },
      {
        body: t.Object({
          title: t.String(),
          body: t.String(),
          imageBase64: t.Optional(t.String()),
          font: t.Optional(t.String()),
          qr: t.Optional(t.String()),
        }),
      }
    )
    .post(
      "/api/v1/print-multipart",
      async ({ body, set }) => {
        try {
          const title = (body as any)?.title ?? "";
          const content = (body as any)?.body ?? "";
          const font = (body as any)?.font ?? "default";
          const qr = (body as any)?.qr ?? null;
          let imageBuffer: Buffer | null = null;

          const file = (body as any)?.image;
          if (file && typeof file.arrayBuffer === "function") {
            const ab = await file.arrayBuffer();
            imageBuffer = await normalizeImage(Buffer.from(ab), {
              maxHeight: MAX_IMAGE_HEIGHT,
            });
          }

          await printTicket(
            title,
            content,
            imageBuffer,
            { font },
            qr ?? undefined
          );
          return { ok: true };
        } catch (err: any) {
          set.status = 500;
          return { error: err?.message ?? String(err) };
        }
      },
      {
        body: t.Object({
          title: t.String(),
          body: t.String(),
          image: t.Optional(t.Any()),
          font: t.Optional(t.String()),
          qr: t.Optional(t.String()),
        }),
      }
    );
}