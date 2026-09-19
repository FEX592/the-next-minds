import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerLocalAuthRoutes } from "./local-auth";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import { ensureDefaults } from "./db";
import { createContext } from "./_core/context";

/**
 * Builds the Express app with every route mounted, but does NOT call
 * `.listen()`. This lets the same app run two ways:
 *  - locally / on a persistent host: server/_core/index.ts wraps it in
 *    an http.Server and listens on a port.
 *  - on Vercel: api/index.ts exports it directly as a serverless
 *    function (an Express app is itself a (req, res) handler).
 */
export function createApp() {
  const app = express();

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerStorageProxy(app);
  registerLocalAuthRoutes(app);

  // Seeds default email template / notification preference rows if
  // missing. Fire-and-forget: it's idempotent, so a cold-start request
  // that lands before this resolves just sees the defaults appear a
  // moment later rather than blocking every cold start on it.
  ensureDefaults().catch(err => console.error("[ensureDefaults] failed:", err));

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  return app;
}
