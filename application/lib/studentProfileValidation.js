import { z } from "zod";

const shortText = z.string().trim().max(200);
const selectedValues = z.array(shortText).max(30);
const collegeTypes = z.array(z.enum(["GOVERNMENT", "AIDED", "PRIVATE"])).max(3);

export const feProfileFormSchema = z.object({
  percentile: z.string().trim().max(10),
  academicYear: shortText,
  capRound: z.string().trim().max(2),
  category: z.string().trim().max(20),
  gender: z.enum(["MALE", "FEMALE"]),
  homeUniversity: shortText,
  branches: selectedValues,
  cities: selectedValues,
  collegeTypes,
  autonomousOnly: z.boolean(),
  tfws: z.boolean(),
  pwd: z.boolean(),
  defence: z.boolean(),
  ews: z.boolean()
}).strict();

export const dseProfileFormSchema = z.object({
  diplomaPercentage: z.string().trim().max(10),
  meritNumber: z.string().trim().max(20),
  diplomaBranch: shortText,
  academicYear: shortText,
  capRound: z.string().trim().max(2),
  category: z.string().trim().max(20),
  gender: z.enum(["MALE", "FEMALE"]),
  branches: selectedValues,
  cities: selectedValues,
  universities: selectedValues.default([]),
  collegeTypes,
  autonomousOnly: z.boolean(),
  ews: z.boolean(),
  pwd: z.boolean(),
  defence: z.boolean()
}).strict();

const routeAndFormSchema = z.discriminatedUnion("admissionRoute", [
  z.object({ admissionRoute: z.literal("FE"), formData: feProfileFormSchema }),
  z.object({ admissionRoute: z.literal("DSE"), formData: dseProfileFormSchema })
]);

export const studentProfileSchema = z.intersection(
  routeAndFormSchema,
  z.object({ name: z.string().trim().min(1).max(60) })
);

export const predictionHistorySchema = z.intersection(
  routeAndFormSchema,
  z.object({
    resultCount: z.number().int().min(0).max(100000),
    zoneCounts: z.object({
      SAFE: z.number().int().min(0).optional(),
      TARGET: z.number().int().min(0).optional(),
      AMBITIOUS: z.number().int().min(0).optional(),
      HIGHLY_AMBITIOUS: z.number().int().min(0).optional()
    }).strict().default({})
  })
);
