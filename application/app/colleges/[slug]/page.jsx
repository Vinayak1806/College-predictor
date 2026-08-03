import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CollegeBranchExplorer } from "../../../components/CollegeBranchExplorer";
import { SiteHeader } from "../../../components/SiteHeader";
import { SharePageButton } from "../../../components/SharePageButton";
import { explainSeatType } from "../../../lib/seatTypes";
import { prisma } from "../../../lib/prisma";
import { absoluteUrl, SITE_NAME } from "../../../lib/site";

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

const findCurrentCollege = cache((slug) => prisma.college.findFirst({
  where: {
    slug,
    profile: { is: { currentCap2025: "Yes" } }
  },
  include: {
    city: true,
    university: true,
    collegeBranches: {
      include: { branch: true }
    }
  }
}));

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const college = await findCurrentCollege(slug);

  if (!college) {
    return {
      title: "College not found",
      robots: { index: false, follow: false }
    };
  }

  const location = college.city?.name ? ` in ${college.city.name}` : " in Maharashtra";
  const title = `${college.name} Cutoffs, Fees & Branches`;
  const description = `Explore FE and DSE CAP cutoffs, available engineering branches, intake, fees and university details for ${college.name}${location}. Institute code ${college.instituteCode}.`;
  const canonical = absoluteUrl(`/colleges/${college.slug}`);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url: canonical
    }
  };
}

