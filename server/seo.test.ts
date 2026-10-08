import { describe, expect, it } from "vitest";
import { applyMeta, buildRobots, buildSitemap, programMeta, staticMeta, truncate } from "./seo.js";

const template = `<!doctype html><html><head><title>Old</title><meta name="description" content="old" /><meta property="og:title" content="old" /><meta name="twitter:card" content="summary" /><meta name="viewport" content="x" /></head><body></body></html>`;
const program = { slug: "a-b", title: 'Talk "AI" <live>', shortDescription: "Short", fullDescription: null, seoTitle: null, seoDescription: null, seoImageUrl: null, coverImageUrl: "/cover.png", startAt: new Date("2026-10-10T15:00:00Z"), durationMinutes: 60, locationOrPlatform: "Telegram" };

describe("seo", () => {
  it("replaces old tags, escapes values and keeps unrelated tags", () => {
    const html = applyMeta(template, programMeta("https://x.test", program));
    expect(html).toContain("<title>Talk &quot;AI&quot; &lt;live&gt; — THE NEXT MIND</title>");
    expect(html.match(/og:title/g)?.length).toBe(1);
    expect(html).toContain('name="viewport"');
    expect(html).toContain('property="og:image" content="https://x.test/cover.png"');
    expect(html).toContain('rel="canonical" href="https://x.test/programs/a-b"');
    expect(html).toContain('"@type":"Event"');
    expect(html).toContain('"endDate":"2026-10-10T16:00:00.000Z"');
  });
  it("noindex for register, none for programs", () => {
    expect(applyMeta(template, staticMeta("https://x.test", "/register")!)).toContain("noindex");
    expect(applyMeta(template, staticMeta("https://x.test", "/programs")!)).not.toContain("noindex");
    expect(staticMeta("https://x.test", "/nope")).toBeNull();
  });
  it("sitemap and robots", () => {
    const xml = buildSitemap("https://x.test", [{ slug: "a-b", updatedAt: new Date("2026-01-02T00:00:00Z") }]);
    expect(xml).toContain("<loc>https://x.test/programs/a-b</loc>");
    expect(xml).toContain("<lastmod>2026-01-02T00:00:00.000Z</lastmod>");
    const robots = buildRobots("https://x.test");
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Sitemap: https://x.test/sitemap.xml");
  });
  it("truncates on word boundaries", () => expect(truncate("word ".repeat(60), 40).length).toBeLessThanOrEqual(40));
});
