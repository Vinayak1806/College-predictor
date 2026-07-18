import { z } from "zod";
import { json } from "../../../lib/http";
import { prisma } from "../../../lib/prisma";

const shortlistSchema = z.object({
  userId: z.coerce.bigint().optional(),
  collegeBranchId: z.coerce.bigint()
});

export async function GET() {
  const items = await prisma.shortlist.findMany({
    include: {
      collegeBranch: { include: { college: { include: { city: true } }, branch: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  return json({ data: items });
}

export async function POST(request) {
  const input = shortlistSchema.parse(await request.json());
  const item = await prisma.shortlist.create({ data: input });
  return json(item, { status: 201 });
}
