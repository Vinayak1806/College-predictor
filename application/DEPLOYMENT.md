# Production launch guide

## 1. Choose a compatible application host

- Create a managed PostgreSQL database with automated daily backups.
- Deploy the application to a host that runs Node.js and Python 3 and supports a
  mounted persistent disk.
- Use a custom HTTPS domain before changing Google OAuth production URLs.

The admin importer starts the Python PDF extractor and stores original uploads
on disk. A serverless host with temporary storage cannot safely run that feature
without moving extraction and file storage into separate services.

## 2. Configure production environment variables

Copy the names from `.env.example` into the hosting dashboard. Never upload the
local `.env` file. Use new production values for `DATABASE_URL`,
`BETTER_AUTH_SECRET`, `ADMIN_IMPORT_TOKEN`, and the Google OAuth credentials.

Set:

- `BETTER_AUTH_URL` and `NEXT_PUBLIC_SITE_URL` to the final `https://` domain.
- `SECURE_DEPLOYMENT=true`.
- `ALLOW_SEARCH_INDEXING=false` for staging and `true` only on the public site.
- `RELEASE_ID` to the commit hash or release number.
- `ADMIN_IMPORTS_ROOT` to an absolute folder on the mounted persistent disk.
- `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` only after creating the production GA property.
- `NEXT_PUBLIC_SUPPORT_EMAIL` before publishing the privacy and terms pages.

The application host must install the packages in `data-pipeline/requirements.txt`.
Set `PYTHON_EXECUTABLE` when Python is not available as `python3` or `python`.

## 3. Configure Google OAuth

Add the production domain as an authorized JavaScript origin and add
`https://YOUR-DOMAIN/api/auth/callback/google` as an authorized redirect URI.
Keep the localhost entries for local development.

## 4. Build and verify

Run:

```powershell
pnpm check:deploy
```

This validates production environment variables, runs the JavaScript tests and
creates a production Next.js build.

## 5. Copy the local database to staging

Create a verified backup:

```powershell
pnpm backup:db
```

Restore it only into a database whose name contains `stage` or `staging`:

```powershell
pnpm restore:staging -- -BackupPath "..\backups\college_predictor-YYYYMMDD-HHMMSS.dump" -StagingDatabaseUrl "postgresql://USER:PASSWORD@HOST:5432/admission_compass_staging?sslmode=require"
```

The restore command refuses to target the configured local database and checks
the backup hash when a SHA-256 manifest is available. It replaces existing data
inside the staging database.

Some providers use a fixed database name such as `railway`. For that staging
database, add `-ConfirmTarget STAGING` to the command. This explicit confirmation
does not bypass the protection against restoring over the configured local database.

## 6. Deploy the container

The repository-root `Dockerfile` packages Next.js, Prisma, Python and the PDF
extractor. Configure the host to build from the repository root using that file.

Mount a persistent disk at:

```text
/data/admin-imports
```

The container already sets `ADMIN_IMPORTS_ROOT` and `PYTHON_EXECUTABLE` to the
correct internal paths. The mounted directory must be writable by the container.

## 7. Keep staging private from search engines

Leave `ALLOW_SEARCH_INDEXING=false` on staging. The application returns a
`noindex` header and a blocking `robots.txt`. Change it to `true` only after the
public domain has passed every launch check.

## 8. Verify the deployed staging website

```powershell
$env:BASE_URL="https://YOUR-DOMAIN"
pnpm test:smoke
pnpm test:load
pnpm monitor:production
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

## 9. Enable Google Analytics after the public URL exists

Create a GA4 web stream, set `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` to its `G-...`
measurement ID, and redeploy. Analytics loads only in production and only after
the visitor accepts the analytics choice. Confirm the visit in the GA4 Realtime
report before launch.
