import fs from "node:fs";
import path from "node:path";
import type { Express, Response } from "express";
import { ENV } from "./_core/env.js";
import { getPublicProgramBundle, listPrograms } from "./db.js";
import { applyMeta, buildRobots, buildSitemap, DEFAULT_DESCRIPTION, programMeta, SITE_NAME, staticMeta } from "./seo.js";

let templateCache: { html: string; at: number } | null = null;

/** The built index.html: from disk when the host bundles it (Vercel includeFiles / node dist), otherwise from the public site. */
async function getTemplate(): Promise<string | null> {
  if (templateCache && Date.now() - templateCache.at < 5 * 60_000) return templateCache.html;
  const remember = (html: string) => { templateCache = { html, at: Date.now() }; return html; };
  for (const file of [path.resolve(process.cwd(), "dist/public/index.html"), path.resolve(process.cwd(), "public/index.html")]) {
    try { return remember(await fs.promises.readFile(file, "utf-8")); } catch { /* try next */ }
  }
  try {
    const res = await fetch(`${ENV.publicAppUrl}/index.html`);
    if (res.ok) { const html = await res.text(); if (/<\/head>/i.test(html)) return remember(html); }
  } catch { /* fall through */ }
  return null;
}

const sendHtml = (res: Response, status: number, html: string, cache: string) => { res.status(status).set({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": cache }).send(html); };
const PAGE_CACHE = "public, max-age=0, s-maxage=60, stale-while-revalidate=300";

export function registerSeoRoutes(app: Express) {
  app.get("/robots.txt", (_req, res) => { res.type("text/plain").set("Cache-Control", "public, s-maxage=3600").send(buildRobots(ENV.publicAppUrl)); });

  app.get("/sitemap.xml", async (_req, res) => {
    let programs: { slug: string; updatedAt: Date | null }[] = [];
    try { programs = await listPrograms({ publishedOnly: true }); } catch (error) { console.error("[sitemap]", error); }
    res.type("application/xml").set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400").send(buildSitemap(ENV.publicAppUrl, programs));
  });

  // Pages whose social-share tags matter: serve index.html with page-specific <head>. Dev uses Vite's own HTML.
  app.get(["/programs", "/partner", "/contact", "/register"], async (req, res, next) => {
    if (process.env.NODE_ENV === "development") return next();
    const meta = staticMeta(ENV.publicAppUrl, req.path.replace(/\/+$/, "") || "/");
    const template = await getTemplate();
    if (!meta || !template) return template ? sendHtml(res, 200, template, PAGE_CACHE) : res.status(503).set("Retry-After", "30").send("Temporarily unavailable.");
    sendHtml(res, 200, applyMeta(template, meta), PAGE_CACHE);
  });

  app.get("/programs/:slug", async (req, res, next) => {
    if (process.env.NODE_ENV === "development") return next();
    const template = await getTemplate();
    if (!template) return res.status(503).set("Retry-After", "30").send("Temporarily unavailable.");
    const slug = String(req.params.slug);
    let bundle: Awaited<ReturnType<typeof getPublicProgramBundle>> = null;
    try { bundle = await getPublicProgramBundle(slug); }
    catch (error) { console.error("[seo] program lookup failed:", error); return sendHtml(res, 200, template, "no-store"); } // fall back to the default meta, never a broken page
    if (!bundle) return sendHtml(res, 404, applyMeta(template, { title: `Program not found — ${SITE_NAME}`, description: DEFAULT_DESCRIPTION, url: `${ENV.publicAppUrl}/programs/${encodeURIComponent(slug)}`, noindex: true }), "public, s-maxage=30");
    sendHtml(res, 200, applyMeta(template, programMeta(ENV.publicAppUrl, bundle.program)), PAGE_CACHE);
  });
}
