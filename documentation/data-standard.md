# Cutoff Data Standard

Every extracted cutoff record uses these CSV columns:

- `academic_year`
- `admission_route`
- `cap_round`
- `quota`
- `institute_code`
- `college_name`
- `branch_code`
- `branch_name`
- `college_status`
- `university`
- `section`
- `seat_type`
- `category`
- `gender`
- `university_type`
- `stage`
- `opening_rank`
- `closing_rank`
- `opening_score`
- `closing_score`
- `source_file`
- `source_page`
- `extraction_method`
- `verified`
- `needs_review`
- `review_reason`

For the current FE Maharashtra cutoff PDFs, the official text states that the
rank value is the State General Merit Number and the bracketed value is the
merit percentile. The extractor therefore stores:

- `closing_rank`: the extracted merit number.
- `closing_score`: the extracted percentile.
- `opening_rank` and `opening_score`: blank until an official source provides
  opening values.

Unique cutoff key:

`academic_year + admission_route + cap_round + quota + institute_code + branch_code + seat_type`

## Canonical Codes

Codes must be normalized before relational keys are created:

- `institute_code` is always five digits: `6155` becomes `06155`.
- `branch_code` and seat-matrix choice codes are always ten digits.
- Leading zeroes are significant and must not be removed by spreadsheet or JSON processing.
- College profiles, fees, cutoffs, and seat matrices must use the same normalized institute code.
- Verified replacement codes must be applied before relational records are built:
  `04005` becomes `14005` and `06006` becomes `16006`.
- When an institute code changes, replace the first five digits of its choice codes
  as well. This keeps historical cutoffs connected to the current college.
- Never infer a replacement code from a similar name. Add an alias only after the
  current CET Cell institute record has been verified.

Run `data-pipeline/normalize_staging_codes.py` for older staging CSV files, then run
`data-pipeline/validate_relational_exports.py` before importing PostgreSQL data.

## College locations

- Use the canonical Maharashtra district name for student-facing location filters.
- Keep one city record per canonical district; store the same canonical value in
  `cities.name` and `cities.district`.
- Store the CET admission region in `cities.region`.
- Prefer the reviewed college profile `District / City` field over parsing a
  college name or address.
- Never create a city from a PIN code, taluka, village, campus name, or arbitrary
  comma-separated address fragment.
- Normalize renamed districts: `Ahmednagar` to `Ahilyanagar`, `Aurangabad` to
  `Chhatrapati Sambhajinagar`, and `Osmanabad` to `Dharashiv`.
