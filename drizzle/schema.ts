import { boolean, integer, pgEnum, pgTable, serial, text, timestamp, unique, varchar } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const registrationStatusEnum = pgEnum("registration_status", ["PENDING", "ACCEPTED", "REJECTED"]);
export const emailTemplateCategoryEnum = pgEnum("email_template_category", ["ACCEPTANCE", "GENERAL"]);
export const emailMediaPlacementEnum = pgEnum("email_media_placement", ["INLINE", "ATTACHMENT"]);
export const emailLogStatusEnum = pgEnum("email_log_status", ["PENDING", "SENDING", "SENT", "FAILED"]);
export const programTypeEnum = pgEnum("program_type", ["WEBINAR", "WORKSHOP", "COURSE", "CHALLENGE", "TRAINING", "COMMUNITY_INITIATIVE", "OTHER"]);
export const programStatusEnum = pgEnum("program_status", ["UPCOMING", "ONGOING", "COMPLETED"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(), openId: varchar("openId", { length: 64 }).notNull().unique(), name: text("name"), email: varchar("email", { length: 320 }), passwordHash: text("passwordHash"), loginMethod: varchar("loginMethod", { length: 64 }).default("local"), role: roleEnum("role").default("user").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().notNull(), lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export const registrations = pgTable("registrations", {
  id: serial("id").primaryKey(), programId: integer("programId").references(() => programs.id), firstName: varchar("firstName", { length: 120 }).notNull(), lastName: varchar("lastName", { length: 120 }).notNull(), country: varchar("country", { length: 80 }).notNull(), countryCode: varchar("countryCode", { length: 8 }).notNull(), whatsappNumber: varchar("whatsappNumber", { length: 40 }).notNull(), normalizedWhatsapp: varchar("normalizedWhatsapp", { length: 40 }).notNull(), classLevel: varchar("classLevel", { length: 120 }).notNull(), school: varchar("school", { length: 240 }).notNull(), email: varchar("email", { length: 320 }).notNull(), status: registrationStatusEnum("status").default("PENDING").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().notNull(), reviewedAt: timestamp("reviewedAt"), reviewedBy: integer("reviewedBy"), rejectionReason: text("rejectionReason"),
}, (t) => [
  // Uniqueness is per program. NULLS NOT DISTINCT keeps legacy (programId = NULL) rows unique among themselves.
  unique("registrations_program_email_key").on(t.programId, t.email).nullsNotDistinct(),
  unique("registrations_program_whatsapp_key").on(t.programId, t.normalizedWhatsapp).nullsNotDistinct(),
]);
export const adminInvites = pgTable("adminInvites", { id: serial("id").primaryKey(), tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(), createdBy: integer("createdBy").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), expiresAt: timestamp("expiresAt").notNull(), usedAt: timestamp("usedAt"), usedBy: integer("usedBy"), revokedAt: timestamp("revokedAt") });
export const emailConfig = pgTable("emailConfig", { id: serial("id").primaryKey(), senderName: varchar("senderName", { length: 160 }).notNull(), senderEmail: varchar("senderEmail", { length: 320 }).notNull(), replyTo: varchar("replyTo", { length: 320 }), gmailClientIdEncrypted: text("gmailClientIdEncrypted"), gmailClientSecretEncrypted: text("gmailClientSecretEncrypted"), gmailRefreshTokenEncrypted: text("gmailRefreshTokenEncrypted"), enabled: boolean("enabled").notNull().default(false), updatedBy: integer("updatedBy"), updatedAt: timestamp("updatedAt").defaultNow().notNull() });
export const emailTemplates = pgTable("emailTemplates", { id: serial("id").primaryKey(), category: emailTemplateCategoryEnum("category").default("ACCEPTANCE").notNull(), subject: varchar("subject", { length: 240 }).notNull(), body: text("body").notNull(), htmlBody: text("htmlBody"), groupLink: varchar("groupLink", { length: 500 }), channelLink: varchar("channelLink", { length: 500 }), updatedBy: integer("updatedBy"), updatedAt: timestamp("updatedAt").defaultNow().notNull() });
export const emailMedia = pgTable("emailMedia", { id: serial("id").primaryKey(), templateId: integer("templateId"), fileKey: varchar("fileKey", { length: 500 }).notNull(), fileUrl: varchar("fileUrl", { length: 700 }).notNull(), filename: varchar("filename", { length: 240 }).notNull(), mimeType: varchar("mimeType", { length: 120 }).notNull(), contentId: varchar("contentId", { length: 120 }), placement: emailMediaPlacementEnum("placement").notNull(), createdBy: integer("createdBy").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() });
export const emailLogs = pgTable("emailLogs", { id: serial("id").primaryKey(), recipient: varchar("recipient", { length: 320 }).notNull(), emailType: varchar("emailType", { length: 80 }).notNull(), subject: varchar("subject", { length: 240 }), registrationId: integer("registrationId"), status: emailLogStatusEnum("status").notNull(), failureReason: text("failureReason"), providerMessageId: varchar("providerMessageId", { length: 240 }), idempotencyKey: varchar("idempotencyKey", { length: 200 }), retryOf: integer("retryOf"), sentBy: integer("sentBy"), createdAt: timestamp("createdAt").defaultNow().notNull() });
export const notifications = pgTable("notifications", { id: serial("id").primaryKey(), title: varchar("title", { length: 160 }).notNull(), body: text("body").notNull(), registrationId: integer("registrationId"), createdAt: timestamp("createdAt").defaultNow().notNull(), readAt: timestamp("readAt") });
export const notificationPreferences = pgTable("notificationPreferences", { id: serial("id").primaryKey(), masterEnabled: boolean("masterEnabled").notNull().default(true), newRegistration: boolean("newRegistration").notNull().default(true), emailFailure: boolean("emailFailure").notNull().default(true), adminEvents: boolean("adminEvents").notNull().default(true), updatedBy: integer("updatedBy"), updatedAt: timestamp("updatedAt").defaultNow().notNull() });
export const auditLogs = pgTable("auditLogs", { id: serial("id").primaryKey(), action: varchar("action", { length: 160 }).notNull(), adminId: integer("adminId").notNull(), registrationId: integer("registrationId"), createdAt: timestamp("createdAt").defaultNow().notNull() });

// --- NEXT MIND platform: programs / webinars / speakers (PRD Phase 1) ---
// Option A: a webinar is a `programs` row with type="WEBINAR"; webinar-only fields
// (recording link, join link, highlights) live in the 1:1 programWebinarDetails side-table
// rather than a parallel system, so registration/email/status logic stays shared.
export const programs = pgTable("programs", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  title: varchar("title", { length: 240 }).notNull(),
  shortDescription: text("shortDescription"),
  fullDescription: text("fullDescription"),
  coverImageUrl: varchar("coverImageUrl", { length: 700 }),
  type: programTypeEnum("type").default("OTHER").notNull(),
  status: programStatusEnum("status").default("UPCOMING").notNull(),
  startAt: timestamp("startAt"),
  durationMinutes: integer("durationMinutes"),
  locationOrPlatform: varchar("locationOrPlatform", { length: 240 }),
  whatParticipantsWillLearn: text("whatParticipantsWillLearn"),
  whoItsFor: text("whoItsFor"),
  registrationEnabled: boolean("registrationEnabled").notNull().default(true),
  registrationDeadline: timestamp("registrationDeadline"),
  registrationCtaLabel: varchar("registrationCtaLabel", { length: 80 }),
  additionalResources: text("additionalResources"),
  whatsappLinkOverride: varchar("whatsappLinkOverride", { length: 500 }),
  telegramLinkOverride: varchar("telegramLinkOverride", { length: 500 }),
  takeawayCourseTitle: varchar("takeawayCourseTitle", { length: 240 }),
  takeawayCourseUrl: varchar("takeawayCourseUrl", { length: 700 }),
  seoTitle: varchar("seoTitle", { length: 240 }),
  seoDescription: varchar("seoDescription", { length: 400 }),
  seoImageUrl: varchar("seoImageUrl", { length: 700 }),
  publishedAt: timestamp("publishedAt"),
  archivedAt: timestamp("archivedAt"),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedBy: integer("updatedBy"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export const programWebinarDetails = pgTable("programWebinarDetails", {
  id: serial("id").primaryKey(),
  programId: integer("programId").notNull().unique().references(() => programs.id),
  subtitle: varchar("subtitle", { length: 240 }),
  joinLink: varchar("joinLink", { length: 700 }),
  recordingUrl: varchar("recordingUrl", { length: 700 }),
  highlights: text("highlights"),
});
export const speakers = pgTable("speakers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  photoUrl: varchar("photoUrl", { length: 700 }),
  role: varchar("role", { length: 160 }),
  bio: text("bio"),
  socialLinks: text("socialLinks"),
  website: varchar("website", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
// Join table: topic/session and display order live here because they describe
// this speaker's role in THIS program, not the speaker globally — the same
// speaker can have a different topic in a different webinar.
export const programSpeakers = pgTable("programSpeakers", {
  id: serial("id").primaryKey(),
  programId: integer("programId").notNull().references(() => programs.id),
  speakerId: integer("speakerId").notNull().references(() => speakers.id),
  topic: varchar("topic", { length: 240 }),
  displayOrder: integer("displayOrder").notNull().default(0),
});
export const communityLinks = pgTable("communityLinks", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 80 }).notNull().unique(),
  label: varchar("label", { length: 160 }).notNull(),
  platform: varchar("platform", { length: 40 }).notNull(),
  url: varchar("url", { length: 700 }).notNull(),
  description: text("description"),
  isActive: boolean("isActive").notNull().default(true),
  displayOrder: integer("displayOrder").notNull().default(0),
  updatedBy: integer("updatedBy"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
// Single-row config table, matching the existing emailConfig/notificationPreferences convention.
export const siteSettings = pgTable("siteSettings", {
  id: serial("id").primaryKey(),
  featuredProgramId: integer("featuredProgramId").references(() => programs.id),
  heroHeadline: varchar("heroHeadline", { length: 240 }),
  heroSubheadline: text("heroSubheadline"),
  aboutShortText: text("aboutShortText"),
  updatedBy: integer("updatedBy"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect; export type InsertUser = typeof users.$inferInsert; export type Registration = typeof registrations.$inferSelect; export type InsertRegistration = typeof registrations.$inferInsert;
export type Program = typeof programs.$inferSelect; export type InsertProgram = typeof programs.$inferInsert;
export type Speaker = typeof speakers.$inferSelect; export type InsertSpeaker = typeof speakers.$inferInsert;
