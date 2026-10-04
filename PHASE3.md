# Phase 3 — admin UI for the programs system

New admin tabs (sidebar): **Programs**, **Speakers**, **Site & links**. Dashboard gains a Programs overview; **Requests** gains a program filter.

- Programs: list with draft/published/archived state, status + type filters, publish/unpublish, archive/restore, "view live". One editor covers basics, schedule, content, webinar details (webinar type), speaker assignment (add / reorder / per-program topic), registration + community overrides, SEO. A single Save writes program, webinar details and speakers. New programs are drafts.
- Speakers: create / edit / delete (delete removes them from all programs).
- Site & links: featured program, hero/about copy, and community links (add / edit / activate / delete). `/programs` shows the featured program on top.
- Date inputs use the admin's local time and are stored as UTC instants.

Known limits: image fields are URL-only (no upload); an optional speaker photo/website can't be cleared once set (send a new value or edit via SQL); registrations export, partnership and contact inboxes are Phase 4.
