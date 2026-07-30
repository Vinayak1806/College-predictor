# Admission Rules Notes

Scope for the initial build:

- Maharashtra B.E./B.Tech colleges.
- FE admission from MHT-CET percentile.
- DSE admission from diploma percentage or DSE merit number when DSE files are
  added.
- CAP rounds I to IV.
- Maharashtra State quota records.
- Category, gender, Home University, Other Than Home University, and State
  Level seat types.

## Route Separation

FE and DSE must remain separate throughout extraction, storage, validation, and
prediction.

Do not compare:

- DSE percentage with FE percentile.
- Rank-based cutoffs with score-based cutoffs using the same comparator.
- Different admission years as if they are identical.

## Seat-Type Code Basics

Common Maharashtra CAP seat-type code conventions:

- Leading `G`: General seat.
- Leading `L`: Ladies seat.
- Trailing `H`: Home University.
- Trailing `O`: Other Than Home University.
- Trailing `S`: State Level.
- `OPEN`: Open category.
- `SC`, `ST`, `VJ`, `NT1`, `NT2`, `NT3`, `OBC`, `SEBC`: Reserved categories.
- `PWD`: Persons with Disability.
- `DEF`: Defence.
- `TFWS`: Tuition Fee Waiver Scheme.
- `EWS`: Economically Weaker Section.
- `ORPHAN`: Orphan quota.

Example mappings:

```json
{
  "GOPENH": {
    "category": "OPEN",
    "gender": "GENERAL",
    "universityType": "HOME"
  },
  "LOPENH": {
    "category": "OPEN",
    "gender": "LADIES",
    "universityType": "HOME"
  },
  "GOBCH": {
    "category": "OBC",
    "gender": "GENERAL",
    "universityType": "HOME"
  },
  "GOPENS": {
    "category": "OPEN",
    "gender": "GENERAL",
    "universityType": "STATE"
  },
  "TFWS": {
    "category": "TFWS",
    "gender": "SPECIAL",
    "universityType": "STATE"
  }
}
```

These mappings are implemented in `data-pipeline/college_predictor/seat_types.py`
and should be checked against the latest official admission brochure before any
dataset is marked as published.
