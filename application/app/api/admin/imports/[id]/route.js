import { NextResponse } from "next/server";
import { checkAdminImportAccess } from "../../../../../lib/adminImportAuth";
import { serializeAdminImport } from "../../../../../lib/adminImports";
import { prisma } from "../../../../../lib/prisma";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  const access = await checkAdminImportAccess(request);
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "Invalid import ID." }, { status: 400 });
  const url = new URL(request.url);
  const requestedState = url.searchParams.get("records") || "ALL";
  const recordState = ["ALL", "READY", "REVIEW", "EXCLUDED"].includes(requestedState) ? requestedState : "ALL";
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(10, Number.parseInt(url.searchParams.get("pageSize") || "25", 10) || 25));
  const issue = /^[A-Z0-9_]{1,80}$/.test(url.searchParams.get("issue") || "")
    ? url.searchParams.get("issue")
    : "";
  const institute = /^[A-Z0-9]{1,20}$/.test(url.searchParams.get("institute") || "")
    ? url.searchParams.get("institute")
    : "";
  const stateWhere =
    recordState === "READY"
      ? { valid: true, needsReview: false }
      : recordState === "REVIEW"
        ? { needsReview: true }
        : recordState === "EXCLUDED"
          ? { valid: false, needsReview: false }
        : {};

  const adminImport = await prisma.adminImport.findUnique({
    where: { id: BigInt(id) },
    include: { _count: { select: { records: true } } }
  });
  if (!adminImport) return NextResponse.json({ error: "Import not found." }, { status: 404 });

  const baseWhere = { importId: adminImport.id, ...stateWhere };
  let matchingIds = null;
  if (issue || institute) {
    const candidates = await prisma.adminImportRecord.findMany({
      where: baseWhere,
      select: { id: true, data: true, issues: true }
    });
    matchingIds = candidates
      .filter((record) => {
        const issues = Array.isArray(record.issues) ? record.issues : [];
        const instituteCode = String(record.data?.institute_code || "").toUpperCase();
        return (!issue || issues.includes(issue)) && (!institute || instituteCode === institute);
      })
      .map((record) => record.id);
  }

  const recordWhere = matchingIds ? { ...baseWhere, id: { in: matchingIds } } : baseWhere;
  const [records, matchedRecords, reviewRecords] = await Promise.all([
    prisma.adminImportRecord.findMany({
      where: recordWhere,
      orderBy: { rowNumber: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    matchingIds ? Promise.resolve(matchingIds.length) : prisma.adminImportRecord.count({ where: recordWhere }),
    adminImport.status === "NEEDS_REVIEW"
      ? prisma.adminImportRecord.findMany({
          where: { importId: adminImport.id, needsReview: true },
          select: { data: true, issues: true, rowNumber: true }
        })
      : Promise.resolve([])
  ]);

  const reviewGroupMap = new Map();
  for (const record of reviewRecords) {
    const instituteCode = String(record.data?.institute_code || "NO_CODE").toUpperCase();
    const group = reviewGroupMap.get(instituteCode) || {
      instituteCode,
      collegeName: String(record.data?.college_name || "Unknown institute"),
      recordCount: 0,
      branchCodes: new Set(),
      issues: new Set(),
      firstRow: record.rowNumber,
      firstPage: Number(record.data?.source_page) || null
    };
    group.recordCount += 1;
    if (record.data?.branch_code) group.branchCodes.add(String(record.data.branch_code));
    for (const recordIssue of Array.isArray(record.issues) ? record.issues : []) group.issues.add(recordIssue);
    reviewGroupMap.set(instituteCode, group);
  }

  const data = serializeAdminImport({ ...adminImport, records }, true);
  data.recordPagination = {
    page,
    pageSize,
    matchedRecords,
    totalPages: Math.max(1, Math.ceil(matchedRecords / pageSize)),
    recordState,
    issue: issue || null,
    institute: institute || null
  };
  data.reviewGroups = [...reviewGroupMap.values()]
    .map((group) => ({
      ...group,
      branchCount: group.branchCodes.size,
      branchCodes: undefined,
      issues: [...group.issues].sort()
    }))
    .sort((left, right) => right.recordCount - left.recordCount || left.instituteCode.localeCompare(right.instituteCode));

  return NextResponse.json({ data });
}
