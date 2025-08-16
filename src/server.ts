import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { staticPlugin } from "@elysiajs/static";
import { PRINTER_ADDR } from "./config";
import { mountPrintRoutes } from "./routes/print";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export function createServer() {
  const app = new Elysia();
  app.use(swagger());

  // API first
  app.get("/api/v1/health", () => ({ ok: true, printer: PRINTER_ADDR }));
  mountPrintRoutes(app);

  // Serve SPA if built
  const assetsDir = resolve(process.cwd(), "web", "dist");
  if (existsSync(assetsDir)) {
    app.use(
      staticPlugin({
        assets: assetsDir,
        prefix: "/", // site root
        indexHTML: true, // send index.html for unknown paths
      })
    );
  } else {
    console.warn(
      "[warn] web/dist not found - API only. Run: bun run build:web"
    );
  }

  return app;
}
if(process.env.TEST){
  console.log("env loaded");
}

if (import.meta.main) {
  const app = createServer();
  const port = Number(process.env.PORT || 8080);
  const host = process.env.HOST || "0.0.0.0";
  app.listen({port, hostname: host});
  console.log(`Server listening on http://${host}:${port}`);
}
