-- Run in the Supabase SQL editor. Every row should say true; any false = that phase's SQL hasn't been applied.
SELECT t AS "table", to_regclass('public."' || t || '"') IS NOT NULL AS exists
FROM unnest(ARRAY['programs','programWebinarDetails','speakers','programSpeakers','communityLinks','siteSettings','partnershipRequests','contactSubmissions']) AS t;
-- Registration uniqueness (Phase 2): expect 2 rows named registrations_program_*_key
SELECT conname FROM pg_constraint WHERE conrelid = 'public."registrations"'::regclass AND contype = 'u';
