# FE and DSE College Predictor

Data-first foundation for a Maharashtra engineering college predictor.

This repository currently implements the first practical milestone against the
available FE cutoff PDFs:

- Preserve original PDFs under `data/raw`.
- Extract cutoff rows into staging CSV files.
- Validate seat types, numeric ranges, source metadata, and duplicate keys.
- Generate import reports before anything is considered publishable.
- Run a basic FE predictor from validated staging data.

The roadmap intentionally starts with data accuracy and prediction rules before
building the full student-facing website.

## Current Dataset

The normalized starter file is:

`data/raw/fe/2025/FE_2025_CAP3_MH.pdf`

It was copied from the root-level `2025ENGG_CAP3_CutOff.pdf`; the original file
was not modified.

## Quick Start

Use the bundled Python runtime available in Codex, or any Python 3.11+ runtime
with the packages in `data-pipeline/requirements.txt`.

Extract and validate a small sample:

```powershell
& 'C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' `
  data-pipeline\extract_cutoffs.py `
  --input data\raw\fe\2025\FE_2025_CAP3_MH.pdf `
  --output data\staging\FE_2025_CAP3_MH_sample.csv `
  --report data\reports\FE_2025_CAP3_MH_sample.json `
  --limit-pages 20
```

Extract the full PDF:

```powershell
& 'C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' `
  data-pipeline\extract_cutoffs.py `
  --input data\raw\fe\2025\FE_2025_CAP3_MH.pdf `
  --output data\staging\FE_2025_CAP3_MH.csv `
  --report data\reports\FE_2025_CAP3_MH.json
```

Convert all available FE CAP cutoff PDFs from 2023 to 2025:

```powershell
& 'C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' `
  data-pipeline\run_batch_extraction.py
```

Build PostgreSQL-ready relational CSV exports from clean staged records:

```powershell
& 'C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' `
  data-pipeline\build_relational_exports.py
```

Run a simple FE prediction from a staged CSV:

```powershell
& 'C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' `
  data-pipeline\predict_fe.py `
  --cutoffs data\staging\FE_2025_CAP3_MH.csv `
  --percentile 92.5 `
  --category OBC `
  --gender FEMALE `
  --university-type HOME `
  --branch "Computer" `
  --city Pune
```

## Important Accuracy Notes

PDF text extraction can collapse blank table cells. When the number of extracted
values does not match the number of seat-type headings, the extractor keeps the
records but marks them as `needs_review` with the issue
`COLUMN_ALIGNMENT_UNCERTAIN`.

Only records from reviewed and published datasets should be shown to students.
