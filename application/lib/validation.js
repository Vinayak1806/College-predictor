import { z } from "zod";

export const listQuerySchema = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
  branch: z.string().optional(),
  year: z.string().optional(),
  round: z.coerce.number().int().min(1).max(4).optional(),
  route: z.enum(["FE", "DSE"]).optional(),
  category: z.string().optional(),
  seatType: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(30).default(20)
});

export const fePredictSchema = z.object({
  exam: z.enum(["MHT_CET", "JEE"]).default("MHT_CET"),
  percentile: z.number().min(0).max(100).optional(),
  rank: z.number().int().positive().optional(),
  academicYear: z.string().optional(),
  capRound: z.number().int().min(1).max(4).optional(),
  category: z.string().min(2),
  gender: z.enum(["MALE", "FEMALE"]),
  homeUniversity: z.string().min(2),
  preferredBranches: z.array(z.string()).default([]),
  preferredCities: z.array(z.string()).default([]),
  collegeTypes: z.array(z.enum(["GOVERNMENT", "AIDED", "PRIVATE"])).default([]),
  autonomousOnly: z.boolean().default(false),
  resultMode: z.enum([
    "BEST_BRANCH_PER_COLLEGE",
    "BEST_COLLEGES_FIRST",
    "ALL_MATCHING_BRANCHES"
  ]).default("BEST_BRANCH_PER_COLLEGE"),
  zone: z.enum(["ALL", "SAFE", "TARGET", "AMBITIOUS", "HIGHLY_AMBITIOUS"]).default("ALL"),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(30).default(20),
  tfws: z.boolean().default(false),
  pwd: z.boolean().default(false),
  defence: z.boolean().default(false),
  ews: z.boolean().default(false)
});

export const dsePredictSchema = z.object({
  diplomaPercentage: z.number().min(0).max(100).optional(),
  meritNumber: z.number().int().positive().optional(),
  diplomaBranch: z.string().min(2),
  category: z.string().min(2),
  gender: z.enum(["MALE", "FEMALE"]),
  universityType: z.enum(["HOME", "OTHER", "STATE"]),
  preferredBranches: z.array(z.string()).default([]),
  preferredCities: z.array(z.string()).default([]),
  tfws: z.boolean().default(false),
  pwd: z.boolean().default(false),
  defence: z.boolean().default(false),
  ews: z.boolean().default(false)
});
