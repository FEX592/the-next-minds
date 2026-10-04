import crypto from "node:crypto";
import { and, desc, eq, gt, isNull, inArray, ne, or, like } from "drizzle-orm";
import { z } from "zod";
import { getCountries, getCountryCallingCode } from "libphonenumber-js";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies.js";
import { systemRouter } from "./_core/systemRouter.js";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc.js";
import { createAudit, createContactSubmission, createEmailLog, createNotification, createPartnershipRequest, createProgram, createSpeaker, deleteCommunityLink, deleteContactSubmission, deletePartnershipRequest, getInboxCounts, listContactSubmissions, listPartnershipRequests, listRegistrationsForExport, recentSubmissionCount, updateContactSubmissionStatus, updatePartnershipRequest, deleteRegistration, deleteSpeaker, ensureDefaults, getConfig, getDb, getEmailMedia, getProgramById, getProgramSpeakers, getProgramWebinarDetails, getPublicProgramBundle, getRegistration, getSiteSettings, getStats, listCommunityLinks, listPrograms, listRegistrations, listSpeakers, setProgramSpeakers, updateEmailLog, updateLocalAccount, updateProgram, updateSiteSettings, updateSpeaker, upsertCommunityLink, upsertProgramWebinarDetails } from "./db.js";
import { buildConfirmationEmail, REGISTRATION_CLOSED_MESSAGE, registrationState, resolveCommunity, toPublicProgram } from "./programs.js";
import { DEFAULT_BODY, DEFAULT_HTML, DEFAULT_SUBJECT, renderTemplate, sendEmail, textToEmailHtml } from "./email.js";
import { hashPassword, verifyPassword } from "./local-auth.js";
import { ENV } from "./_core/env.js";
import { adminInvites, emailConfig, emailLogs, emailMedia, emailTemplates, notificationPreferences, notifications, registrations, users } from "../drizzle/schema.js";
import { storagePut } from "./storage.js";
import { sniffImage } from "./image.js";

const tailoredLevels: Record<string, string[]> = { Nigeria: ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3", "University / undergraduate", "Graduate / postgraduate"], Ghana: ["Basic 7", "Basic 8", "Basic 9", "SHS 1", "SHS 2", "SHS 3", "University / undergraduate", "Graduate / postgraduate"], "United Kingdom": ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Sixth Form", "University / undergraduate", "Graduate / postgraduate"], "United States": ["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12", "University / undergraduate", "Graduate / postgraduate"] };
const genericLevels = ["Middle school", "High school", "University / undergraduate", "Graduate / postgraduate", "Apprentice / vocational", "Other"];
const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
const flagFor = (code: string) => code.replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
const countries = getCountries().map(code => ({ name: displayNames.of(code) || code, isoCode: code, code: `+${getCountryCallingCode(code)}`, flag: flagFor(code) })).filter((country, index, list) => list.findIndex(item => item.name === country.name && item.code === country.code) === index).sort((a, b) => a.name.localeCompare(b.name));
const levels: Record<string, string[]> = Object.fromEntries(countries.map(country => [country.name, tailoredLevels[country.name] ?? genericLevels]));
const ACCEPTANCE_DEFAULT: { id?: number; category: "ACCEPTANCE"; subject: string; body: string; htmlBody: string; groupLink: string; channelLink: string } = { category: "ACCEPTANCE" as const, subject: DEFAULT_SUBJECT, body: DEFAULT_BODY, htmlBody: DEFAULT_HTML(textToEmailHtml(DEFAULT_BODY.replace("{{groupLink}}", "https://chat.whatsapp.com/JCX4hLJol0sDbzH4PpJGms?s=cl&p=a&mlu=4&ilr=4").replace("{{channelLink}}", "https://whatsapp.com/channel/0029VbD8HWH6mYPIo9ONqD1c"))), groupLink: "https://chat.whatsapp.com/JCX4hLJol0sDbzH4PpJGms?s=cl&p=a&mlu=4&ilr=4", channelLink: "https://whatsapp.com/channel/0029VbD8HWH6mYPIo9ONqD1c" };
const emailCategory = z.enum(["ACCEPTANCE", "GENERAL"]);
const adminOnly = adminProcedure;