function hasValue(value) {
  return value !== null && value !== undefined && value !== "" && value !== "N/A";
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

function profileIsAutonomous(value) {
  const status = String(value || "").trim().toLowerCase();
  const explicitlyNonAutonomous = status.includes("non-autonomous") || status.includes("non autonomous");
  return !explicitlyNonAutonomous && status.includes("autonomous");
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
  const admissionRoute = query?.route === "DSE" ? "DSE" : "FE";
  const predictorHref = admissionRoute === "DSE" ? "/dse-predictor" : "/fe-predictor";

  const college = await findCurrentCollege(slug);

  if (!college) {
    notFound();
  }

  const branchCodes = college.collegeBranches.map((collegeBranch) => collegeBranch.branch.branchCode);

  const [seatMatrices, cutoffs, profile, fees] = await Promise.all([
    prisma.seatMatrix.findMany({
      where: {
        admissionRoute,
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
          admissionRoute,
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

  const sortedCutoffs = sortCutoffs(cutoffs);
  const routeBranchCodes = new Set([
    ...seatMatrices.map((matrix) => matrix.branchCode),
    ...cutoffs.map((cutoff) => cutoff.collegeBranch.branch.branchCode)
  ]);
  const branches = getUniqueBranches(
    college.collegeBranches.filter((collegeBranch) => routeBranchCodes.has(collegeBranch.branch.branchCode))
  );
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
        lateralEntrySeats: matrix.lateralEntrySeats,
        vacantSeats: matrix.vacantSeats,
        pwdSeats: matrix.pwdSeats,
        defenceSeats: matrix.defenceSeats
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
      latestIntake: admissionRoute === "DSE"
        ? latestSeat?.lateralEntrySeats ?? null
        : latestSeat?.sanctionedIntake ?? null,
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
  const canonicalUrl = absoluteUrl(`/colleges/${college.slug}`);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollegeOrUniversity",
    "@id": canonicalUrl,
    name: college.name,
    url: canonicalUrl,
    identifier: college.instituteCode,
    address: college.city?.name
      ? {
          "@type": "PostalAddress",
          addressLocality: college.city.name,
          addressRegion: "Maharashtra",
          addressCountry: "IN"
        }
      : undefined,
    sameAs: officialWebsite || undefined
  };
  const isAutonomous =
    profileIsAutonomous(profile?.autonomyStatus) ||
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

  const similarCandidates = await prisma.college.findMany({
    where: {
      id: { not: college.id },
      profile: { is: { currentCap2025: "Yes" } },
      OR: [
        ...(college.cityId ? [{ cityId: college.cityId }] : []),
        ...(college.universityId ? [{ universityId: college.universityId }] : [])
      ]
    },
    include: { city: true, university: true, profile: true },
    take: 12
  });
  const similarColleges = similarCandidates
    .sort((a, b) => Number(b.profile?.fePreferenceProxy || 0) - Number(a.profile?.fePreferenceProxy || 0))
    .slice(0, 4);
  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Explore colleges", item: absoluteUrl("/colleges") },
      { "@type": "ListItem", position: 3, name: college.name, item: canonicalUrl }
    ]
  };

  return (
    <>
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c")
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbData).replace(/</g, "\\u003c")
        }}
      />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-600">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link className="hover:text-action hover:underline" href="/">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link className="hover:text-action hover:underline" href={`/colleges?route=${admissionRoute}`}>Colleges</Link></li>
            <li aria-hidden="true">/</li>
            <li className="max-w-full truncate font-medium text-ink" aria-current="page">{college.name}</li>
          </ol>
        </nav>

        <header className="mt-4 border-y border-line bg-white px-4 py-5 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-500">Institute code: {college.instituteCode}</p>
            <span className="rounded bg-cyan-50 px-3 py-1 text-xs font-semibold text-action">{admissionRoute} admission data</span>
          </div>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-ink">{college.name}</h1>
              <p className="mt-2 text-sm text-slate-600">
                {[college.city?.name, college.university?.name].filter(Boolean).join(" | ")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <SharePageButton title={`${college.name} cutoffs and branches`} />
              <Link className="focus-ring inline-flex min-h-11 items-center rounded border border-action px-4 text-sm font-semibold text-action" href={predictorHref}>
                Open {admissionRoute} predictor
              </Link>
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
          </div>
        </header>

        <nav className="mt-4 inline-grid min-h-11 grid-cols-2 overflow-hidden rounded border border-line bg-white" aria-label="College admission data route">
          {["FE", "DSE"].map((route) => (
            <Link
              key={route}
              aria-current={admissionRoute === route ? "page" : undefined}
              className={`focus-ring flex min-h-11 items-center justify-center border-r border-line px-4 text-sm font-semibold last:border-r-0 ${
                admissionRoute === route ? "bg-action text-white" : "text-slate-700 hover:bg-panel"
              }`}
              href={`/colleges/${college.slug}?route=${route}`}
            >
              {route} admission
            </Link>
          ))}
        </nav>

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
            {hasValue(selectedSeat?.lateralEntrySeats) ? (
              <Fact label="DSE lateral-entry seats" value={selectedSeat.lateralEntrySeats} />
            ) : null}
            {hasValue(selectedSeat?.vacantSeats) ? (
              <Fact label="Previous-intake vacancies" value={selectedSeat.vacantSeats} />
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
              <Fact label={admissionRoute === "DSE" ? "Your diploma percentage" : "Your percentile"} value={formatNumber(score)} />
              <Fact label={admissionRoute === "DSE" ? "Closing diploma percentage" : "Closing percentile"} value={formatNumber(closingCutoff)} />
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
          admissionRoute={admissionRoute}
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

        {similarColleges.length ? (
          <section className="mt-8 border-t border-line pt-6">
            <h2 className="text-lg font-semibold text-ink">Similar colleges to explore</h2>
            <p className="mt-1 text-sm text-slate-600">Current CAP institutes in the same city or university area, ordered by historical admission demand where available.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {similarColleges.map((item) => (
                <Link key={item.id.toString()} className="focus-ring rounded border border-line bg-white p-4 hover:border-action" href={`/colleges/${item.slug}?route=${admissionRoute}`}>
                  <span className="block text-xs font-semibold uppercase text-slate-500">Institute {item.instituteCode}</span>
                  <span className="mt-2 block text-sm font-semibold text-ink">{item.name}</span>
                  <span className="mt-2 block text-xs text-slate-600">{[item.city?.name, item.university?.name].filter(Boolean).join(" | ")}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
