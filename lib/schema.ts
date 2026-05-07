import { z } from "zod";

export const ClarityAuditSchema = z.object({
  business_summary: z
    .string()
    .describe("1 to 2 sentence plain-English summary of what the business does"),
  clarity_score: z.number().int().min(1).max(10),
  clarity_reasoning: z
    .string()
    .describe("1 to 2 sentence justification for the score"),
  suggestions: z
    .array(
      z.object({
        issue: z
          .string()
          .describe("what is unclear or missing on the page"),
        action: z
          .string()
          .describe("specific concrete change to make"),
        priority: z.enum(["high", "medium", "low"]),
      })
    )
    .min(2)
    .max(3),
});

export type ClarityAudit = z.infer<typeof ClarityAuditSchema>;
