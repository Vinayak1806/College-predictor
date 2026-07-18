import { z } from "zod";
import { json } from "../../../lib/http";
import { prisma } from "../../../lib/prisma";

const compareSchema = z.object({
  collegeBranchIds: z.array(z.coerce.bigint()).min(1).max(3)
});

export async function POST(request) {
  const input = compareSchema.parse(await request.json());
  const items = await prisma.collegeBranch.findMany({
    where: { id: { in: input.collegeBranchIds } },
    include: { college: { include: { city: true } }, branch: true, cutoffs: { include: { dataset: true, seatType: true }, take: 50 } }
  });
  return json({ data: items });
}
