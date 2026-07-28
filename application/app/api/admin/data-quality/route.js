import { NextResponse } from "next/server";
import { CURRENT_INSTITUTE_CODE_ALIASES } from "../../../../lib/instituteCodes";
import {
  coveragePercent,
  isInvalidUniversityName,
  isMissingQualityValue,
  normalizeCollegeName
} from "../../../../lib/dataQuality";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

function record(college, value = "") {
  return {
    instituteCode: college.instituteCode,
    name: college.name,
    city: college.city?.name || "",
    value
  };
}

function issue({ id, severity, title, description, records, count = records.length }) {
  return {
    id,
    severity,
    title,
    description,
    count,
    records: records.slice(0, 500)
  };
}

export async function GET() {
  try {
    const [colleges, cities, latestMatrices, cutoffReviewCount, cutoffReviewRows, datasetCount, publishedCutoffCodes] = await Promise.all([
      prisma.college.findMany({
        where: { profile: { is: { currentCap2025: "Yes" } } },
        select: {
          instituteCode: true,
          name: true,
          city: { select: { name: true, district: true, region: true } },
          university: { select: { name: true } },
          profile: {
            select: {
              totalApprovedFee: true,
              naacStatus: true,
              nbaStatus: true,
              dataQualityNote: true,
              ownershipType: true
            }
          },
          fees: {
            select: { id: true },
            take: 1
          }
        },
        orderBy: { instituteCode: "asc" }
      }),
      prisma.city.findMany({
        select: {
          id: true,
          name: true,
          district: true,
          region: true,
          _count: { select: { colleges: true } }
        },
        orderBy: { name: "asc" }
      }),
      prisma.seatMatrix.findMany({
        where: {
          academicYear: "2025-26",
          admissionRoute: "FE",
          needsReview: false
        },
        select: {
          instituteCode: true,
          capSeats: true,
          reviewReason: true
        }
      }),
      prisma.cutoff.count({ where: { needsReview: true } }),
      prisma.cutoff.findMany({
        where: { needsReview: true },
        select: {
          reviewReason: true,
          collegeBranch: {
            select: {
              college: {
                select: {
                  instituteCode: true,
                  name: true,
                  city: { select: { name: true } }
                }
              }
            }
          }
        },
        take: 50
      }),
      prisma.cutoffDataset.count({ where: { status: { in: ["VERIFIED", "PUBLISHED"] } } }),
      prisma.$queryRaw`
        SELECT DISTINCT co.institute_code
        FROM cutoffs c
        JOIN cutoff_datasets d ON d.id = c.dataset_id
        JOIN college_branches cb ON cb.id = c.college_branch_id
        JOIN colleges co ON co.id = cb.college_id
        WHERE d.status IN ('VERIFIED', 'PUBLISHED') AND c.needs_review = false
      `
    ]);

    const activeCodes = new Set(colleges.map((college) => college.instituteCode));
    const matrixCodes = new Set(latestMatrices.map((matrix) => matrix.instituteCode));
    const detailedMatrixCodes = new Set(
      latestMatrices
        .filter((matrix) => matrix.capSeats !== null)
        .map((matrix) => matrix.instituteCode)
    );
    const cutoffCodes = new Set(publishedCutoffCodes.map((row) => row.institute_code));
    const deprecatedCodes = new Set(Object.keys(CURRENT_INSTITUTE_CODE_ALIASES));

    const invalidUniversity = colleges
      .filter((college) => isInvalidUniversityName(college.university?.name))
      .map((college) => record(college, college.university?.name));
    const missingUniversity = colleges
      .filter((college) => isMissingQualityValue(college.university?.name))
      .map((college) => record(college, "No university affiliation"));
    const missingFees = colleges
      .filter((college) => !college.fees.length && !college.profile?.totalApprovedFee)
    const missingFraFees = missingFees
      .filter((college) =>
        !/government|university|deemed/i.test(college.profile?.ownershipType || "")
      )
      .map((college) => record(college, "No published 2025-26 or 2024-25 FRA engineering fee matched"));
    const missingInstituteFees = missingFees
      .filter((college) =>
        /government|university|deemed/i.test(college.profile?.ownershipType || "")
      )
      .map((college) =>
        record(college, "Verify from the institute or university fee notice; this ownership type is not covered by the FRA import")
      );
    const missingAccreditation = colleges
      .filter((college) =>
        isMissingQualityValue(college.profile?.naacStatus) &&
        isMissingQualityValue(college.profile?.nbaStatus)
      )
      .map((college) => record(college, "NAAC and NBA not verified"));
    const missingSeatMatrix = colleges
      .filter((college) => !matrixCodes.has(college.instituteCode))
      .map((college) => record(college, "No verified 2025-26 FE seat matrix"));
    const intakeOnlySeatMatrix = colleges
      .filter((college) =>
        matrixCodes.has(college.instituteCode) &&
        !detailedMatrixCodes.has(college.instituteCode)
      )
      .map((college) => record(
        college,
        "Official branch intake is available; detailed CAP category distribution was not published in the consolidated PDF"
      ));
    const missingCutoffs = colleges
      .filter((college) => !cutoffCodes.has(college.instituteCode))
      .map((college) => record(college, "No published cutoff record"));
    const outdatedCodes = colleges
      .filter((college) => deprecatedCodes.has(college.instituteCode))
      .map((college) => record(college, `Current alias: ${CURRENT_INSTITUTE_CODE_ALIASES[college.instituteCode]}`));

    const names = new Map();
    for (const college of colleges) {
      const key = normalizeCollegeName(college.name);
      names.set(key, [...(names.get(key) || []), college]);
    }
    const duplicateColleges = [...names.values()]
      .filter((group) => group.length > 1)
      .flatMap((group) => group.map((college) => record(college, `${group.length} matching names`)));

    const cityNames = new Map();
    for (const city of cities) {
      const key = city.name.trim().toLowerCase();
      cityNames.set(key, [...(cityNames.get(key) || []), city]);
    }
    const cityProblems = cities
      .filter((city) =>
        /\d/.test(city.name) ||
        city.name !== city.name.trim() ||
        !city.district ||
        !city.region ||
        (cityNames.get(city.name.trim().toLowerCase())?.length || 0) > 1
      )
      .map((city) => ({
        instituteCode: "",
        name: city.name,
        city: city.district || "",
        value: [
          !city.district ? "Missing district" : "",
          !city.region ? "Missing region" : "",
          /\d/.test(city.name) ? "Contains digits" : "",
          (cityNames.get(city.name.trim().toLowerCase())?.length || 0) > 1 ? "Duplicate city name" : ""
        ].filter(Boolean).join(", ")
      }));

    const reviewRecords = cutoffReviewRows.map((row) => {
      const college = row.collegeBranch.college;
      return record(college, row.reviewReason || "Cutoff requires review");
    });

    const issues = [
      issue({
        id: "invalid-university",
        severity: "CRITICAL",
        title: "University field contains institute status",
        description: "Values such as Autonomous Institute must be stored as academic status, not university affiliation.",
        records: invalidUniversity
      }),
      issue({
        id: "outdated-code",
        severity: "CRITICAL",
        title: "Deprecated institute codes remain",
        description: "Current college records should use the latest Maharashtra CAP institute code.",
        records: outdatedCodes
      }),
      issue({
        id: "cutoff-review",
        severity: "CRITICAL",
        title: "Cutoff records require review",
        description: "These records must remain excluded from student predictions until corrected and approved.",
        records: reviewRecords,
        count: cutoffReviewCount
      }),
      issue({
        id: "missing-university",
        severity: "WARNING",
        title: "University affiliation is missing",
        description: "Home and Other Than Home University eligibility cannot be trusted without this mapping.",
        records: missingUniversity
      }),
      issue({
        id: "duplicate-college",
        severity: "WARNING",
        title: "Possible duplicate current colleges",
        description: "Normalized current college names occur more than once and need code-level review.",
        records: duplicateColleges
      }),
      issue({
        id: "city-quality",
        severity: "WARNING",
        title: "City or district mappings need attention",
        description: "Location filters require canonical city names with district and region metadata.",
        records: cityProblems
      }),
      issue({
        id: "missing-seat-matrix",
        severity: "WARNING",
        title: "Latest FE seat matrix is missing",
        description: "Branch intake and CAP-seat information cannot be shown for these current institutes.",
        records: missingSeatMatrix
      }),
      issue({
        id: "intake-only-seat-matrix",
        severity: "WARNING",
        title: "Detailed CAP seat distribution is unavailable",
        description: "The official institute summary verifies branch intake, but CAP, category and quota seat counts remain blank.",
        records: intakeOnlySeatMatrix
      }),
      issue({
        id: "missing-cutoff",
        severity: "WARNING",
        title: "Published cutoff coverage is missing",
        description: "These current institutes cannot appear reliably in cutoff-based predictions.",
        records: missingCutoffs
      }),
      issue({
        id: "missing-fra-fee",
        severity: "INFO",
        title: "Published FRA engineering fee is unavailable",
        description: "The official FRA API has no matched 2025-26 or 2024-25 engineering fee for these unaided institutes.",
        records: missingFraFees
      }),
      issue({
        id: "missing-institute-fee",
        severity: "INFO",
        title: "Institute or university fee notice is needed",
        description: "Government, university and deemed-university fees must be verified from their own official notices.",
        records: missingInstituteFees
      }),
      issue({
        id: "missing-accreditation",
        severity: "INFO",
        title: "Accreditation has not been verified",
        description: "NAAC and NBA data should remain blank until an official source is attached.",
        records: missingAccreditation
      })
    ];

    const actionableIssues = issues.filter((item) => item.count > 0);
    const criticalCount = actionableIssues
      .filter((item) => item.severity === "CRITICAL")
      .reduce((sum, item) => sum + item.count, 0);
    const warningCount = actionableIssues
      .filter((item) => item.severity === "WARNING")
      .reduce((sum, item) => sum + item.count, 0);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      summary: {
        activeColleges: colleges.length,
        publishedDatasets: datasetCount,
        criticalCount,
        warningCount,
        issueGroups: actionableIssues.length
      },
      coverage: [
        {
          id: "university",
          label: "University affiliation",
          covered: colleges.length - invalidUniversity.length - missingUniversity.length,
          total: colleges.length,
          percent: coveragePercent(colleges.length - invalidUniversity.length - missingUniversity.length, colleges.length)
        },
        {
          id: "cutoffs",
          label: "Published cutoffs",
          covered: colleges.filter((college) => cutoffCodes.has(college.instituteCode)).length,
          total: colleges.length,
          percent: coveragePercent(colleges.filter((college) => cutoffCodes.has(college.instituteCode)).length, colleges.length)
        },
        {
          id: "seat-matrix",
          label: "2025-26 branch intake",
          covered: colleges.filter((college) => matrixCodes.has(college.instituteCode)).length,
          total: colleges.length,
          percent: coveragePercent(colleges.filter((college) => matrixCodes.has(college.instituteCode)).length, colleges.length)
        },
        {
          id: "fees",
          label: "Approved fees",
          covered: colleges.length - missingFees.length,
          total: colleges.length,
          percent: coveragePercent(colleges.length - missingFees.length, colleges.length)
        },
        {
          id: "accreditation",
          label: "NAAC or NBA",
          covered: colleges.length - missingAccreditation.length,
          total: colleges.length,
          percent: coveragePercent(colleges.length - missingAccreditation.length, colleges.length)
        }
      ],
      issues: actionableIssues,
      metadata: {
        currentCollegeCodes: activeCodes.size,
        latestSeatMatrixRows: latestMatrices.length,
        detailedSeatMatrixColleges: detailedMatrixCodes.size,
        intakeOnlySeatMatrixColleges: intakeOnlySeatMatrix.length
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Could not generate the data-quality report.", detail: error.message },
      { status: 500 }
    );
  }
}
