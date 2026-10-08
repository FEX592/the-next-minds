# Reminders & follow-ups — how to make them actually send

The app sends scheduled emails when `/api/cron/reminders` is called. Something has to call it every 5–15 minutes.

1. In Vercel → Project → Settings → Environment Variables add `CRON_SECRET` (any long random string) and redeploy.
2. Pick ONE scheduler:

**A. Supabase pg_cron (free, works on any Vercel plan)** — run in the Supabase SQL editor:
```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('next-mind-reminders', '*/10 * * * *', $$
  select net.http_get(
    url := 'https://YOUR-SITE.vercel.app/api/cron/reminders',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET')
  );
$$);
```
(The secret is stored inside the job definition; rotate it by re-running `cron.schedule` with the same name.)

**B. Vercel Cron — Pro plan only.** Hobby accepts one run per day, which is too coarse for 1-hour reminders, and a sub-daily schedule makes a Hobby deployment fail. On Pro add to `vercel.json`:
```json
"crons": [{ "path": "/api/cron/reminders", "schedule": "*/10 * * * *" }]
```
Vercel sends `Authorization: Bearer $CRON_SECRET` itself.

**C. A free ping service (UptimeRobot, cron-job.org, Ping Bot …)** — no code. Create an HTTP monitor / cron job that opens this address every 5 minutes:
```
https://YOUR-SITE.vercel.app/api/cron/reminders?key=YOUR_CRON_SECRET
```
Free tiers can't usually send custom headers, which is why the secret can go in the address. Keep that address private. If someone else learns it the worst they can do is run the job early; it only ever sends emails that are due, once each.

## Behaviour
- Rules live in Admin → Email centre → Reminders (defaults: 24 h before, 1 h before, and a paused follow-up 1 day after the program ends). Add, edit (in the composer pop-up, with merge fields and HTML view), pause or delete them.
- Each registrant gets each email once (unique per rule + registration, claimed atomically); failed sends retry up to 3 times.
- A reminder only goes out within a window after its trigger time (up to half its lead time, 15–120 min) and never after the program has started, so an outage can't produce a “24 hours before” email 3 hours out.
- Recipients are accepted registrations of published, non-archived programs that have a start time.
- Each run sends at most ~30 emails / 8 s; anything left is picked up by the next run.
- “Run now” in the admin runs the same job manually; “Send test” sends a rule with sample data to any address.
