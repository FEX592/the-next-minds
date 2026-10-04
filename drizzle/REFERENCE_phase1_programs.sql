-- Reference only — NOT part of the tracked migration history (see note in the
-- PR/chat about drizzle/0000-0006 being stale MySQL-dialect files incompatible
-- with this project's actual Postgres database).
--
-- This is what `npx drizzle-kit push` should generate when it diffs the updated
-- drizzle/schema.ts against your live database. Use it to sanity-check the
-- push output, or paste it directly into Supabase's SQL editor if you'd rather
-- apply by hand than run the CLI.

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

ALTER TABLE "registrations" ADD COLUMN "programId" integer;
-- Deliberately nullable and not foreign-keyed in this pass: existing rows (and
-- the current single-program flow) keep working untouched with programId = NULL.
-- A real REFERENCES "programs"("id") constraint can be added once Phase 2 wires
-- the registration form to a real programId for every new submission.
