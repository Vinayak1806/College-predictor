import { json } from "../../../lib/http";
import { prisma } from "../../../lib/prisma";
import { isInvalidUniversityName } from "../../../lib/dataQuality";

export async function GET() {
  const universities = await prisma.university.findMany({ orderBy: { name: "asc" } });
  return json({
    data: universities.filter((university) => !isInvalidUniversityName(university.name))
  });
}
