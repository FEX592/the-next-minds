# THE NEXT MIND

THE NEXT MIND is a registration and administration platform for the AI for Students initiative. It provides a guided public registration experience, administrator review tools, invitation-based administrator access, centralized email automation, notifications, audit history, and secure account management.

## Authentication

The application uses email-and-password accounts with signed HTTP-only session cookies. Google and other social sign-in providers are not used. When the database has no users, `/auth` presents the first-administrator setup flow. After the first administrator exists, additional administrators are created through one-time invite links from the admin panel.

The optional `BOOTSTRAP_ADMIN_TOKEN` environment variable can require a private setup token during first-administrator creation. Passwords are stored as scrypt hashes and are never stored in plaintext.

## Main routes

| Route | Purpose |
| --- | --- |
| `/` | Public student registration flow |
| `/auth` | First-administrator setup or account sign-in |
| `/auth/signup/:token` | One-time invited account creation |
| `/admin` | Protected administration console |

## Configuration

The runtime reads configuration from environment variables. Do not commit secrets to source control.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (Supabase). Use the Transaction pooler (port 6543) string on Vercel/serverless; either the pooler or the direct (5432) string works for local dev and `drizzle-kit` commands. If the Supabase-Vercel integration is connected instead, its `POSTGRES_URL` is used automatically and this can be left unset on Vercel |
| `JWT_SECRET` | Session-cookie signing secret |
| `MANUS_EMAIL_AUTOMATION_URL` | Email automation API endpoint |
| `MANUS_EMAIL_AUTOMATION_KEY` | Optional server-side email automation credential |
| `BOOTSTRAP_ADMIN_TOKEN` | Optional first-administrator setup token |
| `BUILT_IN_FORGE_API_URL` | Managed platform API URL when required by integrations |
| `BUILT_IN_FORGE_API_KEY` | Managed platform API credential |

The email automation API key can also be configured from the protected admin email setup screen, where it is encrypted before database storage.

## Development

Install dependencies and start the development server:

```bash
pnpm install
pnpm dev
```

Run validation:

```bash
pnpm check
pnpm test
pnpm build
```

## Database

The project uses Drizzle ORM with Postgres, targeting Supabase. Schema changes belong in `drizzle/schema.ts`; generate and apply migrations with:

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

(equivalent to `pnpm db:push`). Review migration SQL before applying it to the configured database.

For a brand-new Supabase project, `supabase/schema.sql` is a ready-to-run alternative: paste it into the Supabase SQL Editor to create every table in one step, without needing `drizzle-kit` or a local Node setup first. Use one path or the other, not both, against the same database — see the comment at the top of that file.

## Deploying to Vercel + Supabase

1. **Create the Supabase project**, then either:
   - connect the official **Supabase-Vercel integration** (Supabase dashboard → *Settings → Integrations*) and point it at this Vercel project — it syncs a `POSTGRES_URL` env var automatically, which the app reads as a fallback for `DATABASE_URL`, or
   - from *Project Settings → Database → Connection string*, copy the **Transaction pooler** URI (port `6543`) and set it as `DATABASE_URL` yourself.
2. **Create the schema**: run `supabase/schema.sql` in the Supabase SQL Editor (or `pnpm drizzle-kit generate && pnpm drizzle-kit migrate` locally against the pooler/direct URL).
3. **Import the repo into Vercel** (New Project → your Git repo). It's a plain Node/Vite project (`vercel.json` sets `buildCommand`/`outputDirectory` and routes `/api/*` to `api/index.ts`), so no framework preset is needed.
4. **Set environment variables** in the Vercel project (`Settings → Environment Variables`): `DATABASE_URL`, `JWT_SECRET`, and the other variables from the table above as needed. Skip `BOOTSTRAP_ADMIN_TOKEN` unless you want to require a setup token.
5. **Deploy.** Then visit `/auth` on the deployed URL to create the first administrator — this only works once, while the `users` table is empty.

The repo ships a `.npmrc` with `node-linker=hoisted`, which makes pnpm lay out `node_modules` flat instead of its default symlinked structure. Vercel's function bundler traces dependencies more reliably against a flat layout — without it, some packages can fail to resolve at runtime even though the build succeeds. Keep this file if you regenerate `pnpm-lock.yaml`.

Never place passwords, API keys, OAuth secrets, or database credentials in source files, client bundles, screenshots, or committed environment files.
