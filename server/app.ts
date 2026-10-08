import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerLocalAuthRoutes } from "./local-auth.js";
import { registerStorageProxy } from "./_core/storageProxy.js";
import { appRouter } from "./routers.js";
import { ensureDefaults } from "./db.js";
import { createContext } from "./_core/context.js";
import { registerSeoRoutes } from "./seoRoutes.js";
import { runScheduledEmails } from "./scheduledRunner.js";

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

  // Sitemap, robots.txt and per-page <head> tags for shared links / crawlers.
  registerSeoRoutes(app);

  // Scheduled reminders / follow-ups. Call every 5–15 minutes with `Authorization: Bearer $CRON_SECRET`
  // (Vercel Cron sends that header automatically when CRON_SECRET is set; Supabase pg_cron / any pinger can too).
  app.all("/api/cron/reminders", async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) return res.status(503).json({ ok: false, error: "CRON_SECRET is not configured." });
    // Accepts the secret as an Authorization header (Vercel Cron, pg_cron) or as ?key=… for free pingers that can't set headers.
    const expected = Buffer.from(`Bearer ${secret}`);
    const candidates = [String(req.headers.authorization ?? ""), typeof req.query.key === "string" ? `Bearer ${req.query.key}` : ""].filter(Boolean).map(c => Buffer.from(c));
    if (!candidates.some(c => c.length === expected.length && crypto.timingSafeEqual(c, expected))) return res.status(401).json({ ok: false, error: "Unauthorized" });
    try { res.json({ ok: true, ...(await runScheduledEmails()) }); }
    catch (error) { console.error("[cron/reminders]", error); res.status(500).json({ ok: false, error: "Run failed." }); }
  });

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
