# 🎓 Admission Compass — Maharashtra FE & DSE College Predictor

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38BDF8?logo=tailwindcss)](https://tailwindcss.com/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)](https://www.python.org/)
[![Sentry](https://img.shields.io/badge/Monitoring-Sentry-362D59?logo=sentry)](https://sentry.io/)

A data-first web application for exploring official MHT-CET (First-Year) and Direct Second-Year (DSE) CAP cutoffs, calculating admission probabilities, comparing engineering colleges side-by-side, and generating validated CAP preference lists — built on a real end-to-end **data analytics pipeline**, not synthetic or hardcoded data.

---

## 🌟 Key Features & Capabilities

- **Dual Admission Predictors**:
  - **First-Year Engineering (FE)**: MHT-CET Percentile-based predictions across Home University (HU), Other Than Home University (OHU), and State-Level (SL) quotas.
  - **Direct Second-Year Engineering (DSE)**: Diploma Percentage-based predictions applying state-level seat allocation rules.
- **Explainable Admission Zones**: Categorizes admission chances into **Safe**, **Target**, **Ambitious**, and **Highly Ambitious** backed by historical cutoff margins and multi-year volatility metrics.
- **Verified Official Data**: Cutoffs and seat matrices are extracted automatically from official Maharashtra CET Cell CAP PDFs and published via a 2-step administrative validation pipeline.
- **Side-by-Side College Comparison**: Compare up to 3 choices simultaneously with Historical Demand Index scores, autonomy status, cutoff trends, and approved fee structures.
- **CAP Preference List Builder**: Reorder, risk-evaluate, and export personalized CAP option lists into downloadable PDFs.
- **College Catalog & Detail Pages**: Comprehensive institute pages displaying cutoff history, seat-matrix distribution, official website links, and FRA-approved fee breakdowns.
- **Production-Grade Observability**: Sentry-instrumented across the extraction pipeline and the Next.js app for real-time error tracking, release monitoring, and performance tracing.

---

## 📊 Data Analytics Pipeline — From Raw PDFs to Predictions

This is the core of the project: real government cutoff data goes through a genuine ETL (Extract–Transform–Load) pipeline before it ever reaches a user.

### 1. Extraction
- Official CAP allotment and seat-matrix PDFs (multi-hundred-page, table-heavy government publications) are parsed with **`pdfplumber`**, which handles the irregular table layouts across different CAP rounds and years.
- Extracted rows are loaded into **`pandas`** DataFrames for cleaning: normalizing institute codes, standardizing seat-type labels (`GOPENH`, `LOPENH`, `GSEBCO`, `EWS`, `TFWS`, `DEFENCE`, `PWD`, etc.), coercing percentile/percentage columns to numeric types, and dropping/flagging malformed rows.
- Duplicate detection and schema checks (5-digit institute code format, valid percentile range 0–100, known seat-type aliases) run at this stage, so bad data never silently reaches the database.

### 2. Transformation & Feature Engineering
- Cleaned records are aggregated across CAP rounds and academic years to compute **derived analytics features** used directly by the prediction engine:
  - Year-over-year cutoff **volatility** (standard deviation of closing percentile across recent years)
  - **Historical Demand Index** per college/branch, used in the comparison tool
  - Cutoff **margin bands** that back the Safe / Target / Ambitious / Highly Ambitious zone logic
- This transformation step is what turns a static archive of PDFs into something that can actually answer "what are my real chances here?"

### 3. Loading & Storage
- Transformed, validated records are written into **PostgreSQL** via Python (using `psycopg2`/SQLAlchemy in the extraction service), keeping raw staged data separate from the published tables.
- **Prisma ORM** is then used on the Next.js side to query the same PostgreSQL database with type-safe models, powering the predictor, comparison, and catalog features.
- A 2-step Admin Quality Centre review sits between staging and publishing: unknown institute codes or duplicate rows are flagged for manual confirmation before they go live, so the analytics layer stays trustworthy over time.

### 4. Monitoring the Pipeline
- **Sentry** is integrated on both sides of the stack:
  - In the Python extraction/ETL service, to catch and alert on malformed PDFs, parsing failures, and data-validation errors during ingestion.
  - In the Next.js application, for runtime error tracking, API route exceptions, and performance tracing on the prediction and search endpoints.
- This closes the loop from "raw PDF" to "production-monitored analytics platform" — errors in either the data pipeline or the web app surface immediately instead of failing silently.

```
┌───────────────────────────┐      ┌─────────────────────────────┐      ┌───────────────────────────┐
│     Official CAP PDFs     │      │   Extraction & Validation   │      │   PostgreSQL & Prisma     │
│ (Cutoffs & Seat Matrices) │ ───► │  pdfplumber + pandas + ETL  │ ───► │ (Structured Relational DB)│
│                           │      │  [Sentry-monitored]         │      │                           │
└───────────────────────────┘      └─────────────────────────────┘      └───────────────────────────┘
                                                                                      │
                                                                                      ▼
┌───────────────────────────┐      ┌─────────────────────────────┐      ┌───────────────────────────┐
│  CAP Option List / PDFs   │ ◄─── │ Next.js 15 App Router API   │ ◄─── │ Predictor Algorithm Engine│
│   (Server-Generated)      │      │ (Caching & Search Routes)   │      │(Margin & Volatility Rules)│
│                           │      │ [Sentry-monitored]          │      │                           │
└───────────────────────────┘      └─────────────────────────────┘      └───────────────────────────┘
```

### Prediction Algorithm & Zone Categorization
The prediction engine evaluates candidate scores against historical closing percentile/score cutoffs:
- 🟢 **Safe**: Candidate percentile exceeds historical cutoff by $+2.00$ points or more.
- 🔵 **Target**: Candidate percentile is within $[-1.50, +2.00]$ points of historical cutoff.
- 🟠 **Ambitious**: Candidate percentile is within $[-5.00, -1.50)$ points below historical cutoff.
- 🔴 **Highly Ambitious**: Candidate percentile is more than $5.00$ points below cutoff.

### Seat Matrix & Quota Resolution Engine
- Automatically resolves Home University (HU) vs. Other Than Home University (OHU) seats based on candidate's home university.
- Applies Category & Gender eligibility rules for seat codes.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend UI** | Next.js 15 (App Router), React 19, Vanilla CSS & Tailwind CSS, Lucide Icons |
| **Backend & APIs** | Next.js Server Components, API Route Handlers, Node.js |
| **Database & ORM** | PostgreSQL, Prisma ORM |
| **Data Analytics / ETL** | Python 3.11, `pdfplumber`, `pandas`, `psycopg2`/SQLAlchemy |
| **PDF Generation** | Server-side PDF generation (`pdfkit`) |
| **Monitoring & Error Tracking** | Sentry (Python ETL service + Next.js app) |
| **Testing** | Node native test runner (`node --test`), Playwright (E2E) |

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js `20.x` or higher
- Python `3.11` or higher (for the extraction/ETL pipeline)
- `pnpm` (`corepack enable` or `npm i -g pnpm`)
- PostgreSQL database instance

### 1. Setup Environment
Clone the repository and install dependencies:
```bash
cd application
pnpm install
```

Configure your local environment variables in `application/.env`:
```env
# Database Connection (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/college_predictor?sslmode=disable"

# Application Settings
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Monitoring
SENTRY_DSN="your-sentry-dsn"
```

### 2. Database Initialization
```bash
# Generate Prisma Client
pnpm prisma generate

# Apply Database Schema Migrations
pnpm prisma db push
```

### 3. Run the Data Extraction Pipeline (optional — to (re)populate real data)
```bash
cd extraction
pip install -r requirements.txt
python run_pipeline.py --input ./cap_pdfs --output postgres
```

### 4. Start Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Running Tests & Validation

```bash
# Run unit and integration tests (94+ passing tests)
pnpm test

# Run end-to-end browser flows
pnpm test:e2e

# Run production build check
pnpm build
```

---

## 🛡️ Privacy, Security & Data Safety

- **Data Privacy**: No personal student records or sensitive marks sheets are stored publicly. User preferences and saved option lists remain strictly private to local browser storage or authenticated student accounts.
- **Official Data Disclaimers**: All cutoff values link back to official CAP PDF source pages. Approved fees are compiled from official FRA publications; users should cross-check on official college websites before final admission.
- **Security Best Practices**: Secrets, database credentials, and session keys are strictly isolated in `.env` configuration and kept out of public repositories.