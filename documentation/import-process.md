# Dataset Import Process

No extracted record should be published directly to students.

## Admin Data Import Centre

Open `/admin` and use **Upload official admission data**.

Currently supported:

- `CAP cutoff PDF`: FE or DSE route, academic year and CAP round.
- `FE seat-matrix PDF`: academic year, branch intake and CAP seat information.

The server stores original files under `data/admin-imports/`, calculates a SHA-256
hash to reject duplicate uploads, runs `data-pipeline/process_admin_upload.py`,
and writes extracted rows to `admin_import_records`.

For local development, imports work without a token. Before a production server
can use import APIs, configure:

```env
ADMIN_IMPORT_TOKEN="replace-with-a-long-random-secret"
PYTHON_EXECUTABLE="C:\path\to\python.exe"
```

Install Python dependencies in that Python environment:

```powershell
python -m pip install -r data-pipeline/requirements.txt
```

Open `/admin/login` and enter the same token. A secure HTTP-only session cookie
protects the dashboard and every `/api/admin/*` data route.
Do not commit `.env`.

Publishing behavior:

- Publication stays locked while any row needs review.
- Correct institute codes, branch mappings, seat types and numeric values in the
  staged-record editor, then validate the row again.
- Explicitly exclude an unusable extraction row when it should not be published.
- Only verified, non-excluded records are published.
- Cutoff publication creates one `PUBLISHED` cutoff dataset.
- Seat-matrix publication updates matching year/route/branch records and keeps
  the previous values for rollback.
- **Roll back** removes a published cutoff dataset or restores the earlier seat
  matrix values.

Unknown file layouts must get a dedicated extractor before they appear as an
upload option. Renaming an unrelated PDF does not make it compatible.

Required lifecycle:

1. Upload official file.
2. Extract records into staging.
3. Validate source metadata, seat types, numeric ranges, and duplicate keys.
4. Generate a report.
5. Review rejected and uncertain rows.
6. Approve the dataset.
7. Publish only verified records.

Before rebuilding PostgreSQL:

1. Create a compressed `pg_dump` backup.
2. Normalize staging codes.
3. Build relational exports.
4. Run `validate_relational_exports.py` and require zero errors.
5. Run `database/rebuild_normalized_data.sql` from the project root.
6. Import college profiles and fee rows.
7. Verify database counts and run prediction tests.

Dataset statuses:

- `UPLOADED`
- `PROCESSING`
- `NEEDS_REVIEW`
- `VERIFIED`
- `PUBLISHED`
- `REJECTED`

Only `PUBLISHED` datasets should be visible in prediction APIs.

## Manual Review Queue

Review these groups first:

- `UNKNOWN_SEAT_TYPE`
- `COLUMN_ALIGNMENT_UNCERTAIN`
- `RANK_SCORE_COUNT_MISMATCH`
- `MISSING_INSTITUTE_CODE`
- `MISSING_BRANCH_CODE`
- `DUPLICATE_UNIQUE_KEY`

The extractor is intentionally conservative. A high review count is acceptable
for raw PDF text extraction because official CAP PDFs often contain blank table
cells that are not preserved in plain text.
