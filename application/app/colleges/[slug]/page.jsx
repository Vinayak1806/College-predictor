import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Landmark,
  MapPin,
  Navigation,
  Receipt,
  ShieldCheck
} from "lucide-react";
import { CollegeBranchExplorer } from "../../../components/CollegeBranchExplorer";
import { SiteHeader } from "../../../components/SiteHeader";
import { SharePageButton } from "../../../components/SharePageButton";
import { explainSeatType, sortCutoffsByLatestAndOpen } from "../../../lib/seatTypes";
import { prisma } from "../../../lib/prisma";
import { currentCollegeWhere } from "../../../lib/publishedData";
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

const findCurrentCollege = cache(async (slug) => {
  const currentFilter = await currentCollegeWhere(prisma);
  return prisma.college.findFirst({
    where: { slug, ...currentFilter },
    include: {
      city: true,
      university: true,
      routeArchives: true,
      collegeBranches: {
        include: { branch: true }
      }
    }
  });
});

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
  const description = `Explore First-Year Engineering (FE) and Direct Second-Year (DSE) CAP cutoffs, branches, intake, fees and university details for ${college.name}${location}. Institute code ${college.instituteCode}.`;
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
    normal: "text-slate-900",
    good: "text-emerald-700",
    warning: "text-amber-700",
    danger: "text-rose-700"
  };

  return (
    <div className="min-w-0 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
      <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className={`mt-1.5 break-words text-base font-extrabold ${toneClass[tone]}`}>{value}</dd>
    </div>
  );
}

