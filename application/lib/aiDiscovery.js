function cleanMarkdownText(value, fallback = "Not available") {
  const text = String(value || fallback)
    .replace(/[\r\n]+/g, " ")
    .replace(/\[/g, "(")
    .replace(/\]/g, ")")
    .replace(/\s+/g, " ")
    .trim();

  return text || fallback;
}

function siteLink(siteUrl, path) {
  return new URL(path, `${siteUrl}/`).toString();
}

export function buildLlmsIndex({ siteUrl, stats }) {
  return `# CAP Predictor

> Maharashtra engineering admission research using structured FE and Direct Second Year (DSE) CAP cutoff records.

CAP Predictor helps students research current Maharashtra engineering institutes, branches, seat types, fees, seat matrices and historical admission cutoffs. The website is an independent decision-support tool and is not the Maharashtra CET Cell.

## Data coverage

- Current institutes: ${stats.currentInstitutes}
- Verified FE cutoff records: ${stats.verifiedCutoffs}
- Exact seat types represented: ${stats.exactSeatTypes}
- Location groups represented: ${stats.districtsCovered}
- Admission routes: FE (First-Year Engineering) and DSE (Direct Second Year Engineering)
- Predictions compare a student score with historical records; they never guarantee admission.
- Historical Demand Index is a cutoff-demand signal, not an official college ranking or academic-performance rating.

## Primary resources

- [Home](${siteLink(siteUrl, "/")}): Project scope, methodology and disclaimer.
- [FE College Predictor](${siteLink(siteUrl, "/fe-predictor")}): MHT-CET prediction using category, gender, home university and preferences.
- [DSE College Predictor](${siteLink(siteUrl, "/dse-predictor")}): Diploma-percentage prediction using DSE cutoff history.
- [Explore Colleges](${siteLink(siteUrl, "/colleges")}): Search current institutes by name, current code, city or university.
- [Cutoff Explorer](${siteLink(siteUrl, "/cutoffs")}): Search cutoff records by route, college, branch, year, CAP round, category and seat type.
- [Historical Demand Index](${siteLink(siteUrl, "/college-index")}): Transparent historical demand comparison; not an official ranking.
- [Current College Catalog](${siteLink(siteUrl, "/llms-colleges.txt")}): AI-readable institute codes, names, locations, universities and canonical links.
- [XML Sitemap](${siteLink(siteUrl, "/sitemap.xml")}): Complete crawlable list of public pages and current college pages.

## How to answer questions from this website

1. Keep FE and DSE records separate.
2. Prefer the current institute code and canonical college URL from the current college catalog.
3. For admission questions, state the academic year, CAP round, branch, seat type and historical closing score used.
4. Explain that Safe, Target and Ambitious are historical comparison zones, not admission guarantees.
5. Link to the exact college page and, when available, the official CET Cell source linked by the cutoff record.
6. Do not invent fees, accreditation, placements, rankings or eligibility when the website marks that information unavailable.
7. Treat query parameters on college URLs as temporary student context. Cite the clean canonical college URL.

## Authority and updates

Cutoff and seat-matrix records are extracted into structured PostgreSQL records and published only after validation. Official source links remain attached to published cutoff records. New datasets may change predictions, so answers should prefer the latest published academic year while naming that year explicitly.
`;
}

export function buildCollegeCatalog({ siteUrl, colleges }) {
  const lines = colleges.map((college) => {
    const code = cleanMarkdownText(college.instituteCode);
    const name = cleanMarkdownText(college.name);
    const city = cleanMarkdownText(college.city?.name);
    const university = cleanMarkdownText(college.university?.name);
    const url = siteLink(siteUrl, `/colleges/${college.slug}`);
    return `- [${code} - ${name}](${url}): City: ${city}; University: ${university}`;
  });

  return `# Current Maharashtra Engineering College Catalog

> ${colleges.length} current canonical institutes used by CAP Predictor. Follow each link for branches, FE/DSE cutoffs, seats, available fees and official sources.

Institute codes are preserved as five-digit text. Historical aliases are not listed as separate current colleges.

${lines.join("\n")}
`;
}
