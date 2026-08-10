# Staging Checklist

Use this checklist before making Admission Compass public.

## Services

- [ ] Managed PostgreSQL database created.
- [ ] Automated database backups enabled.
- [ ] Node.js 20 application service created.
- [ ] Python 3 and `data-pipeline/requirements.txt` installed.
- [ ] Persistent disk mounted for admin PDF imports.
- [ ] HTTPS staging domain available.

## Environment

- [ ] Copy every variable name from `.env.example` into the host dashboard.
- [ ] Use new staging secrets, never values from the local `.env` file.
- [ ] Set `ADMIN_IMPORTS_ROOT` to the mounted disk path.
- [ ] Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_SITE_URL` to the staging HTTPS URL.
- [ ] Set `SECURE_DEPLOYMENT=true`.
- [ ] Set `ALLOW_SEARCH_INDEXING=false`.
- [ ] Set `RELEASE_ID` to the Git commit or release name.
- [ ] Add the staging origin and Google callback URL in Google Cloud OAuth.

## Before Deployment

```powershell
pnpm check:deploy
```

- [ ] The configuration check passes.
- [ ] Unit tests pass.
- [ ] Production build succeeds.
- [ ] A fresh PostgreSQL backup is created and verified.

## After Deployment

```powershell
$env:BASE_URL="https://YOUR-STAGING-DOMAIN"
pnpm test:smoke
pnpm test:load
pnpm monitor:production
```

- [ ] `/api/health` reports that PostgreSQL is reachable.
- [ ] Google student login and logout work.
- [ ] First-Year and DSE predictions return expected results.
- [ ] College search, college pages and Cutoff Explorer work.
- [ ] Compare and CAP Preference List work.
- [ ] Admin login, PDF upload, review, publish and rollback work.
- [ ] Uploaded PDFs still exist after restarting the application service.
- [ ] Mobile layout works at 320px and 390px widths.
- [ ] Response headers include `X-Robots-Tag: noindex` on staging.

Do not point the public domain at staging until every required item passes.
