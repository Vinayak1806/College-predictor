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

export const cutoffQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  city: z.string().trim().max(100).optional(),
  branch: z.string().trim().max(160).optional(),
  year: z.string().trim().max(20).optional(),
  round: z.coerce.number().int().min(1).max(4).optional(),
  route: z.enum(["FE", "DSE"]).optional(),
  category: z.string().trim().max(30).optional(),
  seatType: z.string().trim().max(30).optional(),
  sort: z.enum(["NEWEST", "CUTOFF_HIGH", "CUTOFF_LOW", "COLLEGE"]).default("NEWEST"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(30).default(20)
});

export const compareRequestSchema = z.object({
  selections: z.array(z.object({
    instituteCode: z.string().trim().min(4).max(10),
    branchCode: z.string().trim().max(30).optional()
  })).min(1).max(3)
}).superRefine((input, context) => {
  const keys = input.selections.map((selection) =>
    `${selection.instituteCode}|${selection.branchCode || ""}`
  );

  if (new Set(keys).size !== keys.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "The same college and branch cannot be compared twice.",
      path: ["selections"]
    });
  }
});

export const fePredictSchema = z.object({
  percentile: z.number().min(0).max(100).optional(),
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
  academicYear: z.string().optional(),
  capRound: z.number().int().min(1).max(4).optional(),
  category: z.string().min(2),
  gender: z.enum(["MALE", "FEMALE"]),
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
  pageSize: z.number().int().min(1).max(30).default(10),
  tfws: z.boolean().default(false),
  pwd: z.boolean().default(false),
  defence: z.boolean().default(false),
  ews: z.boolean().default(false)
});
