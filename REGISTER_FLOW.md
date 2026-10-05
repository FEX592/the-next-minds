# Register flow + homepage (built on the Phase 4 zip)

## Apply to the database
1. If not already done: phase 1, 2 and 4 SQL files in `drizzle/` (use `REFERENCE_check_schema.sql` to see what's missing).
2. `drizzle/REFERENCE_programid_required.sql` — makes `registrations.programId` NOT NULL (it refuses to run if any registration still has no program).

## Flow
1. Programs appear on `/` and `/programs` as cards. Open programs have a **Select to register** toggle (also on each program page). Closed / completed programs can't be selected.
2. As soon as 1+ programs are selected, a **Register** bar appears at the bottom of the screen (selection survives navigation / refresh).
3. `/register` step 1: **Confirm your programs** (remove any, or add more). Step 2: your details. Then the confirmation screen lists every program you're registered for; the confirmation email lists them too.
4. `/register` with nothing selected says "Select a program first"; with no open programs it says "Registration is currently unavailable".
5. One registration row per (person, program). Already-registered or just-closed programs are skipped with a reason; the rest still go through. Max 10 programs per submission.

## Other changes
- Removed the "Join NEXT MIND" hero button and the header "Join" button (registration only starts from a selected program).
- Home hero rebuilt to match your screenshot (the Home in the Phase 4 zip was still the old registration page). Hero text can be overridden from Admin > Site & links.
- Admin **Registrations**: default filter is now All (program registrations are auto-confirmed, so "Pending" would have hidden them), new **Programs** column, and people registered for several programs show "Also: …".
- Old inline registration form on program pages removed (replaced by the selection flow).

## Live database status (applied directly via Supabase)
Phase 1, 2 and 4 migrations were applied to the project, with RLS enabled on every new table. `registrations."programId"` is still nullable because 4 legacy registrations (Sept 2026, no program) exist; run `drizzle/REFERENCE_programid_required.sql` after deleting or reassigning them.
