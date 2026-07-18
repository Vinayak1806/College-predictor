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

API route contracts are implemented under `app/api`. Set `DATABASE_URL`, run
Prisma generation/migrations, import the processed CSVs, and then start the app.

For beginner-friendly Windows commands, see `BEGINNER_COMMANDS.md`.

Seat matrix data is extracted into `data/staging/FE_<year>_SeatMatrix.csv` and
can be imported with `database/import_seat_matrix_csv.sql`.
