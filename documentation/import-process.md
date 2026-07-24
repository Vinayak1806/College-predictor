# Dataset Import Process

No extracted record should be published directly to students.

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
