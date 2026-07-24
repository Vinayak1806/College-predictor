import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { isInvalidUniversityName, isMissingQualityValue } from "../lib/dataQuality.js";

const prisma = new PrismaClient();
const SOURCE_BASE_URL = "https://fe2025.mahacet.org/StaticPages/frmInstituteSummary";
const REPORT_DIRECTORY = path.resolve(
  process.cwd(),
  "..",
  "data",
  "processed",
  "college_info"
);
const TRUSTED_AFFILIATION_OVERRIDES = {
  "02032": {
    university: "Institute of Chemical Technology, Mumbai",
    sourceUrl: "https://ictmumbai.edu.in/",
    reason:
      "The CET page uses a generic status. ICT's official website identifies the Jalna off-campus institute as part of the named deemed-to-be university."
  },
  "03036": {
    university: "Institute of Chemical Technology, Mumbai",
    sourceUrl: "https://ictmumbai.edu.in/",
    reason:
      "The CET page uses a generic status. ICT's official website identifies the institute itself as a named deemed-to-be university."
  }
};
const PLACEHOLDER_UNIVERSITIES = [
  "Autonomous Institute",
  "Non-Autonomous Institute",
  "State Level",
  "Home University",
  "Other Than Home University"
];

function decodeHtml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function spanValue(html, idSuffix) {
  const pattern = new RegExp(`<span[^>]+id=["'][^"']*${idSuffix}["'][^>]*>([\\s\\S]*?)<\\/span>`, "i");
  return decodeHtml(html.match(pattern)?.[1]);
}

function extractCourseUniversities(html, instituteCode) {
  const table = html.match(/<table[^>]+id=["'][^"']*gvChoiceCodeList["'][^>]*>([\s\S]*?)<\/table>/i)?.[1];
  if (!table) return [];

  const universities = [];
  for (const row of table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => decodeHtml(cell[1]));
    if (cells.length < 3 || !cells[0].startsWith(instituteCode)) continue;
    if (!isMissingQualityValue(cells[2])) universities.push(cells[2]);
  }

  return [...new Set(universities)];
}

async function fetchOfficialRecord(college, attempt = 1) {
  const sourceUrl = `${SOURCE_BASE_URL}?InstituteCode=${encodeURIComponent(college.instituteCode)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(sourceUrl, {
      signal: controller.signal,
      headers: {
        "user-agent": "CAP-Predictor-Data-Verification/1.0"
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const officialCode = spanValue(html, "lblInstituteCode");
    const officialName = spanValue(html, "lblInstituteName");
    const universities = extractCourseUniversities(html, college.instituteCode);

    if (officialCode !== college.instituteCode) {
      return {
        status: "CONFLICT",
        instituteCode: college.instituteCode,
        databaseName: college.name,
        previousUniversity: college.university?.name || null,
        officialCode,
        officialName,
        universities,
        sourceUrl,
        reason: "Official page institute code does not match the requested database code."
      };
    }

    if (universities.length !== 1) {
      return {
        status: universities.length ? "CONFLICT" : "UNRESOLVED",
        instituteCode: college.instituteCode,
        databaseName: college.name,
        previousUniversity: college.university?.name || null,
        officialCode,
        officialName,
        universities,
        sourceUrl,
        reason: universities.length
          ? "Official course rows contain more than one university."
          : "No university was found in official course rows."
      };
    }

    const extractedUniversity = universities[0];
    if (isInvalidUniversityName(extractedUniversity)) {
      const trustedOverride = TRUSTED_AFFILIATION_OVERRIDES[college.instituteCode];
      if (!trustedOverride) {
        return {
          status: "UNRESOLVED",
          instituteCode: college.instituteCode,
          databaseName: college.name,
          previousUniversity: college.university?.name || null,
          officialCode,
          officialName,
          universities,
          sourceUrl,
          reason: "The official CET course row contains only a generic status, not a named university."
        };
      }

      return {
        status: "VERIFIED",
        instituteCode: college.instituteCode,
        databaseName: college.name,
        previousUniversity: college.university?.name || null,
        officialCode,
        officialName,
        officialCETValue: extractedUniversity,
        university: trustedOverride.university,
        sourceUrl,
        affiliationSourceUrl: trustedOverride.sourceUrl,
        reason: trustedOverride.reason
      };
    }

    return {
      status: "VERIFIED",
      instituteCode: college.instituteCode,
      databaseName: college.name,
      previousUniversity: college.university?.name || null,
      officialCode,
      officialName,
      university: universities[0],
      sourceUrl,
      reason: "Single university found across official 2025-26 course rows."
    };
  } catch (error) {
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      return fetchOfficialRecord(college, attempt + 1);
    }

    return {
      status: "UNRESOLVED",
      instituteCode: college.instituteCode,
      databaseName: college.name,
      previousUniversity: college.university?.name || null,
      universities: [],
      sourceUrl,
      reason: error.name === "AbortError" ? "Official page request timed out." : error.message
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

async function applyVerifiedRecords(records) {
  for (const record of records) {
    const university = await prisma.university.upsert({
      where: { name: record.university },
      create: { name: record.university },
      update: {}
    });

    await prisma.college.update({
      where: { instituteCode: record.instituteCode },
      data: { universityId: university.id }
    });
  }

  await prisma.university.deleteMany({
    where: {
      name: { in: PLACEHOLDER_UNIVERSITIES },
      colleges: { none: {} }
    }
  });
}

async function main() {
  const applyChanges = process.argv.includes("--apply");
  const limitArgument = process.argv.find((argument) => argument.startsWith("--limit="));
  const limit = limitArgument ? Number(limitArgument.split("=")[1]) : null;
  const allCurrentColleges = await prisma.college.findMany({
    where: { profile: { is: { currentCap2025: "Yes" } } },
    select: {
      instituteCode: true,
      name: true,
      university: { select: { name: true } }
    },
    orderBy: { instituteCode: "asc" }
  });
  const targets = allCurrentColleges
    .filter((college) =>
      isMissingQualityValue(college.university?.name) ||
      isInvalidUniversityName(college.university?.name)
    )
    .slice(0, limit || undefined);

  console.log(`Checking ${targets.length} current institutes against Maharashtra CET Cell 2025-26...`);
  const records = await mapWithConcurrency(targets, 4, fetchOfficialRecord);
  const verified = records.filter((record) => record.status === "VERIFIED");
  const conflicts = records.filter((record) => record.status === "CONFLICT");
  const unresolved = records.filter((record) => record.status === "UNRESOLVED");

  const report = {
    generatedAt: new Date().toISOString(),
    applied: applyChanges,
    source: {
      authority: "State Common Entrance Test Cell, Government of Maharashtra",
      academicYear: "2025-26",
      baseUrl: SOURCE_BASE_URL
    },
    summary: {
      targets: targets.length,
      verified: verified.length,
      conflicts: conflicts.length,
      unresolved: unresolved.length
    },
    records
  };

  const timestamp = report.generatedAt.replace(/[:.]/g, "-");
  const reportPath = path.join(
    REPORT_DIRECTORY,
    `university_affiliations_2025_26_${timestamp}.json`
  );
  await fs.mkdir(REPORT_DIRECTORY, { recursive: true });
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  if (applyChanges) {
    await applyVerifiedRecords(verified);
  }

  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`Report: ${reportPath}`);
  if (conflicts.length || unresolved.length) {
    console.log("Records requiring manual review:");
    console.log(JSON.stringify([...conflicts, ...unresolved], null, 2));
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
