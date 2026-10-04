# Phase 4 — partnerships, contact, registration export (+ admin sidebar fix, tagline tweak)

## Apply to the database (existing install)
Run `drizzle/REFERENCE_phase4_inbox.sql` once (creates 3 enums + `partnershipRequests`, `contactSubmissions`). Fresh installs: `supabase/schema.sql` already has it.

## What changed
- Public pages `/partner` and `/contact` (header + footer links). Honeypot field + per-email throttle (3 per hour, DB-based so it works on serverless). Partnership phone and link are optional; link without a scheme gets `https://`.
- Admin **Inbox** tab: partnership requests (status NEW / IN_REVIEW / ACCEPTED / DECLINED / ARCHIVED, internal notes, search, reply via mailto, delete) and contact messages (NEW / READ / ARCHIVED, reply marks read). New items raise the existing in-app admin notification; dashboard shows new-item counts.
- Requests tab: **Export CSV** (respects status / search / program filters; includes program title; spreadsheet formula-injection guard; UTF-8 BOM for Excel; audited).
- Fix: admin sidebar nav now scrolls and the account card sits below it instead of overlapping items.
- Tagline: removed "September" from the home hero, share text and meta tags.

Not included: admin email notification on new submissions (in-app notification only).

## Image uploads (speaker photo, program cover, share image)
- Replaces the image URL inputs with an upload field (click or drag & drop, preview, Replace / Remove; "use an image link instead" stays as a fallback).
- Images are validated, downsized and re-encoded in the browser (phone photos upload fast), then sent to `admin.uploadImage`, which checks the real file signature (PNG / JPEG / WebP only — no SVG/GIF), caps size at 3 MB, and stores it under `site-images/<folder>/` in the existing Supabase public bucket (same one used for email media — no new setup). Share images are always PNG/JPEG for social-crawler compatibility.
- Speaker photo / website can now be cleared.
- Replaced or removed images stay in the bucket (not auto-deleted).
