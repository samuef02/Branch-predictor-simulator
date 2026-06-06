import { z } from "zod";

const outcomeSchema = z.union([z.literal("T"), z.literal("NT")]);

export const officialTemplateSchema = z.object({
  id: z.string().min(1),
  exerciseNumber: z.number().int().positive(),
  verificationStatus: z.union([z.literal("verified"), z.literal("draft")]),
  title: z.string().min(1),
  statement: z.string().min(1),
  source: z.literal("ref_docs/Problemas.pdf"),
  pdfReference: z.string().min(1),
  branchSequence: z.object({
    executions: z.array(
      z.object({
        order: z.number().int().nonnegative(),
        branchId: z.string().min(1),
        actual: outcomeSchema,
        address: z.number().int().nonnegative().optional(),
        manualIndex: z.number().int().nonnegative().optional(),
        comment: z.string().optional()
      })
    ),
    loops: z.array(
      z.object({
        startOrder: z.number().int().nonnegative(),
        endOrder: z.number().int().nonnegative(),
        repetitions: z.number().int().positive()
      })
    )
  }),
  variants: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      predictorConfig: z.any(),
      initialState: z.string().min(1),
      officialSolution: z.object({
        summary: z.string().min(1),
        stableFromStep: z.number().int().positive().optional(),
        notes: z.string().optional()
      }),
      expectedStatistics: z.object({
        hits: z.number().int().nonnegative().optional(),
        misses: z.number().int().nonnegative().optional(),
        hitRate: z.number().nonnegative().optional(),
        missRate: z.number().nonnegative().optional(),
        memoryBits: z.number().int().nonnegative().optional(),
        notes: z.string().optional()
      })
    })
  )
});
