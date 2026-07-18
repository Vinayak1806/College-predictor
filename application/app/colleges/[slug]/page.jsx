import Link from "next/link";
import { notFound } from "next/navigation";
import { CollegeBranchExplorer } from "../../../components/CollegeBranchExplorer";
import { SiteHeader } from "../../../components/SiteHeader";
import { explainSeatType } from "../../../lib/seatTypes";
import { prisma } from "../../../lib/prisma";

const zoneClass = {
  SAFE: "border-success text-success",
  TARGET: "border-action text-action",
  AMBITIOUS: "border-warning text-warning",
  HIGHLY_AMBITIOUS: "border-danger text-danger"
};

const zoneText = {
  SAFE: "Safe",
  TARGET: "Target",
  AMBITIOUS: "Ambitious",
  HIGHLY_AMBITIOUS: "Highly Ambitious"
};

function hasValue(value) {
  return value !== null && value !== undefined && value !== "" && value !== "N/A";
}

function hasVerifiedValue(value) {
  if (!hasValue(value)) return false;

  const text = String(value).toLowerCase();
  return ![
    "not available",
    "not centrally verified",
    "not scored",
    "not verified",
    "unknown"
  ].some((missingText) => text.includes(missingText));
}

function formatNumber(value) {
  return Number(value).toFixed(2);
}

function formatMoney(value) {
  return `Rs. ${Number(value).toLocaleString("en-IN")}`;
}

function Fact({ label, value, tone = "normal" }) {
  const toneClass = {
    normal: "text-ink",
    good: "text-success",
    warning: "text-warning",
    danger: "text-danger"
  };

  return (
    <div className="min-w-0 px-3 py-3">
      <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
      <dd className={`mt-1 break-words text-base font-semibold ${toneClass[tone]}`}>{value}</dd>
    </div>
  );
}

function FactGrid({ children, columns = "sm:grid-cols-2 lg:grid-cols-4" }) {
  return (
    <dl className={`mt-3 grid divide-y divide-line border-y border-line sm:divide-x sm:divide-y-0 ${columns}`}>
      {children}
    </dl>
  );
}

