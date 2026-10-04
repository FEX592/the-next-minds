-- Phase 4 — run once on an existing database (fresh installs: supabase/schema.sql already includes this).
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
