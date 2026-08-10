# Maharashtra FE & DSE College Predictor — What this site provides

This site helps students and counsellors find Maharashtra engineering colleges
that match a given MHT‑CET percentile or diploma percentage. It compares your
profile against verified CAP cutoff records and presents clear, explainable
results to support admission preference-building.

Badges: [build] [docs] [license]

## What the website gives students

- Predictor (First‑Year / DSE): estimate admission zones (Safe / Target /
	Ambitious) for colleges and branches based on historical CAP cutoffs.
- College research pages: exact cutoff history, seat-type availability, fees
	and administrative notes for each institute.
- Preference builder: build, reorder and export a CAP preference list.
- Compare colleges: side‑by‑side branch and cutoff comparison across years.
- Save & export: save a profile or preference list for later, export to CSV.
- Transparency: every shown cutoff links back to the original CAP PDF and
	round so you can verify sources.

## How to use (for students)

1. Open the site and choose the predictor (First‑Year or DSE).
2. Enter your score (MHT‑CET percentile or diploma percentage) and category.
3. Select branches, cities and preference constraints (home/other university).
4. Review the ranked college suggestions and the supporting historical evidence.
5. Save or export your preference list for CAP submission.

Tips
- Use the comparison tool to check colleges where you have both Safe and
	Ambitious chances — this helps balance ambition and safety when ordering
	preferences.
- Check the "source" link on any result to view the official CAP PDF used.

## What results mean

- Safe / Target / Ambitious: historical zones derived from past allotment
	densities. They are informative signals, not guarantees.
- Confidence: a score reflecting how stable the historical cutoffs are for
	that branch (more years and consistent cutoffs increase confidence).
- Seat types & eligibility: the predictor applies actual seat-code rules for
	category, gender and home‑university where relevant.

## Data & transparency

All cutoff and seat-matrix values are sourced from official CAP PDFs. The
data pipeline extracts, validates and stores only structured records that have
been reviewed by an administrator — the live predictor only uses published
verified records. See the import handbook for the full process:
[documentation/import-process.md](documentation/import-process.md).

## Privacy & safety for students

- The site does not publish personal profiles. Saved profiles and preference
	lists remain private to the account that saved them.
- The application only stores the score and non-sensitive preference data
	required to run predictions unless you explicitly upload documents.
- If your institution requires additional privacy controls, check the
	deployment and admin documentation for data retention settings.

## Accessibility & support

- Designed to work on mobile and desktop with focus-ring and keyboard
	navigable controls. Report accessibility issues via the issue tracker.

## Try it locally (quick user preview)

To run a local preview (developer tools are not required for a quick check):

```bash
cd application
pnpm install
pnpm dev
# open http://127.0.0.1:3000
```

If you prefer not to run locally, ask the project maintainers for a demo
instance or temporary seed data that shows published cutoffs.

## For developers

This README focuses on the product and what it gives users. Developer and
deployment details live in the handbook:

- Developer handbook: [documentation/project-guide/README.md](documentation/project-guide/README.md)
- Deployment: [application/DEPLOYMENT.md](application/DEPLOYMENT.md)

If you'd like, I can add a short `CONTRIBUTING.md` and a one-page
`DEVELOPER_QUICKSTART.md` that extracts the most important development
commands from the handbook.

## Feedback and contributions

Feature requests, data-clarity questions and small fixes are welcome. Open an
issue describing the expected behavior and a short reproducible example where
possible.

---

This README is intentionally user-facing. Internal implementation details,
administrative scripts and CI configuration are documented in the project
handbook linked above.
# Maharashtra FE & DSE College Predictor

Lightweight, data-first web app for exploring Maharashtra CAP cutoff records
and predicting admission chances for First-Year (FE) and Direct Second-Year
(DSE) engineering admissions.

Key ideas: extract official PDFs into a validated relational dataset, expose
that data via Next.js APIs, and provide a clear, explainable predictor UI.

## Quick links

- Full project handbook: [documentation/project-guide/README.md](documentation/project-guide/README.md)
- Import workflow: [documentation/import-process.md](documentation/import-process.md)
- Deployment notes: [application/DEPLOYMENT.md](application/DEPLOYMENT.md)

## Features

- Official-data first: PDF extraction pipeline with validation and staging.
- Two predictors: First-Year (FE) and Direct Second-Year (DSE) admission flows.
- Transparent results: every prediction links back to source year, round and PDF.
- Admin UI: upload, review and publish official cutoff/seat-matrix PDFs.
- Tests: unit, integration and optional end-to-end browser tests.

## Tech stack

- Frontend: Next.js (App Router), React, Tailwind CSS
- Backend: Next.js API routes, Prisma ORM, PostgreSQL
- Data pipeline: Python scripts for PDF extraction and normalization

## Requirements

- Node.js 20+
- pnpm (via Corepack) or npm
- Python 3.11+ for the `data-pipeline`
- PostgreSQL 16+

Quick setup (Windows / PowerShell):

```powershell
corepack enable
corepack prepare pnpm@latest --activate
cd application
pnpm install
pnpm prisma generate
pnpm dev
```

If Python is not available as `python`, set the executable in `application/.env`:

```env
PYTHON_EXECUTABLE="C:\path\to\python.exe"
```

## Data pipeline

Extracted PDFs and normalized CSVs live under `data/` during processing. The
`data-pipeline/` folder contains extraction scripts and a `requirements.txt`
listing Python dependencies. Administrators upload PDFs from the `/admin`
interface; files are staged, validated, and must be explicitly published.

See [documentation/import-process.md](documentation/import-process.md) for details.

## Tests & checks

From `application/` run:

```powershell
pnpm test       # unit + integration
pnpm test:e2e   # browser end-to-end (data-dependent)
pnpm build
```

Note: E2E tests depend on published cutoff records. CI configuration avoids
breaking runs by skipping data-dependent cases unless a test database is
prepared with published fixtures.

## Deployment

The repository includes a Dockerfile that can run the Next.js frontend and the
Python extraction pipeline together. Use a managed PostgreSQL database and
mount persistent storage for uploaded PDFs. See
[application/DEPLOYMENT.md](application/DEPLOYMENT.md) and
[application/STAGING_CHECKLIST.md](application/STAGING_CHECKLIST.md).

## Contributing

Contributions are welcome. Start by reading the project handbook:
[documentation/project-guide/README.md](documentation/project-guide/README.md).
Open an issue for design or data questions, and create a pull request for code
changes. Keep commits small and add tests for new behavior.

## License & contact

See `LICENSE` at the repository root. For questions about data sources or
deployment, contact the repository maintainers listed in the handbook.

