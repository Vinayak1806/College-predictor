# Application

Next.js JavaScript application scaffold for querying PostgreSQL records generated from the
CAP PDF extraction pipeline. The browser should call API routes; it should never
download or search the complete CSV/PDF dataset directly.

Stack:

- Next.js with JavaScript
- Tailwind CSS
- shadcn/ui-ready component structure
- React Hook Form
- Zod
- Prisma
- PostgreSQL

Implemented routes/pages:

- Homepage
- Admission route selection
- FE predictor
- DSE predictor
- Prediction results
- College details
- Cutoff explorer
- College comparison
- CAP preference-list builder
- Admin dashboard
- Student account with saved profiles, history, comparisons and CAP lists
- Privacy, terms and admission disclaimer pages
- Search-engine sitemap, robots file and AI-readable college catalog

Operational features:

- `/api/health` checks the application and PostgreSQL connection.
- FE and DSE predictors use complete batched cutoff queries and short-lived hashed response caching.
- Admin prediction health reports backtest FE and DSE independently.
- Admin data quality reports missing FE/DSE seat matrices, fees, websites and mapping problems.
- CAP preference lists can be exported as a validated server-generated PDF.
- Analytics is disabled until the visitor accepts it.

API route contracts are implemented under `app/api`. Set `DATABASE_URL`, run
Prisma generation/migrations, import the processed CSVs, and then start the app.

For beginner-friendly Windows commands, see `BEGINNER_COMMANDS.md`.
For production environment variables, OAuth, backups, monitoring and launch checks,
see `DEPLOYMENT.md`.
For the exact pre-launch order, use `STAGING_CHECKLIST.md`.

Useful checks while the website is running:

```powershell
$env:BASE_URL="http://localhost:3000"
pnpm test:smoke
pnpm test:load
```

Start development with `pnpm dev`. The command always uses port `3000`, clears
the generated development cache before a clean start, and refuses to launch a
second server when the project is already running. This prevents stale
`ChunkLoadError` pages caused by multiple Next.js servers on different ports.

Seat matrix data is extracted into `data/staging/FE_<year>_SeatMatrix.csv` and
can be imported with `database/import_seat_matrix_csv.sql`.
