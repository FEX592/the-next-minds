// Pure helpers for reminder / follow-up emails (no DB / env imports so they stay unit-testable).

export type RuleKind = "REMINDER" | "FOLLOW_UP";
export type RuleTiming = { kind: RuleKind; offsetMinutes: number };
export type ProgramTiming = { startAt: Date; durationMinutes: number | null };

export function humanizeMinutes(minutes: number): string {
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  if (minutes % 1440 === 0 && minutes >= 2880) return plural(minutes / 1440, "day");
  if (minutes % 60 === 0) return plural(minutes / 60, "hour");
  if (minutes > 60) return `${plural(Math.floor(minutes / 60), "hour")} ${plural(minutes % 60, "minute")}`;
  return plural(minutes, "minute");
}

export const describeRule = (r: RuleTiming) => `${humanizeMinutes(r.offsetMinutes)} ${r.kind === "REMINDER" ? "before the program starts" : "after the program ends"}`;

/** When the email becomes due: start − offset (reminder) or end + offset (follow-up). */
export function triggerTime(rule: RuleTiming, program: ProgramTiming): Date {
  const start = program.startAt.getTime();
  if (rule.kind === "REMINDER") return new Date(start - rule.offsetMinutes * 60_000);
  return new Date(start + (program.durationMinutes ?? 0) * 60_000 + rule.offsetMinutes * 60_000);
}

/** How late a send may still go out. Stops a "24 hours before" email firing at 3 hours before if the scheduler was down. */
export function toleranceMinutes(rule: RuleTiming): number {
  return rule.kind === "REMINDER" ? Math.min(120, Math.max(15, Math.floor(rule.offsetMinutes / 2))) : 48 * 60;
}

export function isDue(rule: RuleTiming, program: ProgramTiming, now: Date): boolean {
  const t = triggerTime(rule, program).getTime();
  const n = now.getTime();
  if (n < t || n - t > toleranceMinutes(rule) * 60_000) return false;
  if (rule.kind === "REMINDER" && n >= program.startAt.getTime()) return false;
  return true;
}

export type MergeValue = string | { text: string; html: string };
const escapeHtml = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
const linkify = (escaped: string) => escaped.replace(/https?:\/\/[^\s<]+/g, url => `<a href="${url}" style="color:#f6cf64;">${url}</a>`);
const block = (lines: (string | false | null | undefined)[]): MergeValue => {
  const kept = lines.filter(Boolean) as string[];
  return { text: kept.join("\n"), html: kept.map(l => linkify(escapeHtml(l))).join("<br>") };
};

/** Replace {{tokens}}; unknown tokens are left as written. HTML mode escapes plain values. */
export function renderMerge(source: string, values: Record<string, MergeValue>, mode: "text" | "html"): string {
  return source.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    if (!(key in values)) return match;
    const v = values[key];
    return typeof v === "string" ? (mode === "html" ? escapeHtml(v) : v) : v[mode];
  });
}

export type MergeInput = {
  registration: { firstName: string; lastName: string; email: string; school: string; classLevel: string; country: string; normalizedWhatsapp: string };
  program: { title: string; slug: string; startAt: Date | null; durationMinutes: number | null; locationOrPlatform: string | null; takeawayCourseTitle: string | null; takeawayCourseUrl: string | null };
  joinLink?: string | null; recordingUrl?: string | null;
  community: { whatsapp?: string; telegram?: string };
  rule: RuleTiming; appUrl: string; formatDate: (d: Date | null) => string | undefined;
};

export function buildMergeValues(i: MergeInput): Record<string, MergeValue> {
  const { registration: r, program: p, community: c } = i;
  const when = i.formatDate(p.startAt);
  const programUrl = `${i.appUrl}/programs/${p.slug}`;
  return {
    firstName: r.firstName, lastName: r.lastName, fullName: `${r.firstName} ${r.lastName}`, school: r.school, classLevel: r.classLevel, country: r.country, email: r.email, whatsapp: r.normalizedWhatsapp,
    programTitle: p.title, programUrl, programDate: when ?? "", platform: p.locationOrPlatform ?? "", joinLink: i.joinLink ?? "", recordingUrl: i.recordingUrl ?? "",
    courseTitle: p.takeawayCourseTitle ?? "", courseUrl: p.takeawayCourseUrl ?? "", whatsappLink: c.whatsapp ?? "", telegramLink: c.telegram ?? "",
    timeUntil: humanizeMinutes(i.rule.offsetMinutes),
    programDetails: block([when && `🗓 ${when}`, p.durationMinutes ? `⏱ ${p.durationMinutes} minutes` : null, p.locationOrPlatform && `📍 ${p.locationOrPlatform}`, i.joinLink ? `🔗 Join link: ${i.joinLink}` : `🔗 Details: ${programUrl}`]),
    communityLinks: block([c.whatsapp && `👥 WhatsApp community: ${c.whatsapp}`, c.telegram && `💬 Telegram community: ${c.telegram}`]),
    followUpDetails: block([i.recordingUrl && `▶️ Watch the recording: ${i.recordingUrl}`, p.takeawayCourseTitle && `🎓 Next step: ${p.takeawayCourseTitle}${p.takeawayCourseUrl ? ` — ${p.takeawayCourseUrl}` : ""}`, `🔗 Program page: ${programUrl}`]),
  };
}
