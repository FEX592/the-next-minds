import { describe, expect, it } from "vitest";
import { buildMergeValues, humanizeMinutes, isDue, renderMerge, triggerTime } from "./scheduled.js";

const start = new Date("2026-10-10T15:00:00Z");
const program = { startAt: start, durationMinutes: 60 };
const min = (m: number) => new Date(start.getTime() + m * 60_000);

describe("scheduling", () => {
  it("humanizes offsets", () => {
    expect(humanizeMinutes(1440)).toBe("24 hours");
    expect(humanizeMinutes(60)).toBe("1 hour");
    expect(humanizeMinutes(30)).toBe("30 minutes");
    expect(humanizeMinutes(2880)).toBe("2 days");
    expect(humanizeMinutes(90)).toBe("1 hour 30 minutes");
  });
  it("24h reminder fires in its window only", () => {
    const rule = { kind: "REMINDER" as const, offsetMinutes: 1440 };
    expect(triggerTime(rule, program).toISOString()).toBe("2026-10-09T15:00:00.000Z");
    expect(isDue(rule, program, min(-1441))).toBe(false);
    expect(isDue(rule, program, min(-1440))).toBe(true);
    expect(isDue(rule, program, min(-1440 + 119))).toBe(true);
    expect(isDue(rule, program, min(-1440 + 121))).toBe(false); // too late: would say "24 hours" when it's under 22
  });
  it("1h reminder never fires once the program started", () => {
    const rule = { kind: "REMINDER" as const, offsetMinutes: 60 };
    expect(isDue(rule, program, min(-60))).toBe(true);
    expect(isDue(rule, program, min(-29))).toBe(false);
    expect(isDue(rule, program, min(5))).toBe(false);
  });
  it("follow-up fires after the end", () => {
    const rule = { kind: "FOLLOW_UP" as const, offsetMinutes: 1440 };
    expect(triggerTime(rule, program).toISOString()).toBe("2026-10-11T16:00:00.000Z");
    expect(isDue(rule, program, min(60 + 1439))).toBe(false);
    expect(isDue(rule, program, min(60 + 1440))).toBe(true);
    expect(isDue(rule, program, min(60 + 1440 + 49 * 60))).toBe(false);
  });
});

describe("merge fields", () => {
  const values = buildMergeValues({
    registration: { firstName: "Ada <b>", lastName: "O", email: "a@x.t", school: "S", classLevel: "SS1", country: "Nigeria", normalizedWhatsapp: "+234" },
    program: { title: "T & Co", slug: "t", startAt: start, durationMinutes: 60, locationOrPlatform: "Zoom", takeawayCourseTitle: null, takeawayCourseUrl: null },
    joinLink: "https://join.test/a?x=1&y=2", community: { whatsapp: "https://wa.test/g" },
    rule: { kind: "REMINDER", offsetMinutes: 1440 }, appUrl: "https://app.test", formatDate: d => (d ? "DATE" : undefined),
  });
  it("text mode is raw, html mode escapes and links", () => {
    expect(renderMerge("Hi {{firstName}} {{unknown}}", values, "text")).toBe("Hi Ada <b> {{unknown}}");
    expect(renderMerge("Hi {{firstName}}", values, "html")).toBe("Hi Ada &lt;b&gt;");
    const html = renderMerge("{{programDetails}}", values, "html");
    expect(html).toContain('<a href="https://join.test/a?x=1&amp;y=2"');
    expect(html).toContain("<br>");
  });
  it("blocks skip missing pieces", () => {
    expect(renderMerge("{{communityLinks}}", values, "text")).toBe("👥 WhatsApp community: https://wa.test/g");
    expect(renderMerge("{{timeUntil}}", values, "text")).toBe("24 hours");
  });
});
