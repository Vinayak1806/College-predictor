import { prisma } from "../lib/prisma";
import { absoluteUrl } from "../lib/site";

export const dynamic = "force-dynamic";

const publicPages = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/fe-predictor", changeFrequency: "monthly", priority: 0.9 },
  { path: "/dse-predictor", changeFrequency: "monthly", priority: 0.9 },
  { path: "/colleges", changeFrequency: "weekly", priority: 0.9 },
  { path: "/cutoffs", changeFrequency: "weekly", priority: 0.9 },
  { path: "/college-index", changeFrequency: "monthly", priority: 0.8 }
];

export default async function sitemap() {
  const colleges = await prisma.college.findMany({
    where: { profile: { is: { currentCap2025: "Yes" } } },
    select: { slug: true },
    orderBy: { instituteCode: "asc" }
  });

  return [
    ...publicPages.map((page) => ({
      url: absoluteUrl(page.path),
      changeFrequency: page.changeFrequency,
      priority: page.priority
    })),
    ...colleges.map((college) => ({
      url: absoluteUrl(`/colleges/${college.slug}`),
      changeFrequency: "monthly",
      priority: 0.7
    }))
  ];
}
