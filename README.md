# 🎓 Admission Compass — Maharashtra FE & DSE College Predictor

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38BDF8?logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A data-first web application for exploring official MHT-CET (First-Year) and Direct Second-Year (DSE) CAP cutoffs, calculating admission probabilities, comparing engineering colleges side-by-side, and generating validated CAP preference lists.

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

---

## 🏗️ Architecture & How It Works

```
┌───────────────────────────┐      ┌─────────────────────────────┐      ┌───────────────────────────┐
│     Official CAP PDFs     │      │   Extraction & Validation   │      │   PostgreSQL & Prisma     │
│ (Cutoffs & Seat Matrices) │ ───► │ (Python pdfplumber Engine)  │ ───► │ (Structured Relational DB)│
└───────────────────────────┘      └─────────────────────────────┘      └───────────────────────────┘
                                                                                      │
                                                                                      ▼
┌───────────────────────────┐      ┌─────────────────────────────┐      ┌───────────────────────────┐
│  CAP Option List / PDFs   │ ◄─── │ Next.js 15 App Router API   │ ◄─── │ Predictor Algorithm Engine│
│   (Server-Generated)      │      │  (Caching & Search Routes)  │      │(Margin & Volatility Rules)│
└───────────────────────────┘      └─────────────────────────────┘      └───────────────────────────┘
```

### 1. PDF Extraction & Administrative Quality Control
- Official CAP allotment PDFs and Seat-Matrix PDFs are processed via an extraction pipeline (`pdfplumber` + `pandas`).
- Staged records undergo automated validation (verifying 5-digit institute codes, seat-type aliases, and percentile ranges).
- Admin Quality Centre flags unknown institute codes or duplicate rows for manual review before data goes live.

### 2. Prediction Algorithm & Zone Categorization
The prediction engine evaluates candidate scores against historical closing percentile/score cutoffs:
- 🟢 **Safe**: Candidate percentile exceeds historical cutoff by $+2.00$ points or more.
- 🔵 **Target**: Candidate percentile is within $[-1.50, +2.00]$ points of historical cutoff.
- 🟠 **Ambitious**: Candidate percentile is within $[-5.00, -1.50)$ points below historical cutoff.
- 🔴 **Highly Ambitious**: Candidate percentile is more than $5.00$ points below cutoff.

### 3. Seat Matrix & Quota Resolution Engine
- Automatically resolves Home University (HU) vs. Other Than Home University (OHU) seats based on candidate's home university.
- Applies Category & Gender eligibility rules for seat codes (e.g., `GOPENH`, `LOPENH`, `GSEBCO`, `EWS`, `TFWS`, `DEFENCE`, `PWD`).

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend UI** | Next.js 15 (App Router), React 19, Vanilla CSS & Tailwind CSS, Lucide Icons |
| **Backend & APIs** | Next.js Server Components, API Route Handlers, Node.js |
| **Database & ORM** | PostgreSQL, Prisma ORM |
| **Data Extraction** | Python 3.11, `pdfplumber`, `pandas` |
| **PDF Generation** | Server-side PDF generation (`pdfkit`) |
| **Testing** | Node native test runner (`node --test`), Playwright (E2E) |

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js `20.x` or higher
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
```

### 2. Database Initialization
```bash
# Generate Prisma Client
pnpm prisma generate

# Apply Database Schema Migrations
pnpm prisma db push
```

### 3. Start Development Server
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

---

## 📄 License

This project is licensed under the MIT License. See `LICENSE` for details.

