# Launch Runbook

## Before Deployment

1. Configure production environment variables from `application/.env.example`.
2. Use HTTPS for `BETTER_AUTH_URL` and `NEXT_PUBLIC_SITE_URL`.
3. Run `pnpm check:deploy` from `application/`.
4. Run the complete browser suite with `pnpm test:e2e` against a database that
   contains published FE and DSE datasets.
5. Create and verify a PostgreSQL backup with `pnpm backup:db`.
6. Test that backup against an isolated database whose name contains `test`,
   `restore`, or `backup`:

```powershell
pnpm restore:test -- -BackupPath "..\backups\college_predictor-YYYYMMDD-HHMMSS.dump" -TestDatabaseUrl "postgresql://USER:PASSWORD@HOST:5432/college_predictor_restore_test"
```

The restore script refuses to use the configured live database.

## After Deployment

1. Open `/api/health` and require `status: ok` and `database: reachable`.
2. Run `PRODUCTION_URL=https://your-domain.example pnpm monitor:production`.
3. Add the deployed URL as the GitHub Actions variable `PRODUCTION_URL` to
   activate the six-hour production monitor.
4. Run FE and DSE predictions with known profiles.
5. Verify student login, CAP-list save/download, and administrator login.
6. Upload a small official test document to staging, but do not publish it.
7. Confirm analytics, error logs, and the health endpoint after each release.

## Recovery

1. Stop publishing new datasets.
2. Preserve the failed import and its extraction report.
3. Roll back the affected dataset from the admin dashboard when possible.
4. Restore PostgreSQL only from a verified backup and only after confirming the
   target database URL.
5. Run route, browser, and prediction tests before reopening the application.
