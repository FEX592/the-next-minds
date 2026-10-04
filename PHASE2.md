# Phase 2 — public program pages + program-scoped registration

## Apply to the database (existing install)
1. `drizzle/REFERENCE_phase1_programs.sql` (if not already applied)
2. `drizzle/REFERENCE_phase2_registrations.sql` — drops the global unique email/WhatsApp constraints, adds per-program ones (+FK). Needs Postgres 15+.
3. Optional: `drizzle/seed_first_webinar.sql` — creates *A Balanced Human in the AI Era*, its 3 speakers, a WhatsApp link and the featured-program setting. Set `startAt` (UTC) when the date is fixed.
Fresh installs: `supabase/schema.sql` already contains everything.

## What changed
- `registrations`: `programId` FK; uniqueness is `(programId, email)` and `(programId, normalizedWhatsapp)` with NULLS NOT DISTINCT, so legacy no-program rows still dedupe among themselves.
- `public.register` accepts optional `programId`. With a program: must be published, not archived, enabled, not completed, before the deadline; registration is auto-confirmed (`ACCEPTED`), a confirmation email is sent (idempotent per registration) and community links are returned. Without `programId`: unchanged manual-review flow.
- New public tRPC: `public.programs`, `public.program({slug})`, `public.communityLinks`, `public.siteSettings`.
- New admin tRPC (no UI yet — Phase 3): programs CRUD/publish/archive, webinar details, program speakers, speakers CRUD, community links, site settings; `admin.registrations` takes `programId`.
- Client: `/programs` (status tabs + type filter), `/programs/:slug` (speakers, learn/who-for, resources, takeaway course, registration form, recording/join link by status), reusable `ProgramRegistration`, client-side meta via `usePageMeta`.
- db.ts: SQL-level published filter, transactional speaker updates, upserts, `inArray` speaker fetch.

## Notes
- Times are stored/entered as UTC; the site shows them in the visitor's timezone, emails in WAT.
- The `/` page is still the legacy single-program registration flow; the homepage redesign is separate.
- Per-page OG tags are client-side only for now; crawlers need the Phase 5 injection/prerender.
