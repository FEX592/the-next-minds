-- THE NEXT MIND — initial schema for Supabase (Postgres)
--
-- Includes Phase 1 (programs/speakers/community/settings) and Phase 2 (per-program registration uniqueness) and Phase 4 (partnership/contact inboxes). Requires Postgres 15+.
--
-- Paste this whole file into the Supabase SQL Editor (Project > SQL Editor >
-- New query) and run it once against a fresh project. It creates every
-- table `drizzle/schema.ts` defines, plus the triggers that replace
-- MySQL's `.onUpdateNow()` behaviour (Postgres has no built-in equivalent).
--
-- This is a hand-written, one-time bootstrap — an alternative to running
-- `pnpm drizzle-kit generate && pnpm drizzle-kit migrate` locally. Use
-- either path, not both, on a given database. If you later change
-- `drizzle/schema.ts` and want to keep using drizzle-kit for migrations
-- from here on, run `pnpm drizzle-kit generate` once against this database
-- first so drizzle-kit's local snapshot matches what's actually deployed.
--
-- Note: this connects with the Postgres connection string directly (via
-- Drizzle), not through Supabase's PostgREST/anon-key API, so Row Level
-- Security does not apply and the Supabase dashboard's "RLS disabled"
-- warnings on these tables are expected and not a problem here.

create type "role" as enum ('user', 'admin');
create type "registration_status" as enum ('PENDING', 'ACCEPTED', 'REJECTED');
create type "email_template_category" as enum ('ACCEPTANCE', 'GENERAL');
create type "email_media_placement" as enum ('INLINE', 'ATTACHMENT');
create type "email_log_status" as enum ('PENDING', 'SENDING', 'SENT', 'FAILED');

create table "users" (
  "id" serial primary key,
  "openId" varchar(64) not null unique,
  "name" text,
  "email" varchar(320),
  "passwordHash" text,
  "loginMethod" varchar(64) default 'local',
  "role" "role" not null default 'user',
  "createdAt" timestamp not null default now(),
  "updatedAt" timestamp not null default now(),
  "lastSignedIn" timestamp not null default now()
);

-- Programs / webinars / speakers (Phase 1)
CREATE TYPE "program_type" AS ENUM ('WEBINAR', 'WORKSHOP', 'COURSE', 'CHALLENGE', 'TRAINING', 'COMMUNITY_INITIATIVE', 'OTHER');
CREATE TYPE "program_status" AS ENUM ('UPCOMING', 'ONGOING', 'COMPLETED');