function getUniqueBranches(collegeBranches) {
  const branchMap = new Map();

  for (const collegeBranch of collegeBranches) {
    const code = collegeBranch.branch.branchCode;
    if (!branchMap.has(code)) {
      branchMap.set(code, collegeBranch.branch);
    }
  }

  return [...branchMap.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
}

function sortCutoffs(cutoffs) {
  return [...cutoffs].sort((a, b) => {
    if (a.dataset.academicYear !== b.dataset.academicYear) {
      return b.dataset.academicYear.localeCompare(a.dataset.academicYear);
    }

    if (a.dataset.capRound !== b.dataset.capRound) {
      return b.dataset.capRound - a.dataset.capRound;
    }

    return Number(b.closingScore ?? 0) - Number(a.closingScore ?? 0);
  });
}

function normalizeOwnership(value) {
  if (!hasValue(value)) return null;

  const text = String(value);
  const lower = text.toLowerCase();
  if (lower.includes("government aided") || lower.includes("government-aided")) return "Government-aided";
  if (lower.includes("government")) return "Government";
  if (lower.includes("university")) return "University-managed";
  if (lower.includes("un-aided") || lower.includes("unaided")) return "Un-Aided";
  if (lower.includes("private")) return "Private";
  return text;
}

function findMinorityStatus(profileValue, collegeValue, ownershipValue) {
  if (hasValue(profileValue)) return profileValue;
  if (hasValue(collegeValue)) return collegeValue;
  if (!hasValue(ownershipValue)) return null;

  const text = String(ownershipValue);
  const match = text.match(/((?:linguistic|religious)\s+minority(?:\s*-\s*.+)?)/i);
  return match ? match[1] : null;
}

function calculateLatestTotalIntake(seatMatrices) {
  const latestYear = seatMatrices.find((row) => hasValue(row.academicYear))?.academicYear;
  if (!latestYear) return null;

  const total = seatMatrices
    .filter((row) => row.academicYear === latestYear && hasValue(row.sanctionedIntake))
    .reduce((sum, row) => sum + Number(row.sanctionedIntake), 0);

  return total > 0 ? total : null;
}

function numberFromQuery(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default async function CollegeDetailsPage({ params, searchParams }) {
  const { slug } = await params;
  const query = await searchParams;

  const college = await prisma.college.findUnique({
    where: { slug },
    include: {
      city: true,
      university: true,
      collegeBranches: {
        include: {
          branch: true
        }
      }
    }
  });

  if (!college) {
    notFound();
  }

  const branchCodes = college.collegeBranches.map((collegeBranch) => collegeBranch.branch.branchCode);

  const [seatMatrices, cutoffs, profile, fees] = await Promise.all([
    prisma.seatMatrix.findMany({
      where: {
        instituteCode: college.instituteCode,
        branchCode: { in: branchCodes },
        needsReview: false
      },
      orderBy: [{ academicYear: "desc" }, { branchName: "asc" }]
    }),
    prisma.cutoff.findMany({
      where: {
        needsReview: false,
        closingScore: { not: null },
        collegeBranch: { collegeId: college.id },
        dataset: {
          admissionRoute: "FE",
          status: { in: ["VERIFIED", "PUBLISHED"] }
        }
      },
      include: {
        dataset: true,
        seatType: true,
        collegeBranch: {
          include: {
            branch: true
          }
        }
      },
      take: 1500
    }),
    prisma.collegeProfile.findUnique({
      where: {
        instituteCode: college.instituteCode
      }
    }),
    prisma.collegeFee.findMany({
      where: {
        instituteCode: college.instituteCode
      },
      orderBy: {
        academicYear: "desc"
      },
      take: 5
    })
  ]);

  const branches = getUniqueBranches(college.collegeBranches);
  const sortedCutoffs = sortCutoffs(cutoffs);
  const availableYears = [...new Set(cutoffs.map((cutoff) => cutoff.dataset.academicYear))].sort().reverse();
  const branchDetails = branches.map((branch) => {
    const seatRows = seatMatrices
      .filter((matrix) => matrix.branchCode === branch.branchCode)
      .map((matrix) => ({
        academicYear: matrix.academicYear,
        branchCode: matrix.branchCode,
        sanctionedIntake: matrix.sanctionedIntake,
        capSeats: matrix.capSeats,
        ewsSeats: matrix.ewsSeats,
        tfwsSeats: matrix.tfwsSeats,
        allIndiaSeats: matrix.allIndiaSeats
      }));
    const cutoffRows = sortedCutoffs
      .filter((cutoff) => cutoff.collegeBranch.branch.branchCode === branch.branchCode)
      .map((cutoff) => ({
        id: cutoff.id.toString(),
        academicYear: cutoff.dataset.academicYear,
        capRound: cutoff.dataset.capRound,
        seatType: cutoff.seatType.code,
        closingScore: formatNumber(cutoff.closingScore),
        closingRank: cutoff.closingRank
      }));
    const latestSeat = seatRows[0];

    return {
      branchCode: branch.branchCode,
      branchName: branch.displayName,
      latestYear: latestSeat?.academicYear || null,
      latestIntake: latestSeat?.sanctionedIntake ?? null,
      seatRows,
      cutoffRows
    };
  });

  const requestedBranchName = typeof query?.branch === "string" ? query.branch : null;
  const selectedBranch = requestedBranchName
    ? branchDetails.find((branch) => branch.branchName.toLowerCase() === requestedBranchName.toLowerCase())
    : null;
  const selectedSeat = selectedBranch?.seatRows[0] || null;
  const rawOwnership = profile?.ownershipType || seatMatrices[0]?.collegeType || college.collegeType;
  const ownership = normalizeOwnership(rawOwnership);
  const minorityStatus = findMinorityStatus(profile?.minorityStatus, college.minorityType, rawOwnership);
  const totalIntake = profile?.totalIntake ?? calculateLatestTotalIntake(seatMatrices);
  const latestFee = fees[0] || null;
  const approvedFee = latestFee?.totalApprovedFee ?? profile?.totalApprovedFee ?? null;
  const approvedFeeYear = latestFee?.academicYear || profile?.feeYear || null;
  const officialWebsite = profile?.officialWebsite || college.officialWebsite;
  const isAutonomous =
    profile?.autonomyStatus?.toLowerCase().includes("autonomous") ||
    seatMatrices.some((matrix) => matrix.autonomous) ||
    college.autonomous;
  const score = numberFromQuery(query?.score);
  const closingCutoff = numberFromQuery(query?.cutoff);
  const margin = numberFromQuery(query?.margin);
  const zone = typeof query?.zone === "string" ? query.zone : null;
  const seatTypeCode = typeof query?.seatType === "string" ? query.seatType : null;
  const seatTypeInfo = seatTypeCode ? explainSeatType(seatTypeCode) : null;
  const hasPredictionContext =
    requestedBranchName && score !== null && closingCutoff !== null && margin !== null && zone;
  const marginTone = margin !== null && margin >= 0 ? "good" : margin !== null && margin >= -4 ? "warning" : "danger";
  const missingData = [];

  if (!approvedFee) missingData.push("Approved fee information is not available for this institute.");
  if (!hasVerifiedValue(profile?.naacStatus) && !hasVerifiedValue(profile?.nbaStatus)) {
    missingData.push("Accreditation information has not been independently verified.");
  }
  if (!hasVerifiedValue(profile?.placementData)) {
    missingData.push("Standardized official placement information is not available.");
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <Link className="text-sm font-medium text-action underline" href="/fe-predictor">
          Back to predictor
        </Link>

        <header className="mt-4 border-y border-line bg-white px-4 py-5 sm:px-5">
          <p className="text-sm font-medium text-slate-500">Institute code: {college.instituteCode}</p>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-ink">{college.name}</h1>
              <p className="mt-2 text-sm text-slate-600">
                {[college.city?.name, college.university?.name].filter(Boolean).join(" | ")}
              </p>
            </div>
            {officialWebsite ? (
              <a
                className="focus-ring inline-flex min-h-11 items-center rounded bg-action px-4 text-sm font-semibold text-white"
                href={officialWebsite}
                target="_blank"
                rel="noreferrer"
              >
                Official website
              </a>
            ) : null}
          </div>
        </header>

        <section className="mt-6">
          <h2 className="text-lg font-semibold text-ink">College and branch strength</h2>
          <p className="mt-1 text-sm text-slate-600">Verified and calculated facts that help compare this option.</p>
          <FactGrid>
            {ownership ? <Fact label="Institute ownership" value={ownership} /> : null}
            <Fact label="Academic autonomy" value={isAutonomous ? "Autonomous" : "Non-autonomous"} />
            {selectedBranch ? <Fact label="Selected branch" value={selectedBranch.branchName} /> : null}
            {hasValue(selectedSeat?.sanctionedIntake) ? (
              <Fact label="Approved branch intake" value={selectedSeat.sanctionedIntake} />
            ) : null}
            {hasValue(selectedSeat?.capSeats) ? <Fact label="CAP seats for this branch" value={selectedSeat.capSeats} /> : null}
            {hasValue(profile?.preferenceBand) ? <Fact label="Student demand" value={profile.preferenceBand} /> : null}
            {hasValue(totalIntake) ? <Fact label="Approved college intake" value={totalIntake} /> : null}
            {approvedFee ? (
              <Fact
                label={`Approved annual fee${approvedFeeYear ? ` (${approvedFeeYear})` : ""}`}
                value={formatMoney(approvedFee)}
              />
            ) : null}
          </FactGrid>
        </section>

        {hasPredictionContext ? (
          <section className="mt-6 border-l-4 border-action bg-white px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ink">Your admission estimate</h2>
                <p className="mt-1 text-sm text-slate-600">{requestedBranchName}</p>
              </div>
              <span className={`rounded border px-2 py-1 text-xs font-semibold ${zoneClass[zone] ?? "border-line"}`}>
                {zoneText[zone] || zone}
              </span>
            </div>
            <FactGrid columns="sm:grid-cols-3 lg:grid-cols-6">
              <Fact label="Your percentile" value={formatNumber(score)} />
              <Fact label="Closing percentile" value={formatNumber(closingCutoff)} />
              <Fact
                label="Cutoff margin"
                value={`${margin >= 0 ? "+" : ""}${formatNumber(margin)}`}
                tone={marginTone}
              />
              {query?.year ? <Fact label="Academic year" value={query.year} /> : null}
              {query?.round ? <Fact label="CAP round" value={`Round ${query.round}`} /> : null}
              {seatTypeInfo ? <Fact label="Applicable seat type" value={seatTypeInfo.code} /> : null}
            </FactGrid>
            {seatTypeInfo ? <p className="mt-3 text-sm text-slate-600">{seatTypeInfo.title}</p> : null}
          </section>
        ) : null}

        <CollegeBranchExplorer
          branches={branchDetails}
          initialBranchName={requestedBranchName}
          initialYear={typeof query?.year === "string" ? query.year : null}
          initialSeatType={seatTypeCode}
        />

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <article>
            <h2 className="text-lg font-semibold text-ink">About the college</h2>
            <FactGrid columns="sm:grid-cols-2">
              {hasValue(profile?.address) ? <Fact label="Address" value={profile.address} /> : null}
              {hasValue(minorityStatus) ? <Fact label="Minority status" value={minorityStatus} /> : null}
              {hasValue(profile?.region) ? <Fact label="Region" value={profile.region} /> : null}
              {availableYears.length ? (
                <Fact label="Official cutoff coverage" value={`${availableYears.join(", ")} | ${cutoffs.length} records`} />
              ) : null}
            </FactGrid>
          </article>

          {fees.length ? (
            <aside>
              <h2 className="text-lg font-semibold text-ink">Approved fee history</h2>
              <div className="mt-3 divide-y divide-line border-y border-line">
                {fees.map((fee) => (
                  <article key={`${fee.academicYear}-${fee.fraInstituteId}`} className="py-3 text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="font-semibold text-ink">{fee.academicYear}</p>
                      <p className="font-semibold text-action">{formatMoney(fee.totalApprovedFee)}</p>
                    </div>
                    {(hasValue(fee.tuitionFee) || hasValue(fee.developmentFee)) ? (
                      <p className="mt-2 text-slate-600">
                        {hasValue(fee.tuitionFee) ? `Tuition: ${formatMoney(fee.tuitionFee)}` : ""}
                        {hasValue(fee.tuitionFee) && hasValue(fee.developmentFee) ? " | " : ""}
                        {hasValue(fee.developmentFee) ? `Development: ${formatMoney(fee.developmentFee)}` : ""}
                      </p>
                    ) : null}
                    {hasValue(fee.approvalStatus) ? <p className="mt-1 text-xs text-slate-500">{fee.approvalStatus}</p> : null}
                  </article>
                ))}
              </div>
            </aside>
          ) : null}
        </section>

        {(hasVerifiedValue(profile?.naacStatus) ||
          hasVerifiedValue(profile?.nbaStatus) ||
          hasVerifiedValue(profile?.placementData)) ? (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-ink">Accreditation and outcomes</h2>
            <FactGrid columns="sm:grid-cols-3">
              {hasVerifiedValue(profile?.naacStatus) ? <Fact label="NAAC accreditation" value={profile.naacStatus} /> : null}
              {hasVerifiedValue(profile?.nbaStatus) ? <Fact label="NBA accreditation" value={profile.nbaStatus} /> : null}
              {hasVerifiedValue(profile?.placementData) ? <Fact label="Official placement data" value={profile.placementData} /> : null}
            </FactGrid>
          </section>
        ) : null}

        {(profile?.sourceUrl || fees[0]?.sourceUrl || missingData.length) ? (
          <section className="mt-8 border-t border-line pt-5 text-sm">
            <h2 className="font-semibold text-ink">Sources and data availability</h2>
            {missingData.length ? (
              <ul className="mt-2 grid gap-1 text-slate-600">
                {missingData.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-4">
              {profile?.sourceUrl ? (
                <a className="font-medium text-action underline" href={profile.sourceUrl} target="_blank" rel="noreferrer">
                  Official CAP institute profile
                </a>
              ) : null}
              {fees[0]?.sourceUrl ? (
                <a className="font-medium text-action underline" href={fees[0].sourceUrl} target="_blank" rel="noreferrer">
                  Official approved fee source
                </a>
              ) : null}
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
