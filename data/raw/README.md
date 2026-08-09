# Official Source Files

`data/raw/` is the single repository location for manually collected official
CAP PDFs. Organize files by admission route and academic year:

```text
data/raw/
  fe/2025/
  dse/2025/
```

Files uploaded through the Admin Data Import Centre are retained separately in
the ignored `data/admin-imports/` directory with their extraction reports.
Those files should not be copied into the repository.

Never edit an official PDF. Normalized records belong in PostgreSQL, and
generated CSV/report files belong under `data/staging/` and `data/reports/`.
