# Production launch guide

## 1. Prepare services

- Create a managed PostgreSQL database with automated daily backups.
- Deploy the Next.js application to Vercel or another Node.js host.
- Use a custom HTTPS domain before changing Google OAuth production URLs.

## 2. Configure production environment variables

Copy the names from `.env.example` into the hosting dashboard. Never upload the
local `.env` file. Use new production values for `DATABASE_URL`,
`BETTER_AUTH_SECRET`, `ADMIN_IMPORT_TOKEN`, and the Google OAuth credentials.

Set:

- `BETTER_AUTH_URL` and `NEXT_PUBLIC_SITE_URL` to the final `https://` domain.
- `SECURE_DEPLOYMENT=true`.
- `RELEASE_ID` to the commit hash or release number.
- `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` only after creating the production GA property.
- `NEXT_PUBLIC_SUPPORT_EMAIL` before publishing the privacy and terms pages.

## 3. Configure Google OAuth

Add the production domain as an authorized JavaScript origin and add
`https://YOUR-DOMAIN/api/auth/callback/google` as an authorized redirect URI.
Keep the localhost entries for local development.

## 4. Build and verify

Run:

```powershell
pnpm test
pnpm build
```

After deployment:

```powershell
$env:BASE_URL="https://YOUR-DOMAIN"
pnpm test:smoke
pnpm test:load
```

Check `/api/health` from an uptime monitor every five minutes. Alert when it
returns anything other than HTTP 200.

## 5. Database safety

- Run Prisma schema changes before publishing a release.
- Back up the production database before each cutoff import.
- Test a restore into a separate database at least once per month.
- Keep admin imports in preview until validation errors are corrected and a
  human approves publication.

## 6. Search launch

- Verify the domain in Google Search Console.
- Submit `/sitemap.xml`.
- Confirm `/robots.txt`, `/llms.txt`, and several college pages are public.
- Do not index `/admin`, `/account`, login, or private saved data.