function FactGrid({ children, columns = "sm:grid-cols-2 lg:grid-cols-4" }) {
  return (
    <dl className={`mt-4 grid gap-3.5 ${columns}`}>
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
  return sortCutoffsByLatestAndOpen(cutoffs);
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

function rankingLabel(ranking) {
  if (!ranking) return null;
  if (hasValue(ranking.rank)) return `Rank ${ranking.rank}`;
  if (hasValue(ranking.band)) return `Rank band ${ranking.band}`;
  return null;
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

  const [seatMatrices, cutoffs, profile, fees, rankings, routeCutoffRows] = await Promise.all([
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
          status: { in: ["VERIFIED", "PUBLISHED"] },
          historyEnabled: true
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
      orderBy: [
        { dataset: { academicYear: "desc" } },
        { dataset: { capRound: "desc" } },
        { closingScore: "desc" }
      ],
      take: 3000
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
    }),
    prisma.collegeRanking.findMany({
      where: {
        instituteCode: college.instituteCode,
        verified: true
      },
      orderBy: [{ rankingYear: "desc" }, { rank: "asc" }]
    }),
    prisma.cutoffDataset.findMany({
      where: {
        status: { in: ["VERIFIED", "PUBLISHED"] },
        historyEnabled: true,
        cutoffs: {
          some: {
            needsReview: false,
            collegeBranch: { collegeId: college.id }
          }
        }
      },
      distinct: ["admissionRoute"],
      select: { admissionRoute: true }
    })
  ]);

  const archivedRoutes = new Set(college.routeArchives.map((archive) => archive.admissionRoute));
  const availableRoutes = routeCutoffRows.map((row) => row.admissionRoute)
    .filter((route) => ["FE", "DSE"].includes(route));
  const visibleRoutes = availableRoutes.filter((route) => !archivedRoutes.has(route));
  if (!visibleRoutes.includes(admissionRoute) && visibleRoutes.length) {
    redirect(`/colleges/${college.slug}?route=${visibleRoutes[0]}`);
  }

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
  const locationAddress = profile?.address || (college.city?.name ? `${college.name}, ${college.city.name}, Maharashtra` : `${college.name}, Maharashtra`);
  const locationRegion = profile?.region || college.city?.name || "Maharashtra";
  const locationUniversity = college.university?.name || profile?.university || null;
  const totalIntake = profile?.totalIntake ?? calculateLatestTotalIntake(seatMatrices);
  const latestFee = fees[0] || null;
  const approvedFee = latestFee?.totalApprovedFee ?? profile?.totalApprovedFee ?? null;
  const approvedFeeYear = latestFee?.academicYear || profile?.feeYear || null;
  const officialWebsite = profile?.officialWebsite || college.officialWebsite;
  const officialRanking = rankings[0] || null;
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

  if (!approvedFee) {
    missingData.push("A verified current fee is not available in our records. Confirm the latest fee on the college's official website or the Maharashtra Fee Regulating Authority website before applying.");
  }

  const similarCurrentFilter = await currentCollegeWhere(prisma, admissionRoute);
  const similarCandidates = await prisma.college.findMany({
    where: {
      id: { not: college.id },
      ...similarCurrentFilter,
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
      <main className="page-shell mx-auto max-w-7xl px-4 py-8 sm:px-5 lg:px-6">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-600">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link className="hover:text-action hover:underline" href="/">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link className="hover:text-action hover:underline" href={`/colleges?route=${admissionRoute}`}>Colleges</Link></li>
            <li aria-hidden="true">/</li>
            <li className="max-w-full truncate font-medium text-ink" aria-current="page">{college.name}</li>
          </ol>
        </nav>

        <header className="surface-card mt-4 px-4 py-5 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-500">Institute code: {college.instituteCode}</p>
            <span className="rounded bg-cyan-50 px-3 py-1 text-xs font-semibold text-action">{admissionRoute === "DSE" ? "Direct Second-Year" : "First-Year"} admission data</span>
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
                Open {admissionRoute === "DSE" ? "Direct Second-Year" : "First-Year"} Predictor
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

        <nav className="mt-5 flex min-h-12 items-center gap-2 rounded-xl bg-slate-100/90 p-1.5 border border-slate-200/80 max-w-xs" aria-label="College admission data route">
          {visibleRoutes.map((route) => (
            <Link
              key={route}
              aria-current={admissionRoute === route ? "page" : undefined}
              className={`focus-ring flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-xs font-bold transition-all ${
                admissionRoute === route ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
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
            {rankingLabel(officialRanking) ? (
              <Fact
                label={`${officialRanking.rankingSystem} ${officialRanking.category} ${officialRanking.rankingYear}`}
                value={rankingLabel(officialRanking)}
              />
            ) : null}
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
          college={{
            instituteCode: college.instituteCode,
            name: college.name,
            slug: college.slug,
            city: college.city?.name || ""
          }}
        />

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          {/* ABOUT THE COLLEGE CARD */}
          <article className="surface-card relative overflow-hidden rounded-2xl border border-line p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 border-b border-line pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-action">
                  <Building2 aria-hidden="true" size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-ink">About the College</h2>
                  <p className="text-xs text-slate-500">Verified institute location and affiliation details</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-slate-50/50 p-4 sm:col-span-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <MapPin className="text-action shrink-0" size={15} />
                    <span>Campus Address</span>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-ink leading-snug">{locationAddress}</p>
                </div>

                <div className="rounded-xl border border-line bg-slate-50/50 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <Navigation className="text-indigo-600 shrink-0" size={15} />
                    <span>City / District</span>
                  </div>
                  <p className="mt-1 text-sm font-bold text-ink">{locationRegion}</p>
                </div>

                {locationUniversity ? (
                  <div className="rounded-xl border border-line bg-slate-50/50 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <Landmark className="text-amber-600 shrink-0" size={15} />
                      <span>Affiliated University</span>
                    </div>
                    <p className="mt-1 text-sm font-bold text-ink truncate" title={locationUniversity}>{locationUniversity}</p>
                  </div>
                ) : null}

                {hasValue(minorityStatus) ? (
                  <div className="rounded-xl border border-line bg-slate-50/50 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <ShieldCheck className="text-emerald-600 shrink-0" size={15} />
                      <span>Minority Status</span>
                    </div>
                    <p className="mt-1 text-sm font-bold text-ink">{minorityStatus}</p>
                  </div>
                ) : null}

                {availableYears.length ? (
                  <div className="rounded-xl border border-line bg-slate-50/50 p-4 sm:col-span-2">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <CalendarDays className="text-cyan-600 shrink-0" size={15} />
                      <span>Official Cutoff Coverage</span>
                    </div>
                    <p className="mt-1 text-sm font-bold text-ink">
                      {availableYears.join(", ")} <span className="text-xs font-normal text-slate-500">({cutoffs.length} verified records)</span>
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </article>

          {/* APPROVED FEE HISTORY CARD */}
          <aside className="surface-card relative flex flex-col justify-between overflow-hidden rounded-2xl border border-line p-6 shadow-sm">
            <div>
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Receipt aria-hidden="true" size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-ink">Approved Fee History</h2>
                    <p className="text-xs text-slate-500">Official FRA tuition & development breakdown</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-100/80 px-2.5 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                  FRA Approved
                </span>
              </div>

              {fees.length ? (
                <div className="mt-5 grid gap-3">
                  {fees.map((fee) => (
                    <div
                      key={`${fee.academicYear}-${fee.fraInstituteId}`}
                      className="rounded-xl border border-line bg-slate-50/50 p-4 transition-all hover:border-action/30 hover:bg-white"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-slate-700 border border-line shadow-2xs">
                          <CalendarDays size={13} className="text-slate-400" />
                          Academic Year {fee.academicYear}
                        </span>
                        <span className="text-base font-extrabold text-action">
                          {formatMoney(fee.totalApprovedFee)}
                        </span>
                      </div>

                      {(hasValue(fee.tuitionFee) || hasValue(fee.developmentFee)) ? (
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          {hasValue(fee.tuitionFee) ? (
                            <div className="rounded-lg bg-slate-100/80 p-2 text-slate-700">
                              <span className="block text-[10px] uppercase font-semibold text-slate-500">Tuition Fee</span>
                              <span className="font-bold text-slate-900">{formatMoney(fee.tuitionFee)}</span>
                            </div>
                          ) : null}
                          {hasValue(fee.developmentFee) ? (
                            <div className="rounded-lg bg-slate-100/80 p-2 text-slate-700">
                              <span className="block text-[10px] uppercase font-semibold text-slate-500">Development Fee</span>
                              <span className="font-bold text-slate-900">{formatMoney(fee.developmentFee)}</span>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {hasValue(fee.approvalStatus) ? (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2 size={13} />
                          <span>{fee.approvalStatus}</span>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">No official fee structure records found for this college.</p>
              )}
            </div>

            {/* MANDATORY FEE REVISION DISCLAIMER */}
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={16} />
              <div className="leading-snug">
                <strong className="font-semibold block text-amber-950">Notice on fee updates:</strong>
                Fees are subject to periodic revision by the Fee Regulating Authority (FRA) and the college. Information here is compiled from official FRA publications; please cross-check the official college website or FRA portal before final admission.
              </div>
            </div>
          </aside>
        </section>

        {(profile?.sourceUrl || fees[0]?.sourceUrl || officialRanking?.sourceUrl || missingData.length) ? (
          <section className="mt-8 surface-card rounded-2xl border border-line p-6 shadow-sm">
            <div className="flex items-center gap-2.5 border-b border-line pb-3">
              <ExternalLink className="text-action shrink-0" size={18} />
              <h2 className="text-base font-bold text-ink">Sources & Official Data Availability</h2>
            </div>

            {missingData.length ? (
              <div className="mt-3.5 rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-xs text-amber-900">
                <ul className="grid gap-1">
                  {missingData.map((message) => (
                    <li key={message} className="flex items-start gap-1.5">
                      <span className="shrink-0 font-bold">•</span>
                      <span>{message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {profile?.sourceUrl ? (
                <a
                  className="focus-ring inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:border-action hover:bg-slate-50 hover:text-action transition-all"
                  href={profile.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>Official CAP Institute Profile</span>
                  <ExternalLink size={14} className="text-slate-400" />
                </a>
              ) : null}
              {fees[0]?.sourceUrl ? (
                <a
                  className="focus-ring inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:border-action hover:bg-slate-50 hover:text-action transition-all"
                  href={fees[0].sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>Official Approved Fee Source</span>
                  <ExternalLink size={14} className="text-slate-400" />
                </a>
              ) : null}
              {officialRanking?.sourceUrl ? (
                <a
                  className="focus-ring inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:border-action hover:bg-slate-50 hover:text-action transition-all"
                  href={officialRanking.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>Official {officialRanking.rankingSystem} {officialRanking.rankingYear} Source</span>
                  <ExternalLink size={14} className="text-slate-400" />
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
