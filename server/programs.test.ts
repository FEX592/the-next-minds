import { describe, expect, it } from "vitest";
import { buildConfirmationEmail, registrationState, resolveCommunity, resolveCommunityMany, toPublicProgram } from "./programs.js";

const base = { status: "UPCOMING" as const, registrationEnabled: true, registrationDeadline: null, publishedAt: new Date("2026-01-01"), archivedAt: null };

describe("registrationState", () => {
  it("is open for a published upcoming program", () => expect(registrationState(base)).toEqual({ open: true }));
  it("closes for unpublished or archived", () => {
    expect(registrationState({ ...base, publishedAt: null })).toEqual({ open: false, reason: "unavailable" });
    expect(registrationState({ ...base, archivedAt: new Date() })).toEqual({ open: false, reason: "unavailable" });
  });
  it("closes when disabled, completed, or past deadline", () => {
    expect(registrationState({ ...base, registrationEnabled: false })).toEqual({ open: false, reason: "disabled" });
    expect(registrationState({ ...base, status: "COMPLETED" })).toEqual({ open: false, reason: "completed" });
    expect(registrationState({ ...base, registrationDeadline: new Date("2026-02-01") }, new Date("2026-03-01"))).toEqual({ open: false, reason: "deadline_passed" });
  });
});

describe("resolveCommunity", () => {
  const links = [{ platform: "whatsapp", url: "https://wa/site", isActive: true }, { platform: "telegram", url: "https://t/off", isActive: false }];
  it("falls back to site links and skips inactive ones", () => expect(resolveCommunity({ whatsappLinkOverride: null, telegramLinkOverride: null }, links)).toEqual({ whatsapp: "https://wa/site", telegram: undefined }));
  it("prefers per-program overrides", () => expect(resolveCommunity({ whatsappLinkOverride: "https://wa/x", telegramLinkOverride: "https://t/x" }, links)).toEqual({ whatsapp: "https://wa/x", telegram: "https://t/x" }));
});

describe("toPublicProgram", () => {
  it("drops internal fields", () => expect(Object.keys(toPublicProgram({ id: 1, createdBy: 2, updatedBy: 3, whatsappLinkOverride: "x", telegramLinkOverride: "y", title: "t" }))).toEqual(["id", "title"]));
});

describe("resolveCommunityMany", () => {
  it("dedupes and merges overrides", () => {
    const links = [{ platform: "whatsapp", url: "https://wa/site", isActive: true }];
    const r = resolveCommunityMany([{ whatsappLinkOverride: null, telegramLinkOverride: "https://t/a" }, { whatsappLinkOverride: null, telegramLinkOverride: "https://t/a" }, { whatsappLinkOverride: "https://wa/x", telegramLinkOverride: null }], links);
    expect(r).toEqual({ whatsapp: ["https://wa/site", "https://wa/x"], telegram: ["https://t/a"] });
  });
});

describe("buildConfirmationEmail", () => {
  const prog = { title: "T", startAt: new Date("2026-10-10T15:00:00Z"), durationMinutes: 60, locationOrPlatform: "Zoom" };
  it("single program", () => {
    const { subject, body } = buildConfirmationEmail({ firstName: "Ada", programs: [prog], whatsapp: ["https://wa/x"], telegram: ["https://t/x"] });
    expect(subject).toBe("You're registered: T");
    expect(body).toContain("Ada");
    expect(body).toContain("16:00");
    expect(body).toContain("https://wa/x");
    expect(body).toContain("https://t/x");
  });
  it("multiple programs", () => {
    const { subject, body } = buildConfirmationEmail({ firstName: "Ada", programs: [prog, { ...prog, title: "U", joinLink: "https://join" }], whatsapp: [], telegram: [] });
    expect(subject).toBe("You're registered for 2 NEXT MIND programs");
    expect(body).toContain("📌 T");
    expect(body).toContain("📌 U");
    expect(body).toContain("https://join");
  });
});
