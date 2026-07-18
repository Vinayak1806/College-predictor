import { z } from "zod";
import { json } from "../../../lib/http";
import { prisma } from "../../../lib/prisma";

const preferenceListSchema = z.object({
  userId: z.coerce.bigint().optional(),
  name: z.string().min(1),
  items: z.array(z.object({
    collegeBranchId: z.coerce.string(),
    zone: z.enum(["AMBITIOUS", "TARGET", "SAFE", "BACKUP"]),
    order: z.number().int().min(1)
  }))
});

export async function GET() {
  const lists = await prisma.preferenceList.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100
  });
  return json({ data: lists });
}

export async function POST(request) {
  const input = preferenceListSchema.parse(await request.json());
  const list = await prisma.preferenceList.create({ data: { ...input, items: input.items } });
  return json(list, { status: 201 });
}
