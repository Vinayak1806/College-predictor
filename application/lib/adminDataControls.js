import { z } from "zod";
import { prisma } from "./prisma.js";
import { clearResponseCache } from "./responseCache.js";

const routeSchema = z.enum(["FE", "DSE"]);
const yearSchema = z.string().regex(/^20\d{2}-\d{2}$/);

export const adminDataControlSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.enum(["ARCHIVE_CUTOFFS", "RESTORE_CUTOFFS"]),
    admissionRoute: routeSchema,
    academicYear: yearSchema,
    capRound: z.number().int().min(1).max(4).nullable().optional()
  }),
  z.object({
    action: z.enum(["ARCHIVE_COLLEGE_ROUTE", "RESTORE_COLLEGE_ROUTE"]),
    admissionRoute: routeSchema,
    instituteCode: z.string().trim().regex(/^\d{4,6}$/),
    reason: z.string().trim().max(300).optional()
  })
]);

export async function listAdminDataControls() {
  const [datasets, collegeArchives] = await Promise.all([
    prisma.cutoffDataset.findMany({
      where: {
        status: { in: ["VERIFIED", "PUBLISHED"] },
        historyEnabled: true
      },
      select: {
        id: true,
        admissionRoute: true,
        academicYear: true,
        capRound: true,
        predictionEnabled: true,
        archivedAt: true,
        _count: { select: { cutoffs: true } }
      },
      orderBy: [{ academicYear: "desc" }, { admissionRoute: "asc" }, { capRound: "asc" }]
    }),
    prisma.collegeRouteArchive.findMany({
      include: {
        college: {
          select: { instituteCode: true, name: true, slug: true }
        }
      },
      orderBy: { archivedAt: "desc" }
    })
  ]);

  const cutoffSetMap = new Map();
  for (const dataset of datasets) {
    const key = `${dataset.admissionRoute}|${dataset.academicYear}|${dataset.capRound}`;
    const current = cutoffSetMap.get(key) || {
      key,
      admissionRoute: dataset.admissionRoute,
      academicYear: dataset.academicYear,
      capRound: dataset.capRound,
      activeDatasets: 0,
      archivedDatasets: 0,
      activeRecords: 0,
      archivedRecords: 0,
      archivedAt: null
    };
    const recordCount = dataset._count.cutoffs;
    if (dataset.predictionEnabled) {
      current.activeDatasets += 1;
      current.activeRecords += recordCount;
    } else {
      current.archivedDatasets += 1;
      current.archivedRecords += recordCount;
      if (!current.archivedAt || dataset.archivedAt > current.archivedAt) {
        current.archivedAt = dataset.archivedAt;
      }
    }
    cutoffSetMap.set(key, current);
  }

  return {
    cutoffSets: [...cutoffSetMap.values()],
    collegeArchives: collegeArchives.map((archive) => ({
      id: archive.id.toString(),
      admissionRoute: archive.admissionRoute,
      reason: archive.reason,
      archivedAt: archive.archivedAt,
      college: archive.college
    }))
  };
}

export async function runAdminDataControl(input) {
  const parsed = adminDataControlSchema.parse(input);

  if (["ARCHIVE_CUTOFFS", "RESTORE_CUTOFFS"].includes(parsed.action)) {
    const where = {
      admissionRoute: parsed.admissionRoute,
      academicYear: parsed.academicYear,
      capRound: parsed.capRound || undefined,
      status: { in: ["VERIFIED", "PUBLISHED"] },
      historyEnabled: true
    };
    const matching = await prisma.cutoffDataset.aggregate({
      where,
      _count: { id: true }
    });
    if (!matching._count.id) {
      throw Object.assign(new Error("No approved cutoff datasets match that selection."), { status: 404 });
    }

    const archive = parsed.action === "ARCHIVE_CUTOFFS";
    const result = await prisma.cutoffDataset.updateMany({
      where,
      data: {
        predictionEnabled: !archive,
        historyEnabled: true,
        archivedAt: archive ? new Date() : null
      }
    });
    clearResponseCache();
    return {
      action: parsed.action,
      affectedDatasets: result.count,
      admissionRoute: parsed.admissionRoute,
      academicYear: parsed.academicYear,
      capRound: parsed.capRound || null
    };
  }

  const college = await prisma.college.findUnique({
    where: { instituteCode: parsed.instituteCode },
    select: { id: true, instituteCode: true, name: true }
  });
  if (!college) throw Object.assign(new Error("College not found."), { status: 404 });

  if (parsed.action === "ARCHIVE_COLLEGE_ROUTE") {
    await prisma.collegeRouteArchive.upsert({
      where: {
        collegeId_admissionRoute: {
          collegeId: college.id,
          admissionRoute: parsed.admissionRoute
        }
      },
      create: {
        collegeId: college.id,
        admissionRoute: parsed.admissionRoute,
        reason: parsed.reason || null
      },
      update: {
        reason: parsed.reason || null,
        archivedAt: new Date()
      }
    });
  } else {
    const result = await prisma.collegeRouteArchive.deleteMany({
      where: { collegeId: college.id, admissionRoute: parsed.admissionRoute }
    });
    if (!result.count) {
      throw Object.assign(new Error("This college route is not archived."), { status: 404 });
    }
  }

  clearResponseCache();
  return {
    action: parsed.action,
    admissionRoute: parsed.admissionRoute,
    college: { instituteCode: college.instituteCode, name: college.name }
  };
}
