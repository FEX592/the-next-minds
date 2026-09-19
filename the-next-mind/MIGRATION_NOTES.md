# THE NEXT MIND migration notes

## Completed in this source package

The admin authentication flow no longer registers or calls Manus OAuth, Google OAuth, or Gmail OAuth. It now uses local email/password accounts with signed HTTP-only session cookies, scrypt password hashes, one-time invite links, and account/password management procedures. Generated admin invite links now open the local signup page, and signup consumes the invite atomically before granting the administrator role.

Because a new installation has no existing administrator, `/auth` now exposes a one-time **Create the first administrator** flow while the users table is empty. It creates the first account directly as `admin`; there is no default email or password. Set `BOOTSTRAP_ADMIN_TOKEN` before hosting if you want to require a private setup token during bootstrap. Once one user exists, the bootstrap endpoint permanently closes and future administrators must be invited from the panel.

Email delivery now has one provider contract: the configurable Manus Email Automation API. Gmail token exchange, Gmail API calls, Google admin allowlists, and their route modules were removed. The email API URL and key are configured server-side, while the admin email setup sends the API key through the existing protected admin procedure and stores it encrypted.

## Required database migration

Apply `drizzle/0006_local_auth.sql` to the existing database before using local signup. Existing accounts have no password hash; they must be recreated through an invite or populated through a controlled account-recovery process. Do not put password hashes or API keys in source control.

## Required server variables

```text
JWT_SECRET=<long random secret>
DATABASE_URL=<current application database connection>
MANUS_EMAIL_AUTOMATION_URL=<your email automation endpoint>
MANUS_EMAIL_AUTOMATION_KEY=<server-side API key>
BOOTSTRAP_ADMIN_TOKEN=<optional long random token for first-admin setup>
FIREBASE_PROJECT_ID=<reserved for the datastore cutover described below>
FIREBASE_API_KEY=<reserved for the datastore cutover described below>
```

## Firebase datastore status

This package deliberately does **not** claim that the existing registration/admin data has been moved to Firebase. The current app contains a large Drizzle/MySQL query surface for registrations, templates, notifications, logs, audits, and invites. A safe Firebase cutover requires translating those queries into Firestore/Realtime Database operations, adding transaction/index rules, migrating existing rows, and updating every admin procedure. Leaving the MySQL adapter in place while merely adding Firebase variables would create a split-brain system and would be an unnecessary production bug risk.

The local auth and email changes are isolated so that this datastore rewrite can be performed next without reintroducing Manus authentication or provider coupling.

## Validation performed

- `pnpm exec tsc --noEmit` — passed.
- `pnpm test -- --run` — passed: 2 test files and 2 tests.

The source is intentionally delivered as code only; no hosting or deployment was performed.
