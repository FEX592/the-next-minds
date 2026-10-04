-- Phase 2 — run AFTER REFERENCE_phase1_programs.sql on an existing database
-- (fresh installs: supabase/schema.sql already includes all of this).
-- Requires Postgres 15+ (NULLS NOT DISTINCT) — Supabase default.

-- 1. Drop the legacy GLOBAL unique constraints on email / normalizedWhatsapp.
--    Their names differ depending on how the DB was created, so find them by column.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'registrations'
      AND c.contype = 'u'
      AND (SELECT array_agg(a.attname::text) FROM pg_attribute a
           WHERE a.attrelid = t.oid AND a.attnum = ANY (c.conkey)) IN (ARRAY['email'], ARRAY['normalizedWhatsapp'])
  LOOP
    EXECUTE format('ALTER TABLE registrations DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- 2. Per-program uniqueness. Legacy rows keep programId = NULL and stay unique among themselves.
ALTER TABLE registrations ADD CONSTRAINT registrations_program_email_key
  UNIQUE NULLS NOT DISTINCT ("programId", "email");
ALTER TABLE registrations ADD CONSTRAINT registrations_program_whatsapp_key
  UNIQUE NULLS NOT DISTINCT ("programId", "normalizedWhatsapp");

-- 3. Foreign keys (schema.ts now declares them; the Phase 1 reference SQL did not create these on its own for registrations).
ALTER TABLE registrations ADD CONSTRAINT "registrations_programId_fkey"
  FOREIGN KEY ("programId") REFERENCES programs("id");
