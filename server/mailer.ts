import { and, desc, eq } from "drizzle-orm";
import { createNotification, getConfig, getDb, updateEmailLog } from "./db.js";
import { sendEmail } from "./email.js";
import { emailLogs } from "../drizzle/schema.js";

export async function sendConfiguredEmail(input: { category: string; idempotencyKey?: string; recipient: string; subject: string; body: string; html: string; adminId?: number; registrationId?: number; media?: Array<{ fileUrl: string; filename: string; mimeType: string; contentId?: string | null; placement: "INLINE" | "ATTACHMENT" }>; retryOf?: number }) {
  const config = (await getConfig())?.config;
  const db = await getDb();
  const from = config ? `${config.senderName} <${config.senderEmail}>` : "";
  if (!db) return { ok: false as const, error: "Database unavailable." };
  // Registration-scoped sends (acceptance emails) have a natural stable identity —
  // "the acceptance email for this registration" — so they get real dedup
  // protection against double-submission. Manual sends (general broadcasts, test
  // emails) have no such identity; each click is intentionally a new, distinct
  // send, so they're never deduped against one another.
  const idempotencyKey = input.idempotencyKey ?? (input.registrationId && (input.category === "ACCEPTANCE" || input.category === "CONFIRMATION") ? `${input.category === "ACCEPTANCE" ? "accept" : "confirm"}-${input.registrationId}` : null);
  if (idempotencyKey) {
    const alreadySent = await db.select().from(emailLogs).where(and(eq(emailLogs.idempotencyKey, idempotencyKey), eq(emailLogs.status, "SENT"))).limit(1);
    if (alreadySent[0]) return { ok: true as const, id: alreadySent[0].providerMessageId ?? String(alreadySent[0].id) };
  }
  const logValues = { recipient: input.recipient, emailType: input.category, subject: input.subject, registrationId: input.registrationId, status: "SENDING" as const, sentBy: input.adminId, retryOf: input.retryOf, idempotencyKey };
  await db.insert(emailLogs).values(logValues);
  const log = await db.select().from(emailLogs).where(and(eq(emailLogs.recipient, input.recipient), eq(emailLogs.subject, input.subject))).orderBy(desc(emailLogs.id)).limit(1);
  const result = await sendEmail({ from, replyTo: config?.replyTo, to: [input.recipient], subject: input.subject, text: input.body, html: input.html, media: input.media });
  if (result.ok) { if (log[0]) await updateEmailLog(log[0].id, { status: "SENT", providerMessageId: result.id }); return { ok: true as const, id: result.id }; }
  if (log[0]) await updateEmailLog(log[0].id, { status: "FAILED", failureReason: result.error });
  await createNotification("Email delivery failed", `${input.category} email to ${input.recipient} failed: ${result.error}`, input.registrationId, "emailFailure");
  return result;
}
