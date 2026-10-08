-- Phase 6 — run once on an existing database (fresh installs: supabase/schema.sql already includes this).
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
