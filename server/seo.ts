// Pure SEO helpers (no DB / env imports): meta-tag injection, sitemap and robots generation.

export type PageMeta = { title: string; description: string; url: string; image?: string; noindex?: boolean; jsonLd?: Record<string, unknown> };

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escXml = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export const SITE_NAME = "THE NEXT MIND";
export const DEFAULT_DESCRIPTION = "Webinars, workshops and courses in AI, technology and creativity for students and young creatives — a free initiative by Coach Jam Digital Solutions under JAM TO THE WORLD.";

export function truncate(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : clean.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

export function absoluteUrl(origin: string, value?: string | null): string | undefined {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  return `${origin}${value.startsWith("/") ? "" : "/"}${value}`;
}

export function metaBlock(m: PageMeta): string {
  const tags = [
    `<meta name="description" content="${esc(m.description)}" />`,
    `<link rel="canonical" href="${esc(m.url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    `<meta property="og:url" content="${esc(m.url)}" />`,
    m.image && `<meta property="og:image" content="${esc(m.image)}" />`,
    `<meta name="twitter:card" content="${m.image ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:title" content="${esc(m.title)}" />`,
    `<meta name="twitter:description" content="${esc(m.description)}" />`,
    m.image && `<meta name="twitter:image" content="${esc(m.image)}" />`,
    m.noindex && `<meta name="robots" content="noindex, nofollow" />`,
    m.jsonLd && `<script type="application/ld+json">${JSON.stringify(m.jsonLd).replace(/</g, "\\u003c")}</script>`,
  ];
  return tags.filter(Boolean).map(t => `    ${t}`).join("\n");
}

/** Replace the template's title/description/OG/Twitter/canonical tags with page-specific ones. */
export function applyMeta(html: string, m: PageMeta): string {
  let out = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(m.title)}</title>`);
  out = out.replace(/<meta\s+(?:name|property)="(?:description|og:[^"]*|twitter:[^"]*|robots)"[^>]*>\s*/gi, "");
  out = out.replace(/<link\s+rel="canonical"[^>]*>\s*/gi, "");
  return out.replace(/<\/head>/i, `${metaBlock(m)}\n  </head>`);
}

export type ProgramSeoInput = {
  slug: string; title: string; shortDescription: string | null; fullDescription: string | null;
  seoTitle: string | null; seoDescription: string | null; seoImageUrl: string | null; coverImageUrl: string | null;
  startAt: Date | null; durationMinutes: number | null; locationOrPlatform: string | null;
};

export function programMeta(origin: string, p: ProgramSeoInput): PageMeta {
  const url = `${origin}/programs/${p.slug}`;
  const description = truncate(p.seoDescription || p.shortDescription || (p.fullDescription ?? "").split("\n")[0] || DEFAULT_DESCRIPTION);
  const image = absoluteUrl(origin, p.seoImageUrl || p.coverImageUrl) ?? `${origin}/next-mind-logo.png`;
  const title = p.seoTitle || `${p.title} — ${SITE_NAME}`;
  let jsonLd: Record<string, unknown> | undefined;
  if (p.startAt) {
    jsonLd = {
      "@context": "https://schema.org", "@type": "Event", name: p.title, description, url, image: [image],
      startDate: p.startAt.toISOString(),
      ...(p.durationMinutes ? { endDate: new Date(p.startAt.getTime() + p.durationMinutes * 60_000).toISOString() } : {}),
      eventStatus: "https://schema.org/EventScheduled",
      ...(p.locationOrPlatform ? { location: { "@type": "Place", name: p.locationOrPlatform } } : {}),
      organizer: { "@type": "Organization", name: "Coach Jam Digital Solutions" },
    };
  }
  return { title, description, url, image, jsonLd };
}

export const STATIC_PAGES: Record<string, { title: string; description: string; noindex?: boolean }> = {
  "/programs": { title: `Programs — ${SITE_NAME}`, description: "Webinars, workshops, courses and challenges for students and young creatives exploring technology, AI and creativity." },
  "/partner": { title: `Partner With Us — ${SITE_NAME}`, description: "Collaborate with THE NEXT MIND: speaking, training, sponsorship, community, content and technology partnerships." },
  "/contact": { title: `Contact — ${SITE_NAME}`, description: "Get in touch with the THE NEXT MIND team." },
  "/register": { title: `Register — ${SITE_NAME}`, description: "Confirm your programs and complete your registration.", noindex: true },
};

export function staticMeta(origin: string, path: string): PageMeta | null {
  const page = STATIC_PAGES[path];
  return page ? { ...page, url: `${origin}${path}`, image: `${origin}/next-mind-logo.png` } : null;
}

export function buildRobots(origin: string): string {
  return ["User-agent: *", "Allow: /", "Disallow: /admin", "Disallow: /auth", "Disallow: /register", "Disallow: /api/", "", `Sitemap: ${origin}/sitemap.xml`, ""].join("\n");
}

export function buildSitemap(origin: string, programs: { slug: string; updatedAt: Date | null }[]): string {
  const url = (loc: string, priority: string, lastmod?: Date | null) =>
    `  <url><loc>${escXml(loc)}</loc>${lastmod ? `<lastmod>${lastmod.toISOString()}</lastmod>` : ""}<priority>${priority}</priority></url>`;
  const entries = [
    url(`${origin}/`, "1.0"), url(`${origin}/programs`, "0.9"), url(`${origin}/partner`, "0.5"), url(`${origin}/contact`, "0.5"),
    ...programs.map(p => url(`${origin}/programs/${encodeURIComponent(p.slug)}`, "0.8", p.updatedAt)),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;
}
