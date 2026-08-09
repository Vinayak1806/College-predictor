# Maharashtra FE and DSE College Predictor

A data-first admission planning application built from official Maharashtra CAP
cutoff and seat-matrix records.

## Architecture

```text
Official PDFs -> Python extraction and validation -> PostgreSQL -> Next.js APIs -> Student website
```

- `application/`: Next.js, React, Prisma, Zod and PostgreSQL application.
- `data-pipeline/`: Python PDF extraction, normalization and validation.
- `data/raw/`: repository copies of manually collected official PDFs.
- `data/admin-imports/`: ignored working storage for files uploaded by admins.
- `application/prisma/schema.prisma`: authoritative database schema.
- `documentation/`: import, security, deployment and launch guidance.

## Requirements

- Node.js 20 or newer
- pnpm through Corepack
- Python 3.11 or newer with `data-pipeline/requirements.txt`
- PostgreSQL 16 or newer

```powershell
corepack enable
corepack prepare pnpm@latest --activate
python -m pip install -r data-pipeline/requirements.txt
```

When Python is not available as `python`, set its executable in
`application/.env`:

```env
PYTHON_EXECUTABLE="C:\path\to\python.exe"
```

## Start Locally

```powershell
cd application
pnpm install
pnpm prisma generate
pnpm dev
```

Open `http://127.0.0.1:3000`.

## Checks

Run from `application/`:

```powershell
pnpm test
pnpm test:e2e
pnpm build
```

`pnpm test:e2e` runs real browser workflows. FE and DSE prediction tests expect
published official records in the configured database. CI skips only those two
data-dependent cases while still testing navigation, mobile forms, login and
administrator protection.

## Data Imports

Administrators upload official cutoff or seat-matrix PDFs from `/admin`. Every
file is extracted into staging, validated, reviewed, and explicitly published.
The live application never searches inside PDFs.

See [documentation/import-process.md](documentation/import-process.md).

## Database Safety

Prisma schema and migrations are the only schema source of truth. Before a
deployment or migration:

```powershell
cd application
pnpm backup:db
```

Restore tests must use an isolated test database. See
[documentation/launch-runbook.md](documentation/launch-runbook.md).
