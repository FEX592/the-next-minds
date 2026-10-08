import { claimDelivery, finishDelivery, getProgramWebinarDetails, listAcceptedRegistrationsForProgram, listCommunityLinks, listPrograms, listScheduledRules } from "./db.js";
import { DEFAULT_HTML, textToEmailHtml } from "./email.js";
import { ENV } from "./_core/env.js";
import { sendConfiguredEmail } from "./mailer.js";
import { formatProgramDate, resolveCommunity } from "./programs.js";
import { buildMergeValues, isDue, renderMerge, type MergeInput, type MergeValue } from "./scheduled.js";

type RuleEmail = { subject: string; body: string; htmlBody: string | null };

/** Render one rule's email for the given merge values. HTML is wrapped in the branded shell, like every other system email. */
export function renderRuleEmail(rule: RuleEmail, values: Record<string, MergeValue>) {
  const subject = renderMerge(rule.subject, values, "text");
  const text = renderMerge(rule.body, values, "text");
  const inner = rule.htmlBody ? renderMerge(rule.htmlBody, values, "html") : textToEmailHtml(text);
  return { subject, text, html: DEFAULT_HTML(inner) };
}

export type RunSummary = { rules: number; due: number; sent: number; failed: number; skipped: number; truncated: boolean };

/**
 * Sends every reminder / follow-up that is due right now. Safe to call as often as you like:
 * each (rule, registration) is claimed atomically in the database, so nobody gets the same email twice,
 * even if two runs overlap. Work is capped per run so the serverless function finishes in time;
 * anything left over is picked up by the next run while it is still inside its window.
 */
export async function runScheduledEmails(opts: { now?: Date; maxSends?: number; timeBudgetMs?: number } = {}): Promise<RunSummary> {
  const now = opts.now ?? new Date();
  const maxSends = opts.maxSends ?? 30;
  const deadline = Date.now() + (opts.timeBudgetMs ?? 8000);
  const summary: RunSummary = { rules: 0, due: 0, sent: 0, failed: 0, skipped: 0, truncated: false };

  const rules = (await listScheduledRules()).filter(r => r.enabled);
  summary.rules = rules.length;
  if (!rules.length) return summary;
  const [programs, links] = await Promise.all([listPrograms({ publishedOnly: true }), listCommunityLinks({ activeOnly: true })]);

  for (const rule of rules) {
    for (const program of programs) {
      if (!program.startAt || !isDue(rule, { startAt: program.startAt, durationMinutes: program.durationMinutes }, now)) continue;
      summary.due++;
      const [registrants, webinar] = await Promise.all([listAcceptedRegistrationsForProgram(program.id), getProgramWebinarDetails(program.id)]);
      const community = resolveCommunity(program, links);
      for (const reg of registrants) {
        if (summary.sent + summary.failed >= maxSends || Date.now() > deadline) { summary.truncated = true; return summary; }
        const deliveryId = await claimDelivery(rule.id, reg.id);
        if (!deliveryId) { summary.skipped++; continue; }
        try {
          const values = buildMergeValues({ registration: reg, program, joinLink: webinar?.joinLink, recordingUrl: webinar?.recordingUrl, community, rule, appUrl: ENV.publicAppUrl, formatDate: formatProgramDate } satisfies MergeInput);
          const email = renderRuleEmail(rule, values);
          const result = await sendConfiguredEmail({ category: rule.kind, idempotencyKey: `${rule.kind.toLowerCase()}-${rule.id}-${reg.id}`, recipient: reg.email, subject: email.subject, body: email.text, html: email.html, registrationId: reg.id });
          await finishDelivery(deliveryId, result.ok ? { ok: true } : { ok: false, error: result.error });
          result.ok ? summary.sent++ : summary.failed++;
        } catch (error: any) {
          await finishDelivery(deliveryId, { ok: false, error: String(error?.message ?? error) }).catch(() => {});
          summary.failed++;
        }
      }
    }
  }
  return summary;
}