CREATE TABLE "programs" (
  "id" serial PRIMARY KEY,
  "slug" varchar(160) NOT NULL UNIQUE,
  "title" varchar(240) NOT NULL,
  "shortDescription" text,
  "fullDescription" text,
  "coverImageUrl" varchar(700),
  "type" program_type NOT NULL DEFAULT 'OTHER',
  "status" program_status NOT NULL DEFAULT 'UPCOMING',
  "startAt" timestamp,
  "durationMinutes" integer,
  "locationOrPlatform" varchar(240),
  "whatParticipantsWillLearn" text,
  "whoItsFor" text,
  "registrationEnabled" boolean NOT NULL DEFAULT true,
  "registrationDeadline" timestamp,
  "registrationCtaLabel" varchar(80),
  "additionalResources" text,
  "whatsappLinkOverride" varchar(500),
  "telegramLinkOverride" varchar(500),
  "takeawayCourseTitle" varchar(240),
  "takeawayCourseUrl" varchar(700),
  "seoTitle" varchar(240),
  "seoDescription" varchar(400),
  "seoImageUrl" varchar(700),
  "publishedAt" timestamp,
  "archivedAt" timestamp,
  "createdBy" integer,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedBy" integer,
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "programWebinarDetails" (
  "id" serial PRIMARY KEY,
  "programId" integer NOT NULL UNIQUE REFERENCES "programs"("id"),
  "subtitle" varchar(240),
  "joinLink" varchar(700),
  "recordingUrl" varchar(700),
  "highlights" text
);

CREATE TABLE "speakers" (
  "id" serial PRIMARY KEY,
  "name" varchar(160) NOT NULL,
  "photoUrl" varchar(700),
  "role" varchar(160),
  "bio" text,
  "socialLinks" text,
  "website" varchar(500),
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "programSpeakers" (
  "id" serial PRIMARY KEY,
  "programId" integer NOT NULL REFERENCES "programs"("id"),
  "speakerId" integer NOT NULL REFERENCES "speakers"("id"),
  "topic" varchar(240),
  "displayOrder" integer NOT NULL DEFAULT 0
);

CREATE TABLE "communityLinks" (
  "id" serial PRIMARY KEY,
  "key" varchar(80) NOT NULL UNIQUE,
  "label" varchar(160) NOT NULL,
  "platform" varchar(40) NOT NULL,
  "url" varchar(700) NOT NULL,
  "description" text,
  "isActive" boolean NOT NULL DEFAULT true,
  "displayOrder" integer NOT NULL DEFAULT 0,
  "updatedBy" integer,
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "siteSettings" (
  "id" serial PRIMARY KEY,
  "featuredProgramId" integer REFERENCES "programs"("id"),
  "heroHeadline" varchar(240),
  "heroSubheadline" text,
  "aboutShortText" text,
  "updatedBy" integer,
  "updatedAt" timestamp NOT NULL DEFAULT now()
);


create table "registrations" (
  "id" serial primary key,
  "programId" integer not null references "programs"("id"),
  "firstName" varchar(120) not null,
  "lastName" varchar(120) not null,
  "country" varchar(80) not null,
  "countryCode" varchar(8) not null,
  "whatsappNumber" varchar(40) not null,
  "normalizedWhatsapp" varchar(40) not null,
  "classLevel" varchar(120) not null,
  "school" varchar(240) not null,
  "email" varchar(320) not null,
  "status" "registration_status" not null default 'PENDING',
  "createdAt" timestamp not null default now(),
  "updatedAt" timestamp not null default now(),
  "reviewedAt" timestamp,
  "reviewedBy" integer,
  "rejectionReason" text,
  constraint "registrations_program_email_key" unique nulls not distinct ("programId","email"),
  constraint "registrations_program_whatsapp_key" unique nulls not distinct ("programId","normalizedWhatsapp")
);

create table "adminInvites" (
  "id" serial primary key,
  "tokenHash" varchar(128) not null unique,
  "createdBy" integer not null,
  "createdAt" timestamp not null default now(),
  "expiresAt" timestamp not null,
  "usedAt" timestamp,
  "usedBy" integer,
  "revokedAt" timestamp
);

create table "emailConfig" (
  "id" serial primary key,
  "senderName" varchar(160) not null,
  "senderEmail" varchar(320) not null,
  "replyTo" varchar(320),
  "gmailClientIdEncrypted" text,
  "gmailClientSecretEncrypted" text,
  "gmailRefreshTokenEncrypted" text,
  "enabled" boolean not null default false,
  "updatedBy" integer,
  "updatedAt" timestamp not null default now()
);

create table "emailTemplates" (
  "id" serial primary key,
  "category" "email_template_category" not null default 'ACCEPTANCE',
  "subject" varchar(240) not null,
  "body" text not null,
  "htmlBody" text,
  "groupLink" varchar(500),
  "channelLink" varchar(500),
  "updatedBy" integer,
  "updatedAt" timestamp not null default now()
);

create table "emailMedia" (
  "id" serial primary key,
  "templateId" integer,
  "fileKey" varchar(500) not null,
  "fileUrl" varchar(700) not null,
  "filename" varchar(240) not null,
  "mimeType" varchar(120) not null,
  "contentId" varchar(120),
  "placement" "email_media_placement" not null,
  "createdBy" integer not null,
  "createdAt" timestamp not null default now()
);

create table "emailLogs" (
  "id" serial primary key,
  "recipient" varchar(320) not null,
  "emailType" varchar(80) not null,
  "subject" varchar(240),
  "registrationId" integer,
  "status" "email_log_status" not null,
  "failureReason" text,
  "providerMessageId" varchar(240),
  "idempotencyKey" varchar(200),
  "retryOf" integer,
  "sentBy" integer,
  "createdAt" timestamp not null default now()
);

create table "notifications" (
  "id" serial primary key,
  "title" varchar(160) not null,
  "body" text not null,
  "registrationId" integer,
  "createdAt" timestamp not null default now(),
  "readAt" timestamp
);

create table "notificationPreferences" (
  "id" serial primary key,
  "masterEnabled" boolean not null default true,
  "newRegistration" boolean not null default true,
  "emailFailure" boolean not null default true,
  "adminEvents" boolean not null default true,
  "updatedBy" integer,
  "updatedAt" timestamp not null default now()
);

create table "auditLogs" (
  "id" serial primary key,
  "action" varchar(160) not null,
  "adminId" integer not null,
  "registrationId" integer,
  "createdAt" timestamp not null default now()
);

-- Replaces MySQL's `timestamp(...).onUpdateNow()`: stamps "updatedAt" on
-- every UPDATE, for the five tables that had it in the original schema.
create or replace function set_updated_at()
returns trigger as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on "users"
  for each row execute function set_updated_at();
create trigger set_updated_at before update on "registrations"
  for each row execute function set_updated_at();
create trigger set_updated_at before update on "emailConfig"
  for each row execute function set_updated_at();
create trigger set_updated_at before update on "emailTemplates"
  for each row execute function set_updated_at();
create trigger set_updated_at before update on "notificationPreferences"
  for each row execute function set_updated_at();

-- Partnership requests & contact submissions (Phase 4)
CREATE TYPE partnership_type AS ENUM ('SPEAKING','TRAINING','SPONSORSHIP','COMMUNITY_PARTNERSHIP','CONTENT_COLLABORATION','TECHNOLOGY_PARTNERSHIP','OTHER');
CREATE TYPE partnership_status AS ENUM ('NEW','IN_REVIEW','ACCEPTED','DECLINED','ARCHIVED');
CREATE TYPE contact_status AS ENUM ('NEW','READ','ARCHIVED');

CREATE TABLE "partnershipRequests" (
  "id" serial PRIMARY KEY,
  "fullName" varchar(160) NOT NULL,
  "email" varchar(320) NOT NULL,
  "organization" varchar(240),
  "phone" varchar(40),
  "partnershipType" partnership_type NOT NULL,
  "message" text NOT NULL,
  "link" varchar(500),
  "status" partnership_status NOT NULL DEFAULT 'NEW',
  "adminNotes" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "contactSubmissions" (
  "id" serial PRIMARY KEY,
  "name" varchar(160) NOT NULL,
  "email" varchar(320) NOT NULL,
  "subject" varchar(240) NOT NULL,
  "message" text NOT NULL,
  "status" contact_status NOT NULL DEFAULT 'NEW',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX "partnershipRequests_status_createdAt_idx" ON "partnershipRequests" ("status","createdAt" DESC);
CREATE INDEX "contactSubmissions_status_createdAt_idx" ON "contactSubmissions" ("status","createdAt" DESC);

-- RLS on, no policies (matches the live project): the app connects directly to Postgres; the public API gets no table access.
ALTER TABLE "programs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "programWebinarDetails" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "speakers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "programSpeakers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "communityLinks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "siteSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "partnershipRequests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contactSubmissions" ENABLE ROW LEVEL SECURITY;

-- Scheduled emails: reminders / follow-ups (Phase 6)
CREATE TYPE scheduled_email_kind AS ENUM ('REMINDER','FOLLOW_UP');
CREATE TYPE delivery_status AS ENUM ('PENDING','SENT','FAILED');

CREATE TABLE "scheduledEmailRules" (
  "id" serial PRIMARY KEY,
  "kind" scheduled_email_kind NOT NULL,
  "label" varchar(160) NOT NULL,
  "offsetMinutes" integer NOT NULL CHECK ("offsetMinutes" > 0),
  "enabled" boolean NOT NULL DEFAULT true,
  "subject" varchar(240) NOT NULL,
  "body" text NOT NULL,
  "htmlBody" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "scheduledEmailDeliveries" (
  "id" serial PRIMARY KEY,
  "ruleId" integer NOT NULL REFERENCES "scheduledEmailRules"("id") ON DELETE CASCADE,
  "registrationId" integer NOT NULL REFERENCES "registrations"("id") ON DELETE CASCADE,
  "status" delivery_status NOT NULL DEFAULT 'PENDING',
  "attempts" integer NOT NULL DEFAULT 1,
  "error" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "sentAt" timestamp,
  CONSTRAINT "scheduledEmailDeliveries_rule_registration_key" UNIQUE ("ruleId","registrationId")
);
CREATE INDEX "scheduledEmailDeliveries_status_idx" ON "scheduledEmailDeliveries" ("status");

ALTER TABLE "scheduledEmailRules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "scheduledEmailDeliveries" ENABLE ROW LEVEL SECURITY;

-- Default rules (edit them in Admin > Email centre > Reminders). The follow-up starts paused.
INSERT INTO "scheduledEmailRules" ("kind","label","offsetMinutes","enabled","subject","body") VALUES
('REMINDER','24 hours before',1440,true,'Tomorrow: {{programTitle}}',$body$Hi {{firstName}},

A quick reminder — {{programTitle}} starts in {{timeUntil}}.

{{programDetails}}

{{communityLinks}}

See you there!
THE NEXT MIND$body$),
('REMINDER','1 hour before',60,true,'Starting soon: {{programTitle}}',$body$Hi {{firstName}},

{{programTitle}} starts in {{timeUntil}} — time to get ready!

{{programDetails}}

{{communityLinks}}

See you shortly,
THE NEXT MIND$body$),
('FOLLOW_UP','Follow-up, 1 day after',1440,false,'Thanks for joining {{programTitle}}',$body$Hi {{firstName}},

Thank you for being part of {{programTitle}}!

{{followUpDetails}}

Stay connected with the community:
{{communityLinks}}

THE NEXT MIND$body$);
