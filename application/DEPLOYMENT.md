# Deploy to Render Free (Complete Guide)

This guide walks you through deploying Admission Compass to **Render Free** with:

- **Neon** — free PostgreSQL database
- **Supabase** — free storage for admin PDF uploads
- **Sentry** — free error monitoring (via GitHub Student Developer Pack)

> [!TIP]
> Total cost: **₹0** — all services are on free tiers.

---

## Prerequisites

- A [GitHub](https://github.com) account with this repository pushed
- A [GitHub Student Developer Pack](https://education.github.com/pack) (for free Sentry Team plan)

---

## Step 1: Create the Neon PostgreSQL Database

Neon provides a free PostgreSQL database with generous limits.

1. Go to [neon.tech](https://neon.tech) and sign up with GitHub.
2. Click **Create project**.
3. Choose a region close to your Render deployment (e.g., `AWS us-east-1` for Render's default US region).
4. Copy the **connection string** — it looks like:
   ```
   postgresql://neondb_owner:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
5. Save this — you'll need it as `DATABASE_URL`.

### Push the database schema

From your local machine, set the Neon connection string temporarily and run the Prisma migration:

```powershell
cd application

# Set the Neon DATABASE_URL temporarily for this session
$env:DATABASE_URL = "postgresql://neondb_owner:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Push the schema to Neon (creates all tables)
npx prisma db push

# Verify the schema was applied
npx prisma studio
```

> [!IMPORTANT]
> `prisma db push` creates the tables without migration history. This is fine for initial setup. For future schema changes, use `prisma migrate deploy`.

### Transfer your local data to Neon

If you have published cutoff data in your local PostgreSQL, back it up and restore to Neon:

```powershell
# Create a local backup
pnpm backup:db

# Restore to Neon (use the staging restore script for safety)
pnpm restore:staging -- -BackupPath "..\backups\college_predictor-YYYYMMDD-HHMMSS.dump" -StagingDatabaseUrl "postgresql://neondb_owner:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require" -ConfirmTarget STAGING
```

---

## Step 2: Create the Supabase Storage Bucket

Supabase provides free object storage for admin PDF uploads (since Render Free has ephemeral disk).

1. Go to [supabase.com](https://supabase.com) and sign up with GitHub.
2. Click **New project**.
3. Choose a name (e.g., `admission-compass`) and a password.
4. Select the same region as your Neon database.
5. Wait for the project to finish provisioning (~2 minutes).

### Create the storage bucket

6. In the Supabase dashboard, go to **Storage** (left sidebar).
7. Click **New bucket**.
8. Name it `admin-imports`.
9. Set it to **Private** (not public — the server uses the service role key).
10. Click **Create bucket**.

### Get your Supabase credentials

11. Go to **Project Settings** → **API**.
12. Copy:
    - **Project URL** → this is your `SUPABASE_URL` (e.g., `https://xxxxx.supabase.co`)
    - **service_role key** (under "Project API keys", click "Reveal") → this is your `SUPABASE_SERVICE_ROLE_KEY`

> [!CAUTION]
> The **service_role key** has full access to your Supabase project. Never expose it in client-side code or commit it to Git. It should only be set as a server-side environment variable.

---

## Step 3: Set Up Sentry Error Monitoring

Sentry catches JavaScript errors and API failures in production automatically.

1. Go to [sentry.io](https://sentry.io) and sign up with GitHub.
2. If you have the **GitHub Student Developer Pack**, activate the free Sentry Team plan at [education.github.com/pack](https://education.github.com/pack).
3. Click **Create project**.
4. Platform: **Next.js**.
5. Name it (e.g., `admission-compass`).
6. Copy the **DSN** — it looks like:
   ```
   https://abc123@o123456.ingest.sentry.io/789
   ```
7. This is both your `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`.

### Get the auth token (for source map uploads)

8. Go to **Settings** → **Auth Tokens** (or [sentry.io/settings/auth-tokens/](https://sentry.io/settings/auth-tokens/)).
9. Click **Create new token**.
10. Give it the scopes: `project:releases`, `org:read`.
11. Copy the token → this is your `SENTRY_AUTH_TOKEN`.
12. Note your **org slug** (from the URL, e.g., `your-org`) → `SENTRY_ORG`.
13. Note your **project slug** (e.g., `admission-compass`) → `SENTRY_PROJECT`.

---

## Step 4: Deploy to Render

1. Go to [render.com](https://render.com) and sign up with GitHub.
2. Click **New** → **Web Service**.
3. Connect your GitHub repository.
4. Render will auto-detect the `render.yaml` blueprint. If it asks for configuration:
   - **Runtime**: Docker
   - **Dockerfile path**: `./Dockerfile`
   - **Docker context**: `.`
   - **Plan**: Free
   - **Branch**: `main`

### Set environment variables

5. In the Render dashboard, go to your service → **Environment**.
6. Add these variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon connection string |
| `BETTER_AUTH_URL` | `https://your-service.onrender.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://your-service.onrender.com` |
| `BETTER_AUTH_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `ADMIN_IMPORT_TOKEN` | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `SECURE_DEPLOYMENT` | `true` |
| `ALLOW_SEARCH_INDEXING` | `false` (change to `true` when ready to go public) |
| `RELEASE_ID` | Your latest commit hash or `v1.0.0` |
| `GOOGLE_CLIENT_ID` | Your Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth client secret |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | `admissioncompass.in@gmail.com` |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `SUPABASE_STORAGE_BUCKET` | `admin-imports` |
| `SENTRY_DSN` | Your Sentry DSN |
| `NEXT_PUBLIC_SENTRY_DSN` | Same as `SENTRY_DSN` |
| `SENTRY_AUTH_TOKEN` | Your Sentry auth token |
| `SENTRY_ORG` | Your Sentry org slug |
| `SENTRY_PROJECT` | Your Sentry project slug |
| `PYTHON_EXECUTABLE` | `/opt/admission-compass-python/bin/python` |

> [!IMPORTANT]
> **Google OAuth**: Add your Render URL (`https://your-service.onrender.com`) as an authorized JavaScript origin in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials). Add `https://your-service.onrender.com/api/auth/callback/google` as an authorized redirect URI.

7. Click **Manual Deploy** → **Deploy latest commit**.

---

## Step 5: Verify the Deployment

### Check the health endpoint

```bash
curl https://your-service.onrender.com/api/health
```

Should return HTTP 200 with `{ "status": "ok" }`.

### Verify Sentry is receiving events

1. Visit your deployed site.
2. Open the browser console and run: `throw new Error("Test Sentry integration")`
3. Check the Sentry dashboard — the error should appear within a few seconds.

### Verify Supabase Storage

1. Log into the admin interface.
2. Upload a test PDF.
3. Check the Supabase dashboard → **Storage** → `admin-imports` bucket — the file should appear.

### Run the smoke test

```powershell
$env:BASE_URL = "https://your-service.onrender.com"
pnpm test:smoke
```

---

## Known Limitations (Render Free)

| Limitation | Impact | Workaround |
|-----------|--------|------------|
| **Cold start** | 30–60 second delay after 15 min idle | First visitor waits; subsequent requests are fast |
| **512 MB RAM** | Large PDF extractions may fail | Upload smaller PDFs or split large ones |
| **Ephemeral disk** | Files lost on restart | Supabase Storage handles PDF persistence |
| **No custom domain** | Uses `*.onrender.com` | Get a free `.me`/`.tech` domain via Student Pack |
| **750 hours/month** | ~31 days = fine for a single service | No issue for one service |

---

## Updating After Deployment

Push to `main` and Render auto-deploys:

```bash
git add .
git commit -m "your changes"
git push origin main
```

For database schema changes, run migrations against Neon before deploying:

```powershell
$env:DATABASE_URL = "your-neon-connection-string"
npx prisma migrate deploy
```

---

## Troubleshooting

**Build fails on Render?**
- Check the build logs in the Render dashboard.
- Ensure all environment variables are set correctly.
- The Docker build requires ~1 GB RAM — Render Free provides enough for builds.

**"Cannot connect to database"?**
- Verify `DATABASE_URL` is correct and uses `?sslmode=require`.
- Check that Neon's project is not paused (free tier pauses after 5 days of inactivity).

**Admin PDF upload fails?**
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set.
- Check that the `admin-imports` bucket exists in Supabase.
- Check Sentry for the specific error.

**Google login doesn't work?**
- Add the Render URL as an authorized origin in Google Cloud Console.
- Add the callback URL (`/api/auth/callback/google`) as an authorized redirect URI.
- Wait a few minutes for Google to propagate the changes.