function htmlForTemplate(template: { body: string; htmlBody?: string | null; groupLink?: string | null; channelLink?: string | null }, values: Record<string, string | undefined>) {
  const body = renderTemplate(template.body || "", { ...values, groupLink: template.groupLink ?? "", channelLink: template.channelLink ?? "" });
  const html = template.htmlBody ? renderTemplate(template.htmlBody, { ...values, groupLink: template.groupLink ?? "", channelLink: template.channelLink ?? "" }) : DEFAULT_HTML(textToEmailHtml(body));
  return { body, html };
}
async function sendConfiguredEmail(input: { category: string; recipient: string; subject: string; body: string; html: string; adminId?: number; registrationId?: number; media?: Array<{ fileUrl: string; filename: string; mimeType: string; contentId?: string | null; placement: "INLINE" | "ATTACHMENT" }>; retryOf?: number }) {
  const config = (await getConfig())?.config;
  const db = await getDb();
  const from = config ? `${config.senderName} <${config.senderEmail}>` : "";
  if (!db) return { ok: false as const, error: "Database unavailable." };
  // Registration-scoped sends (acceptance emails) have a natural stable identity —
  // "the acceptance email for this registration" — so they get real dedup
  // protection against double-submission. Manual sends (general broadcasts, test
  // emails) have no such identity; each click is intentionally a new, distinct
  // send, so they're never deduped against one another.
  const idempotencyKey = input.registrationId && (input.category === "ACCEPTANCE" || input.category === "CONFIRMATION") ? `${input.category === "ACCEPTANCE" ? "accept" : "confirm"}-${input.registrationId}` : null;
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

const isUniqueViolation = (error: any) => error?.code === "23505" || error?.cause?.code === "23505" || String(error?.message ?? "").toLowerCase().includes("duplicate");
const slugSchema = z.string().trim().min(1).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only.");
const optText = (max: number) => z.string().max(max).nullable();
const optUrl = (max: number) => z.string().url().max(max).nullable();
const programTypeInput = z.enum(["WEBINAR", "WORKSHOP", "COURSE", "CHALLENGE", "TRAINING", "COMMUNITY_INITIATIVE", "OTHER"]);
const programStatusInput = z.enum(["UPCOMING", "ONGOING", "COMPLETED"]);
const programFields = {
  slug: slugSchema, title: z.string().trim().min(1).max(240), shortDescription: z.string().nullable(), fullDescription: z.string().nullable(), coverImageUrl: optUrl(700),
  type: programTypeInput, status: programStatusInput, startAt: z.date().nullable(), durationMinutes: z.number().int().positive().nullable(), locationOrPlatform: optText(240),
  whatParticipantsWillLearn: z.string().nullable(), whoItsFor: z.string().nullable(), registrationEnabled: z.boolean(), registrationDeadline: z.date().nullable(), registrationCtaLabel: optText(80),
  additionalResources: z.string().nullable(), whatsappLinkOverride: optUrl(500), telegramLinkOverride: optUrl(500), takeawayCourseTitle: optText(240), takeawayCourseUrl: optUrl(700),
  seoTitle: optText(240), seoDescription: optText(400), seoImageUrl: optUrl(700),
};
const programCreateInput = z.object(programFields).partial().required({ slug: true, title: true });
const programUpdateInput = z.object(programFields).partial().extend({ id: z.number().int().positive() });
const speakerFields = { name: z.string().trim().min(1).max(160), photoUrl: z.string().url().max(700), role: z.string().max(160), bio: z.string(), socialLinks: z.string(), website: z.string().url().max(500) };

async function sendProgramConfirmation(program: NonNullable<Awaited<ReturnType<typeof getProgramById>>>, reg: { id: number; firstName: string; email: string }) {
  const [webinar, links] = await Promise.all([getProgramWebinarDetails(program.id), listCommunityLinks({ activeOnly: true })]);
  const community = resolveCommunity(program, links);
  const { subject, body } = buildConfirmationEmail({ firstName: reg.firstName, program, joinLink: webinar?.joinLink, ...community });
  const result = await sendConfiguredEmail({ category: "CONFIRMATION", recipient: reg.email, subject, body, html: DEFAULT_HTML(textToEmailHtml(body)), registrationId: reg.id });
  return { sent: result.ok, community };
}

const PARTNERSHIP_TYPES = ["SPEAKING", "TRAINING", "SPONSORSHIP", "COMMUNITY_PARTNERSHIP", "CONTENT_COLLABORATION", "TECHNOLOGY_PARTNERSHIP", "OTHER"] as const;
const PARTNERSHIP_LABEL: Record<(typeof PARTNERSHIP_TYPES)[number], string> = { SPEAKING: "Speaking", TRAINING: "Training", SPONSORSHIP: "Sponsorship", COMMUNITY_PARTNERSHIP: "Community partnership", CONTENT_COLLABORATION: "Content collaboration", TECHNOLOGY_PARTNERSHIP: "Technology partnership", OTHER: "Other" };
const TOO_MANY = "You've sent several messages recently. Please try again a little later.";
const optionalLink = z.string().trim().max(500).optional().transform(v => (v ? (/^https?:\/\//i.test(v) ? v : `https://${v}`) : undefined)).pipe(z.string().url().optional());
const emptyToUndef = (max: number) => z.string().trim().max(max).optional().transform(v => v || undefined);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const options = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...options, maxAge: -1 }); return { success: true } as const; }),
    updateAccount: protectedProcedure.input(z.object({ name: z.string().trim().min(1).max(160), email: z.string().email().max(320) })).mutation(async ({ ctx, input }) => { const existing = await getDb().then(db => db ? db.select().from(users).where(and(eq(users.email, input.email.toLowerCase()), ne(users.id, ctx.user.id))).limit(1) : []); if (existing?.[0]) throw new Error("That email address is already in use"); return updateLocalAccount(ctx.user.id, { name: input.name, email: input.email.toLowerCase() }); }),
    changePassword: protectedProcedure.input(z.object({ currentPassword: z.string().min(8), newPassword: z.string().min(8).max(200) })).mutation(async ({ ctx, input }) => { if (!ctx.user.passwordHash || !verifyPassword(input.currentPassword, ctx.user.passwordHash)) throw new Error("Current password is incorrect"); await updateLocalAccount(ctx.user.id, { passwordHash: hashPassword(input.newPassword) }); return { success: true }; }),
  }),
  public: router({
    countries: publicProcedure.query(() => countries),
    levels: publicProcedure.input(z.object({ country: z.string() })).query(({ input }) => levels[input.country] ?? []),
    register: publicProcedure.input(z.object({ programId: z.number().int().positive().optional(), firstName: z.string().trim().min(1).max(120), lastName: z.string().trim().min(1).max(120), country: z.string(), countryCode: z.string(), whatsappNumber: z.string().min(5).max(40), classLevel: z.string(), school: z.string().trim().min(2).max(240), email: z.string().trim().email().max(320) })).mutation(async ({ input }) => {
      const db = await getDb(); if (!db) throw new Error("Registration service is unavailable");
      const validCountry = countries.find(c => c.name === input.country && c.code === input.countryCode);
      if (!validCountry || !(levels[input.country] ?? []).includes(input.classLevel)) throw new Error("Please check your country and class selection.");
      const { programId, ...person } = input;
      const program = programId ? await getProgramById(programId, { publishedOnly: true }) : null;
      if (programId) {
        if (!program) throw new Error(REGISTRATION_CLOSED_MESSAGE.unavailable);
        const gate = registrationState(program);
        if (!gate.open) throw new Error(REGISTRATION_CLOSED_MESSAGE[gate.reason]);
      }
      const digits = input.whatsappNumber.replace(/\D/g, "");
      const normalized = input.countryCode + digits.replace(/^0+/, "");
      const email = input.email.toLowerCase();
      let created: { id: number } | undefined;
      try {
        // Program registrations are confirmed immediately (PRD flow); the legacy no-program flow keeps manual review.
        const rows = await db.insert(registrations).values({ ...person, email, programId: program?.id ?? null, whatsappNumber: digits, normalizedWhatsapp: normalized, status: program ? "ACCEPTED" : "PENDING", reviewedAt: program ? new Date() : null }).returning({ id: registrations.id });
        created = rows[0];
      } catch (error: any) {
        if (isUniqueViolation(error)) throw new Error(program ? "You are already registered for this program." : "A registration with these contact details already exists.");
        throw new Error("We couldn't save your registration. Please try again.");
      }
      await createNotification("New registration received", `New registration from ${input.firstName} ${input.lastName}${program ? ` for ${program.title}` : ""}.`, created?.id, "newRegistration").catch(() => {});
      if (!program || !created) return { success: true as const, program: null, emailSent: false, community: {} as { whatsapp?: string; telegram?: string } };
      const confirmation = await sendProgramConfirmation(program, { id: created.id, firstName: input.firstName, email }).catch(() => ({ sent: false, community: {} as { whatsapp?: string; telegram?: string } }));
      return { success: true as const, program: { title: program.title, slug: program.slug }, emailSent: confirmation.sent, community: confirmation.community };
    }),
    partnership: publicProcedure.input(z.object({ fullName: z.string().trim().min(2).max(160), email: z.string().trim().email().max(320), organization: emptyToUndef(240), phone: emptyToUndef(40), partnershipType: z.enum(PARTNERSHIP_TYPES), message: z.string().trim().min(20, "Please tell us a little more (at least 20 characters).").max(5000), link: optionalLink, hp: z.string().optional() })).mutation(async ({ input }) => {
      if (input.hp) return { success: true as const }; // honeypot: bots fill hidden fields
      const email = input.email.toLowerCase();
      if ((await recentSubmissionCount("partnership", email)) >= 3) throw new Error(TOO_MANY);
      const { hp, ...values } = input;
      try { await createPartnershipRequest({ ...values, email }); } catch { throw new Error("We couldn't send your request. Please try again."); }
      await createNotification("New partnership request", `${input.fullName}${input.organization ? ` (${input.organization})` : ""} — ${PARTNERSHIP_LABEL[input.partnershipType]}`, undefined, "adminEvents").catch(() => {});
      return { success: true as const };
    }),
    contact: publicProcedure.input(z.object({ name: z.string().trim().min(2).max(160), email: z.string().trim().email().max(320), subject: z.string().trim().min(2).max(240), message: z.string().trim().min(10, "Please write a few more words.").max(5000), hp: z.string().optional() })).mutation(async ({ input }) => {
      if (input.hp) return { success: true as const };
      const email = input.email.toLowerCase();
      if ((await recentSubmissionCount("contact", email)) >= 3) throw new Error(TOO_MANY);
      try { await createContactSubmission({ name: input.name, email, subject: input.subject, message: input.message }); } catch { throw new Error("We couldn't send your message. Please try again."); }
      await createNotification("New contact message", `${input.name}: ${input.subject}`, undefined, "adminEvents").catch(() => {});
      return { success: true as const };
    }),
    programs: publicProcedure.input(z.object({ type: programTypeInput.optional(), status: programStatusInput.optional() }).optional()).query(async ({ input }) => {
      const rows = await listPrograms({ publishedOnly: true, ...input });
      return rows.map(p => ({ ...toPublicProgram(p), registrationOpen: registrationState(p).open }));
    }),
    program: publicProcedure.input(z.object({ slug: z.string().min(1).max(160) })).query(async ({ input }) => {
      const bundle = await getPublicProgramBundle(input.slug);
      if (!bundle) return null;
      const { program, webinar, speakers, links } = bundle;
      const gate = registrationState(program);
      return {
        program: { ...toPublicProgram(program), registrationOpen: gate.open, registrationClosedMessage: gate.open ? null : REGISTRATION_CLOSED_MESSAGE[gate.reason] },
        // Join link only while live, recording only once completed — upcoming join links go out via the confirmation email.
        webinar: webinar ? { subtitle: webinar.subtitle, highlights: webinar.highlights, joinLink: program.status === "ONGOING" ? webinar.joinLink : null, recordingUrl: program.status === "COMPLETED" ? webinar.recordingUrl : null } : null,
        speakers: speakers.filter(x => x.speaker).map(x => ({ topic: x.topic, displayOrder: x.displayOrder, ...x.speaker! })),
        community: resolveCommunity(program, links),
      };
    }),
    communityLinks: publicProcedure.query(async () => (await listCommunityLinks({ activeOnly: true })).map(({ key, label, platform, url, description }) => ({ key, label, platform, url, description }))),
    siteSettings: publicProcedure.query(async () => {
      const settings = await getSiteSettings();
      const featured = settings?.featuredProgramId ? await getProgramById(settings.featuredProgramId, { publishedOnly: true }) : null;
      return { heroHeadline: settings?.heroHeadline ?? null, heroSubheadline: settings?.heroSubheadline ?? null, aboutShortText: settings?.aboutShortText ?? null, featuredProgram: featured ? { ...toPublicProgram(featured), registrationOpen: registrationState(featured).open } : null };
    }),
  }),
  admin: router({
    uploadImage: adminOnly.input(z.object({ folder: z.enum(["speakers", "programs", "seo"]), filename: z.string().min(1).max(240), dataBase64: z.string().max(4_400_000) })).mutation(async ({ ctx, input }) => {
      const raw = Buffer.from(input.dataBase64.replace(/^data:[^;]+;base64,/, ""), "base64");
      if (raw.length > 3 * 1024 * 1024) throw new Error("Image must be 3 MB or smaller.");
      const type = sniffImage(raw);
      if (!type) throw new Error("Upload a PNG, JPEG or WebP image.");
      const base = input.filename.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 60) || "image";
      const stored = await storagePut(`site-images/${input.folder}/${base}.${type.ext}`, raw, type.mime);
      await createAudit(`Uploaded image ${stored.key}`, ctx.user.id);
      return { url: stored.url };
    }),

    partnerships: adminOnly.input(z.object({ status: z.enum(["NEW", "IN_REVIEW", "ACCEPTED", "DECLINED", "ARCHIVED"]).optional(), search: z.string().max(120).optional() }).optional()).query(({ input }) => listPartnershipRequests(input ?? undefined)),
    updatePartnership: adminOnly.input(z.object({ id: z.number().int().positive(), status: z.enum(["NEW", "IN_REVIEW", "ACCEPTED", "DECLINED", "ARCHIVED"]).optional(), adminNotes: z.string().max(5000).nullable().optional() })).mutation(async ({ ctx, input }) => { const { id, ...values } = input; const row = await updatePartnershipRequest(id, values); await createAudit(`Updated partnership request ${id}`, ctx.user.id); return row; }),
    deletePartnership: adminOnly.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { await deletePartnershipRequest(input.id); await createAudit(`Deleted partnership request ${input.id}`, ctx.user.id); return { success: true as const }; }),
    contacts: adminOnly.input(z.object({ status: z.enum(["NEW", "READ", "ARCHIVED"]).optional(), search: z.string().max(120).optional() }).optional()).query(({ input }) => listContactSubmissions(input ?? undefined)),
    updateContact: adminOnly.input(z.object({ id: z.number().int().positive(), status: z.enum(["NEW", "READ", "ARCHIVED"]) })).mutation(({ input }) => updateContactSubmissionStatus(input.id, input.status)),
    deleteContact: adminOnly.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { await deleteContactSubmission(input.id); await createAudit(`Deleted contact submission ${input.id}`, ctx.user.id); return { success: true as const }; }),
    inboxCounts: adminOnly.query(() => getInboxCounts()),
    exportRegistrations: adminOnly.input(z.object({ status: z.enum(["PENDING", "ACCEPTED", "REJECTED"]).optional(), search: z.string().max(120).optional(), programId: z.number().int().positive().optional() }).optional()).query(async ({ ctx, input }) => { const rows = await listRegistrationsForExport(input ?? undefined); await createAudit(`Exported ${rows.length} registrations`, ctx.user.id); return rows; }),
    programs: adminOnly.query(() => listPrograms()),
    program: adminOnly.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => { const program = await getProgramById(input.id); if (!program) throw new Error("Program not found."); return { program, webinar: await getProgramWebinarDetails(program.id), speakers: await getProgramSpeakers(program.id) }; }),
    createProgram: adminOnly.input(programCreateInput).mutation(async ({ ctx, input }) => { try { const row = await createProgram({ ...input, createdBy: ctx.user.id, updatedBy: ctx.user.id }); await createAudit(`Created program ${input.slug}`, ctx.user.id); return row; } catch (e: any) { if (isUniqueViolation(e)) throw new Error("That slug is already in use."); throw e; } }),
    updateProgram: adminOnly.input(programUpdateInput).mutation(async ({ ctx, input }) => { const { id, ...values } = input; try { const row = await updateProgram(id, { ...values, updatedBy: ctx.user.id }); if (!row) throw new Error("Program not found."); await createAudit(`Updated program ${row.slug}`, ctx.user.id); return row; } catch (e: any) { if (isUniqueViolation(e)) throw new Error("That slug is already in use."); throw e; } }),
    setProgramPublished: adminOnly.input(z.object({ id: z.number().int().positive(), published: z.boolean() })).mutation(async ({ ctx, input }) => { const row = await updateProgram(input.id, { publishedAt: input.published ? new Date() : null, updatedBy: ctx.user.id }); await createAudit(`${input.published ? "Published" : "Unpublished"} program ${row?.slug ?? input.id}`, ctx.user.id); return row; }),
    setProgramArchived: adminOnly.input(z.object({ id: z.number().int().positive(), archived: z.boolean() })).mutation(async ({ ctx, input }) => { const row = await updateProgram(input.id, { archivedAt: input.archived ? new Date() : null, updatedBy: ctx.user.id }); await createAudit(`${input.archived ? "Archived" : "Restored"} program ${row?.slug ?? input.id}`, ctx.user.id); return row; }),
    saveWebinarDetails: adminOnly.input(z.object({ programId: z.number().int().positive(), subtitle: optText(240), joinLink: optUrl(700), recordingUrl: optUrl(700), highlights: z.string().nullable() })).mutation(async ({ ctx, input }) => { const { programId, ...values } = input; await upsertProgramWebinarDetails(programId, values); await createAudit(`Updated webinar details for program ${programId}`, ctx.user.id); return { success: true as const }; }),
    setProgramSpeakers: adminOnly.input(z.object({ programId: z.number().int().positive(), speakers: z.array(z.object({ speakerId: z.number().int().positive(), topic: z.string().max(240).optional(), displayOrder: z.number().int().optional() })).max(30) })).mutation(async ({ ctx, input }) => { await setProgramSpeakers(input.programId, input.speakers); await createAudit(`Updated speakers for program ${input.programId}`, ctx.user.id); return { success: true as const }; }),
    speakers: adminOnly.query(() => listSpeakers()),
    createSpeaker: adminOnly.input(z.object({ name: speakerFields.name, photoUrl: speakerFields.photoUrl.optional(), role: speakerFields.role.optional(), bio: speakerFields.bio.optional(), socialLinks: speakerFields.socialLinks.optional(), website: speakerFields.website.optional() })).mutation(async ({ ctx, input }) => { const row = await createSpeaker(input); await createAudit(`Created speaker ${input.name}`, ctx.user.id); return row; }),
    updateSpeaker: adminOnly.input(z.object({ id: z.number().int().positive(), name: speakerFields.name.optional(), photoUrl: speakerFields.photoUrl.nullable().optional(), role: speakerFields.role.optional(), bio: speakerFields.bio.optional(), socialLinks: speakerFields.socialLinks.optional(), website: speakerFields.website.nullable().optional() })).mutation(async ({ ctx, input }) => { const { id, ...values } = input; const row = await updateSpeaker(id, values); await createAudit(`Updated speaker ${id}`, ctx.user.id); return row; }),
    deleteSpeaker: adminOnly.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { await deleteSpeaker(input.id); await createAudit(`Deleted speaker ${input.id}`, ctx.user.id); return { success: true as const }; }),
    communityLinks: adminOnly.query(() => listCommunityLinks()),
    saveCommunityLink: adminOnly.input(z.object({ key: z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/), label: z.string().trim().min(1).max(160), platform: z.string().trim().toLowerCase().min(1).max(40), url: z.string().url().max(700), description: z.string().optional(), isActive: z.boolean().default(true), displayOrder: z.number().int().default(0) })).mutation(async ({ ctx, input }) => { await upsertCommunityLink({ ...input, updatedBy: ctx.user.id }); await createAudit(`Saved community link ${input.key}`, ctx.user.id); return { success: true as const }; }),
    deleteCommunityLink: adminOnly.input(z.object({ key: z.string().min(1).max(80) })).mutation(async ({ ctx, input }) => { await deleteCommunityLink(input.key); await createAudit(`Deleted community link ${input.key}`, ctx.user.id); return { success: true as const }; }),
    siteSettings: adminOnly.query(() => getSiteSettings()),
    saveSiteSettings: adminOnly.input(z.object({ featuredProgramId: z.number().int().positive().nullable().optional(), heroHeadline: z.string().max(240).optional(), heroSubheadline: z.string().optional(), aboutShortText: z.string().optional() })).mutation(async ({ ctx, input }) => { const row = await updateSiteSettings({ ...input, updatedBy: ctx.user.id }); await createAudit("Updated site settings", ctx.user.id); return row; }),
    stats: adminOnly.query(() => getStats()),
    registrations: adminOnly.input(z.object({ status: z.enum(["PENDING", "ACCEPTED", "REJECTED"]).optional(), search: z.string().optional(), programId: z.number().int().positive().optional() })).query(({ input }) => listRegistrations(input)),
    registration: adminOnly.input(z.object({ id: z.number() })).query(({ input }) => getRegistration(input.id)),
    deleteRegistration: adminOnly.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const deleted = await deleteRegistration(input.id); if (!deleted) throw new Error("Registration not found."); await createAudit("Permanently deleted registration", ctx.user.id, undefined); return { success: true as const }; }),
    updateStatus: adminOnly.input(z.object({ id: z.number(), status: z.enum(["ACCEPTED", "REJECTED"]), reason: z.string().optional() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const current = await getRegistration(input.id); if (!current) throw new Error("Registration not found"); if (current.status !== "PENDING") throw new Error("This request has already been reviewed."); await db.update(registrations).set({ status: input.status, reviewedAt: new Date(), reviewedBy: ctx.user.id, rejectionReason: input.reason ?? null }).where(and(eq(registrations.id, input.id), eq(registrations.status, "PENDING"))); await createAudit(`Registration ${input.status.toLowerCase()}`, ctx.user.id, input.id); if (input.status === "ACCEPTED") { await ensureDefaults(); const template = (await getConfig())?.template ?? ACCEPTANCE_DEFAULT; const rendered = htmlForTemplate(template, { firstName: current.firstName, lastName: current.lastName, fullName: `${current.firstName} ${current.lastName}`, school: current.school, classLevel: current.classLevel, country: current.country, email: current.email, whatsapp: `${current.countryCode} ${current.whatsappNumber}` }); await sendConfiguredEmail({ category: "ACCEPTANCE", recipient: current.email, subject: template.subject, body: rendered.body, html: rendered.html, adminId: ctx.user.id, registrationId: current.id, media: await getEmailMedia("id" in template ? template.id : undefined) }); } return { success: true }; }),
    retryEmail: adminOnly.input(z.object({ logId: z.number() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const rows = await db.select().from(emailLogs).where(eq(emailLogs.id, input.logId)).limit(1); const failed = rows[0]; if (!failed || failed.status !== "FAILED") throw new Error("Only failed emails can be retried."); if (failed.registrationId) { const reg = await getRegistration(failed.registrationId); if (!reg) throw new Error("Registration not found."); const template = (await getConfig())?.template ?? ACCEPTANCE_DEFAULT; const rendered = htmlForTemplate(template, { firstName: reg.firstName, lastName: reg.lastName, fullName: `${reg.firstName} ${reg.lastName}`, school: reg.school, classLevel: reg.classLevel, country: reg.country, email: reg.email, whatsapp: `${reg.countryCode} ${reg.whatsappNumber}` }); return sendConfiguredEmail({ category: "ACCEPTANCE", recipient: reg.email, subject: template.subject, body: rendered.body, html: rendered.html, adminId: ctx.user.id, registrationId: reg.id, retryOf: failed.id, media: await getEmailMedia("id" in template ? template.id : undefined) }); } throw new Error("This email cannot be retried automatically."); }),
    config: adminOnly.query(async () => { await ensureDefaults(); const result = await getConfig(); if (result?.config) { const { gmailClientIdEncrypted, gmailClientSecretEncrypted, gmailRefreshTokenEncrypted, ...safeConfig } = result.config; return { ...result, config: { ...safeConfig, brevoConfigured: Boolean(ENV.brevoApiKey) } }; } return result; }),
    saveTemplate: adminOnly.input(z.object({ category: emailCategory.default("ACCEPTANCE"), subject: z.string().min(1).max(240), body: z.string().min(1), htmlBody: z.string().optional(), groupLink: z.string().url().optional().or(z.literal("")), channelLink: z.string().url().optional().or(z.literal("")) })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const existing = await db.select().from(emailTemplates).where(eq(emailTemplates.category, input.category)).limit(1); const values = { ...input, category: input.category, updatedBy: ctx.user.id }; if (existing[0]) await db.update(emailTemplates).set(values).where(eq(emailTemplates.id, existing[0].id)); else await db.insert(emailTemplates).values(values); await createAudit(`Edited ${input.category.toLowerCase()} email template`, ctx.user.id); return { success: true }; }),
    restoreDefault: adminOnly.mutation(async ({ ctx }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const existing = await db.select().from(emailTemplates).where(eq(emailTemplates.category, "ACCEPTANCE")).limit(1); const values = { ...ACCEPTANCE_DEFAULT, updatedBy: ctx.user.id }; if (existing[0]) await db.update(emailTemplates).set(values).where(eq(emailTemplates.id, existing[0].id)); else await db.insert(emailTemplates).values(values); await createAudit("Restored default acceptance email", ctx.user.id); return { success: true }; }),
    saveEmailConfig: adminOnly.input(z.object({ senderName: z.string().min(1).max(160), senderEmail: z.string().email(), replyTo: z.string().email().optional().or(z.literal("")), enabled: z.boolean() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const existing = await db.select().from(emailConfig).limit(1); const values = { senderName: input.senderName, senderEmail: input.senderEmail, replyTo: input.replyTo, enabled: input.enabled, updatedBy: ctx.user.id }; if (existing[0]) await db.update(emailConfig).set(values).where(eq(emailConfig.id, existing[0].id)); else await db.insert(emailConfig).values(values); await createAudit("Changed email sender configuration", ctx.user.id); return { success: true }; }),
    sendTestEmail: adminOnly.input(z.object({ recipient: z.string().email() })).mutation(async ({ ctx, input }) => { const result = await sendConfiguredEmail({ category: "SYSTEM_TEST", recipient: input.recipient, subject: "THE NEXT MIND email connection test", body: "This is a live connection test from THE NEXT MIND.", html: DEFAULT_HTML("<p>This is a live connection test from THE NEXT MIND.</p>"), adminId: ctx.user.id }); if (!result.ok) throw new Error(result.error); return { success: true, providerMessageId: result.id }; }),
    sendGeneralEmail: adminOnly.input(z.object({ recipients: z.array(z.string().email()).min(1).max(50), subject: z.string().min(1).max(240), body: z.string().min(1), htmlBody: z.string().optional(), mediaIds: z.array(z.number()).max(20).optional() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const media = input.mediaIds?.length ? await db.select().from(emailMedia).where(inArray(emailMedia.id, input.mediaIds)) : []; const results = []; for (const recipient of Array.from(new Set(input.recipients))) { const result = await sendConfiguredEmail({ category: "GENERAL", recipient, subject: input.subject, body: input.body, html: input.htmlBody ?? DEFAULT_HTML(textToEmailHtml(input.body)), media, adminId: ctx.user.id }); results.push({ recipient, sent: result.ok, error: result.ok ? undefined : result.error }); } await createAudit(`Sent general email to ${results.length} recipients`, ctx.user.id); return { processed: results.length, sent: results.filter(r => r.sent).length, failed: results.filter(r => !r.sent).length, results }; }),
    uploadMedia: adminOnly.input(z.object({ filename: z.string().min(1).max(240), mimeType: z.string().regex(/^(image\/(png|jpeg|jpg|gif|webp)|video\/[a-z0-9.+-]+|audio\/[a-z0-9.+-]+|application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document|vnd\.ms-excel|vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|vnd\.ms-powerpoint|vnd\.openxmlformats-officedocument\.presentationml\.presentation|zip)|text\/(plain|csv))$/), dataBase64: z.string().max(12_000_000), placement: z.enum(["INLINE", "ATTACHMENT"]), templateId: z.number().optional() })).mutation(async ({ ctx, input }) => { const raw = Buffer.from(input.dataBase64.replace(/^data:[^;]+;base64,/, ""), "base64"); if (raw.length > 8 * 1024 * 1024) throw new Error("Media files must be 8 MB or smaller."); const stored = await storagePut(`email-media/${ctx.user.id}/${Date.now()}-${input.filename.replace(/[^a-zA-Z0-9._-]/g, "-")}`, raw, input.mimeType); const db = await getDb(); if (!db) throw new Error("Database unavailable"); const contentId = input.placement === "INLINE" ? `media-${crypto.randomUUID()}` : null; await db.insert(emailMedia).values({ templateId: input.templateId, fileKey: stored.key, fileUrl: stored.url, filename: input.filename, mimeType: input.mimeType, contentId, placement: input.placement, createdBy: ctx.user.id }); const created = await db.select().from(emailMedia).where(eq(emailMedia.fileKey, stored.key)).orderBy(desc(emailMedia.id)).limit(1); return { id: created[0]?.id, url: stored.url, filename: input.filename, mimeType: input.mimeType, contentId, placement: input.placement }; }),
    media: adminOnly.input(z.object({ templateId: z.number().optional() })).query(({ input }) => getEmailMedia(input.templateId)),
    logs: adminOnly.input(z.object({ limit: z.number().min(1).max(100).default(50) })).query(async ({ input }) => { const db = await getDb(); if (!db) return []; return db.select().from(emailLogs).orderBy(desc(emailLogs.createdAt)).limit(input.limit); }),
    notificationPreferences: adminOnly.query(async () => { const db = await getDb(); if (!db) return undefined; await ensureDefaults(); const rows = await db.select().from(notificationPreferences).limit(1); return rows[0]; }),
    saveNotificationPreferences: adminOnly.input(z.object({ masterEnabled: z.boolean(), newRegistration: z.boolean(), emailFailure: z.boolean(), adminEvents: z.boolean() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const existing = await db.select().from(notificationPreferences).limit(1); if (existing[0]) await db.update(notificationPreferences).set({ ...input, updatedBy: ctx.user.id }).where(eq(notificationPreferences.id, existing[0].id)); else await db.insert(notificationPreferences).values({ ...input, updatedBy: ctx.user.id }); await createAudit("Changed notification preferences", ctx.user.id); return { success: true }; }),
    notifications: adminOnly.query(async () => { const db = await getDb(); if (!db) return []; return db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(50); }),
    admins: adminOnly.query(async () => { const db = await getDb(); if (!db) return []; return db.select({ id: users.id, name: users.name, email: users.email, loginMethod: users.loginMethod, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn }).from(users).where(eq(users.role, "admin")).orderBy(desc(users.lastSignedIn)); }),
    dismissAdmin: adminOnly.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { if (ctx.user.id === input.id) throw new Error("You cannot dismiss your own active admin account."); const db = await getDb(); if (!db) throw new Error("Database unavailable"); await db.update(users).set({ role: "user" }).where(and(eq(users.id, input.id), eq(users.role, "admin"))); await createAudit("Dismissed administrator", ctx.user.id); return { success: true as const }; }),
    createInvite: adminOnly.input(z.object({ origin: z.string().url(), hours: z.number().min(1).max(168).default(24) })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const raw = crypto.randomBytes(32).toString("hex"); const hash = crypto.createHash("sha256").update(raw).digest("hex"); await db.insert(adminInvites).values({ tokenHash: hash, createdBy: ctx.user.id, expiresAt: new Date(Date.now() + input.hours * 3600000) }); await createAudit("Generated admin invite", ctx.user.id); return { url: `${input.origin}/auth/signup/${raw}` }; }),
    invites: adminOnly.query(async () => { const db = await getDb(); if (!db) return []; return db.select({ id: adminInvites.id, createdAt: adminInvites.createdAt, expiresAt: adminInvites.expiresAt, usedAt: adminInvites.usedAt, revokedAt: adminInvites.revokedAt }).from(adminInvites).orderBy(desc(adminInvites.createdAt)).limit(100); }),
    revokeInvite: adminOnly.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); await db.update(adminInvites).set({ revokedAt: new Date() }).where(and(eq(adminInvites.id, input.id), isNull(adminInvites.usedAt), isNull(adminInvites.revokedAt))); await createAudit("Revoked admin invite", ctx.user.id); return { success: true as const }; }),
    deleteInvite: adminOnly.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); await db.delete(adminInvites).where(eq(adminInvites.id, input.id)); await createAudit("Deleted admin invite", ctx.user.id); return { success: true as const }; }),
    consumeInvite: protectedProcedure.input(z.object({ token: z.string().min(32).max(128) })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const hash = crypto.createHash("sha256").update(input.token).digest("hex"); const rows = await db.select().from(adminInvites).where(and(eq(adminInvites.tokenHash, hash), isNull(adminInvites.usedAt), isNull(adminInvites.revokedAt), gt(adminInvites.expiresAt, new Date()))).limit(1); if (!rows[0]) throw new Error("This invitation is invalid, expired, revoked, or already used."); await db.update(adminInvites).set({ usedAt: new Date(), usedBy: ctx.user.id }).where(eq(adminInvites.id, rows[0].id)); await db.update(users).set({ role: "admin" }).where(eq(users.id, ctx.user.id)); await createAudit("Joined as admin using invite", ctx.user.id); return { success: true }; }),
  }),
});
export type AppRouter = typeof appRouter;
