import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { isMissingQualityValue } from "../lib/dataQuality.js";

const prisma = new PrismaClient();
const sourceBaseUrl =
  "https://fe2025.mahacet.org/StaticPages/frmInstituteSummary";
const reportPath = path.resolve(
  process.cwd(),
  "..",
  "data",
  "processed",
  "college_info",
  "cet_accreditation_report.json"
);
const applyChanges = process.argv.includes("--apply");

function decodeHtml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function courseAccreditations(html, instituteCode) {
  const table = html.match(
    /<table[^>]+id=["'][^"']*gvChoiceCodeList["'][^>]*>([\s\S]*?)<\/table>/i
  )?.[1];
  if (!table) return [];

  const records = [];
  for (const row of table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(
      (cell) => decodeHtml(cell[1])
    );
    if (cells.length < 10 || !cells[0].startsWith(instituteCode)) continue;
    if (isMissingQualityValue(cells[7])) continue;

    records.push({
      choiceCode: cells[0],
      branch: cells[1],
      accreditation: cells[7]
    });
  }

  return records;
}

async function fetchCollege(college, attempt = 1) {
  const sourceUrl = `${sourceBaseUrl}?InstituteCode=${college.instituteCode}`;
  try {
    const response = await fetch(sourceUrl, {
      headers: { "user-agent": "CAP Predictor accreditation collector" },
      signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const records = courseAccreditations(await response.text(), college.instituteCode);
    return {
      instituteCode: college.instituteCode,
      name: college.name,
      sourceUrl,
      records,
      status: records.length ? "OFFICIAL_VALUE_FOUND" : "NOT_LISTED"
    };
  } catch (error) {
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 400));
      return fetchCollege(college, attempt + 1);
    }

    return {
      instituteCode: college.instituteCode,
      name: college.name,
      sourceUrl,
      records: [],
      status: "FETCH_ERROR",
      error: error.message
    };
  }
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index]);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker)
  );
  return results;
}

async function main() {
  const limitArgument = process.argv.find((argument) => argument.startsWith("--limit="));
  const limit = limitArgument ? Number(limitArgument.split("=")[1]) : null;
  const colleges = (
    await prisma.college.findMany({
      where: { profile: { is: { currentCap2025: "Yes" } } },
      select: { instituteCode: true, name: true },
      orderBy: { instituteCode: "asc" }
    })
  ).slice(0, limit || undefined);

  console.log(`Checking official CET accreditation cells for ${colleges.length} colleges...`);
  const results = await mapWithConcurrency(colleges, 6, fetchCollege);
  const officialValues = results.filter(
    (result) => result.status === "OFFICIAL_VALUE_FOUND"
  );
  const verifiedNba = officialValues.filter((result) =>
    result.records.some((record) => /\bNBA\b/i.test(record.accreditation))
  );

  if (applyChanges) {
    for (const result of verifiedNba) {
      const values = [...new Set(result.records.map((record) => record.accreditation))];
      await prisma.collegeProfile.updateMany({
        where: { instituteCode: result.instituteCode },
        data: { nbaStatus: `CET 2025-26: ${values.join("; ")}` }
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    applied: applyChanges,
    source: {
      authority: "State Common Entrance Test Cell, Government of Maharashtra",
      academicYear: "2025-26",
      baseUrl: sourceBaseUrl
    },
    summary: {
      checked: results.length,
      officialValuesFound: officialValues.length,
      verifiedNba: verifiedNba.length,
      notListed: results.filter((result) => result.status === "NOT_LISTED").length,
      fetchErrors: results.filter((result) => result.status === "FETCH_ERROR").length
    },
    importantNote:
      "A dash or empty CET accreditation cell is not evidence that a college lacks NAAC or NBA accreditation. It remains unverified.",
    officialValues,
    fetchErrors: results.filter((result) => result.status === "FETCH_ERROR")
  };

  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(report.summary);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
