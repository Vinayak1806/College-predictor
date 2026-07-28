import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { currentInstituteCode } from "../lib/instituteCodes.js";

const prisma = new PrismaClient();
const applyChanges = process.argv.includes("--apply");
const academicYears = ["2025-26", "2024-25"];
const fraHome = "https://mahafra.org/feesInformation";
const fraApi =
  "https://api.mahafraportal.org/mahadbt/inst_district_stream_api.php";
const reportPath = path.resolve(
  process.cwd(),
  "..",
  "data",
  "processed",
  "college_info",
  "fra_fee_enrichment_report.json"
);

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}

function codeFromFraId(value) {
  return currentInstituteCode(String(value || "").replace(/^EN/i, ""));
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "CAP Predictor data updater" }
  });

  if (!response.ok) {
    throw new Error(`FRA request failed (${response.status}): ${url}`);
  }

  const text = await response.text();
  if (!text.trim()) return [];

  try {
    return JSON.parse(text);
  } catch {
    if (text.includes("inst_district_stream_api.php")) return [];
    throw new Error(
      `FRA returned invalid JSON for ${url}: ${text.slice(0, 160).replace(/\s+/g, " ")}`
    );
  }
}

async function fetchFeeRows(districts) {
  const rows = [];

  for (const academicYear of academicYears) {
    for (const district of districts) {
      const url = new URL(fraApi);
      url.searchParams.set("sub_type", "ENGG");
      url.searchParams.set("district", district);
      url.searchParams.set("ac_year", academicYear);

      const districtRows = await fetchJson(url);
      rows.push(
        ...districtRows.map((row) => ({
          academicYear,
          fraInstituteId: row.inst_id,
          instituteCode: codeFromFraId(row.inst_id),
          instituteName: String(row.name || "").trim(),
          district: row.district || district,
          approvalStatus: row.status || null,
          meetingDate: row.dom || null,
          tuitionFee: numberOrNull(row.tution_fees_fra),
          developmentFee: numberOrNull(row.dev_fees_fra),
          totalApprovedFee: numberOrNull(row.app_fees_fra),
          sourceUrl: fraHome
        }))
      );
    }
  }

  return rows;
}

function latestByCollege(rows, knownCodes) {
  const result = new Map();

  for (const row of rows) {
    if (!row.instituteCode || !knownCodes.has(row.instituteCode)) continue;
    if (!row.totalApprovedFee || result.has(row.instituteCode)) continue;
    result.set(row.instituteCode, row);
  }

  return result;
}

async function main() {
  const [districtResponse, colleges] = await Promise.all([
    fetchJson("https://mahafra.org/api/district"),
    prisma.college.findMany({
      where: { profile: { is: { currentCap2025: "Yes" } } },
      select: {
        instituteCode: true,
        name: true,
        collegeType: true,
        profile: { select: { ownershipType: true, currentCap2025: true } },
        fees: { select: { academicYear: true } }
      },
      orderBy: { instituteCode: "asc" }
    })
  ]);

  const districts = districtResponse.data.map((row) => row.dist_name);
  const knownCodes = new Set(colleges.map((college) => college.instituteCode));
  const rows = await fetchFeeRows(districts);
  const latest = latestByCollege(rows, knownCodes);
  const originallyMissing = colleges.filter((college) => !college.fees.length);
  const recovered = originallyMissing.filter((college) =>
    latest.has(college.instituteCode)
  );
  const stillMissing = originallyMissing
    .filter((college) => !latest.has(college.instituteCode))
    .map((college) => ({
      instituteCode: college.instituteCode,
      name: college.name,
      ownership:
        college.profile?.ownershipType || college.collegeType || "Unknown",
      reason: /government|university|deemed/i.test(
        college.profile?.ownershipType || college.collegeType || ""
      )
        ? "Fee should be verified from the institute or university; FRA does not regulate this ownership type"
        : "No published FRA engineering fee matched for 2025-26 or 2024-25"
    }));

  if (applyChanges) {
    for (const row of latest.values()) {
      await prisma.collegeFee.upsert({
        where: {
          academicYear_fraInstituteId: {
            academicYear: row.academicYear,
            fraInstituteId: row.fraInstituteId
          }
        },
        create: row,
        update: row
      });

      await prisma.collegeProfile.updateMany({
        where: { instituteCode: row.instituteCode },
        data: {
          feeYear: row.academicYear,
          totalApprovedFee: row.totalApprovedFee
        }
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    source: fraHome,
    yearsChecked: academicYears,
    mode: applyChanges ? "apply" : "dry-run",
    currentColleges: colleges.length,
    officialEngineeringFeeRows: rows.length,
    currentCollegesMatched: latest.size,
    originallyMissing: originallyMissing.length,
    recoveredMissing: recovered.length,
    stillMissing: stillMissing.length,
    recovered: recovered.map((college) => ({
      instituteCode: college.instituteCode,
      name: college.name,
      academicYear: latest.get(college.instituteCode).academicYear,
      totalApprovedFee: latest.get(college.instituteCode).totalApprovedFee
    })),
    unresolved: stillMissing
  };

  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(report);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
