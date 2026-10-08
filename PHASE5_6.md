# Phases 5 + 6

## Phase 5 — SEO
- `/sitemap.xml` (home, programs, partner, contact + every published, non-archived program with lastmod) and `/robots.txt` (blocks /admin, /auth, /register, /api/; points at the sitemap), generated on demand and cached.
- `/programs/:slug` is served with its own `<head>`: title, description, canonical, Open Graph + Twitter tags (cover/share image), and schema.org `Event` data. Uses the SEO title / description / share image fields from Admin → Programs. Unknown or unpublished slugs return a real 404 with noindex; if the database is down the default tags are served instead of an error.
- `/programs`, `/partner`, `/contact` get their own titles/descriptions; `/register` is noindex.
- `vercel.json`: those paths are rewritten to the API function; `includeFiles` bundles `dist/public/index.html` so the function can inject tags. Set `PUBLIC_APP_URL` to the real site URL (it is used for canonical links, the sitemap and image URLs).

## Phase 6 — reminders and follow-ups
- New tables `scheduledEmailRules` / `scheduledEmailDeliveries`; admin tab **Email centre → Reminders**; endpoint `/api/cron/reminders`. See SCHEDULING.md — nothing sends automatically until a scheduler is set up.
- `sendConfiguredEmail` moved to `server/mailer.ts` (accepts an explicit idempotency key).

## Database
`drizzle/REFERENCE_phase6_scheduled_emails.sql` (already applied to the Supabase project; includes the 3 default rules). `supabase/schema.sql` includes it for fresh installs.
