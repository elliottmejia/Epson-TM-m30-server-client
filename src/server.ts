import { Elysia } from "elysia";
import { staticPlugin } from "@elysiajs/static";
import { PRINTER_ADDR } from "./config";
import { mountPrintRoutes } from "./routes/print";

// Create the server
export function createServer() {
  const app = new Elysia();

  // Health route
  app.get("/api/v1/health", () => ({
    ok: true,
    printer: PRINTER_ADDR,
  }));

  app.use(
    staticPlugin({
      assets: "web/dist",
      prefix: "/",
      indexHTML: true,
    })
  );

  // Mount routes
  mountPrintRoutes(app);



  return app;
}

if (import.meta.main) {
  const app = createServer();
  const port = Number(process.env.PORT || 3000);
  app.listen(port);
  console.log(`Elysia server listening on http://localhost:${port}`);
}
