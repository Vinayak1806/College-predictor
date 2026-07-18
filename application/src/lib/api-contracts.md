# API Contracts

Initial routes once the Next.js API layer is added:

- `GET /api/colleges`
- `GET /api/colleges/:slug`
- `GET /api/branches`
- `GET /api/cities`
- `GET /api/cutoffs`
- `POST /api/predict/fe`
- `POST /api/predict/dse`
- `POST /api/admin/datasets/upload`
- `GET /api/admin/datasets/:id/preview`
- `POST /api/admin/datasets/:id/validate`
- `POST /api/admin/datasets/:id/publish`

Prediction response shape:

```json
{
  "college": "Example Engineering College",
  "branch": "Computer Engineering",
  "zone": "TARGET",
  "studentScore": 89.2,
  "closingCutoff": 88.5,
  "margin": 0.7,
  "year": "2025-26",
  "round": 3,
  "seatType": "GOBCH",
  "reason": "Your score is 0.70 above the previous closing cutoff.",
  "sourceUrl": "official-source"
}
```

