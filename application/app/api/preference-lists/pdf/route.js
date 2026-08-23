import { NextResponse } from "next/server";
import { z } from "zod";
import { createPreferenceListPdf } from "../../../../lib/preferencePdf";
import { consumeRateLimit } from "../../../../lib/rateLimit";
import { createRequestId, logServerError, publicServerError } from "../../../../lib/observability";
import { requireStudent } from "../../../../lib/studentAuth";
import { prisma } from "../../../../lib/prisma";

import { sortCutoffsByLatestAndOpen } from "../../../../lib/seatTypes";

const itemSchema = z.object({
  instituteCode: z.string().min(2).max(20),
  college: z.string().min(2).max(250),
  branch: z.string().min(2).max(180),
  branchCode: z.string().max(30).optional(),
  cutoff: z.number().min(0).max(100).nullable().optional(),
  year: z.string().max(20).optional().default("")
}).strip();

const requestSchema = z.object({
  items: z.array(itemSchema).min(1).max(150)
}).strict();

async function resolveMissingCutoffData(items) {
  const instituteCodes = [...new Set(items.map((i) => String(i.instituteCode).trim()))];
  if (!instituteCodes.length) return items;

  try {
    const cutoffs = await prisma.cutoff.findMany({
      where: {
        needsReview: false,
        closingScore: { not: null },
        collegeBranch: {
          college: {
            instituteCode: { in: instituteCodes }
          }
        },
        dataset: {
          status: { in: ["VERIFIED", "PUBLISHED"] }
        }
      },
      include: {
        dataset: true,
        seatType: true,
        collegeBranch: {
          include: {
            branch: true,
            college: true
          }
        }
      }
    });

    const sortedCutoffs = sortCutoffsByLatestAndOpen(cutoffs);

    const lookup = new Map();
    for (const c of sortedCutoffs) {
      const instCode = c.collegeBranch.college.instituteCode;
      const bCode = c.collegeBranch.branch.branchCode;
      const offName = (c.collegeBranch.branch.officialName || "").toLowerCase().trim();
      const dispName = (c.collegeBranch.branch.displayName || "").toLowerCase().trim();

      const keys = [
        `${instCode}:${bCode}`,
        offName ? `${instCode}:${offName}` : null,
        dispName ? `${instCode}:${dispName}` : null
      ].filter(Boolean);

      for (const key of keys) {
        if (!lookup.has(key)) {
          lookup.set(key, {
            cutoff: Number(c.closingScore),
            year: c.dataset.academicYear
          });
        }
      }
    }

    return items.map((item) => {
      const instCode = String(item.instituteCode).trim();
      const bCode = item.branchCode ? String(item.branchCode).trim() : "";
      const bName = String(item.branch || "").toLowerCase().trim();

      const matched = lookup.get(`${instCode}:${bCode}`) || lookup.get(`${instCode}:${bName}`);

      if (matched) {
        // Upgrade to latest year and latest GOPENS score if matched is newer or item missing data
        if (!item.year || item.cutoff == null || matched.year >= item.year) {
          return {
            ...item,
            cutoff: matched.cutoff,
            year: matched.year
          };
        }
      }

      return item;
    });
  } catch {
    return items;
  }
}

export async function POST(request) {
  const student = await requireStudent(request);
  if (!student) {
    return NextResponse.json({ error: "Sign in to download your CAP preference list." }, { status: 401 });
  }

  const rateLimit = await consumeRateLimit(`student:preference-pdf:${student.userId}`, {
    limit: 12,
    windowMs: 60 * 60 * 1000
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "PDF download limit reached. Please try again later." },
      { status: 429, headers: { "retry-after": String(rateLimit.retryAfter) } }
    );
  }

  try {
    const validation = requestSchema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0]?.message || "Check the CAP list." }, { status: 400 });
    }

    const resolvedItems = await resolveMissingCutoffData(validation.data.items);
    const pdf = await createPreferenceListPdf(resolvedItems);
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=cap-predictor-preference-list.pdf",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    const requestId = createRequestId();
    logServerError("preference-list.pdf", error, { requestId });
    return NextResponse.json(publicServerError("The PDF could not be created.", requestId), { status: 500 });
  }
}
