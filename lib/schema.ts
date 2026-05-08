import { z } from "zod";

export const SuggestionSchema = z.object({
  issue: z
    .string()
    .describe(
      "The exact phrase or section from the site that hurts clarity. Quote it verbatim."
    ),
  why_it_matters: z
    .string()
    .describe("One sentence on why this confuses or loses visitors."),
  fix: z
    .string()
    .describe("A concrete rewrite or change a developer could ship today."),
  priority: z.enum(["high", "medium", "low"]),
});

export const ClarityAuditSchema = z.object({
  business_summary: z
    .string()
    .describe(
      "1 to 2 sentences in plain language. Lead with WHO it serves and WHAT outcome it delivers."
    ),
  clarity_score: z.number().int().min(1).max(10),
  clarity_reasoning: z
    .string()
    .describe(
      "2 to 3 sentences justifying the score against the 5-second test and value-prop concreteness."
    ),
  suggestions: z.array(SuggestionSchema).min(2).max(3),
});

export type Suggestion = z.infer<typeof SuggestionSchema>;
export type ClarityAudit = z.infer<typeof ClarityAuditSchema>;

export const CLARITY_AUDIT_TOOL_INPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    business_summary: {
      type: "string",
      description:
        "1 to 2 sentences in plain language. Lead with WHO it serves and WHAT outcome it delivers, not a feature list.",
    },
    clarity_score: {
      type: "integer",
      minimum: 1,
      maximum: 10,
      description: "Clarity score from 1 (incoherent) to 10 (instantly clear).",
    },
    clarity_reasoning: {
      type: "string",
      description:
        "2 to 3 sentences justifying the score against the 5-second test (can a visitor tell what it is, who for, what to do next in 5 seconds) and value-prop concreteness.",
    },
    suggestions: {
      type: "array",
      minItems: 2,
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          issue: {
            type: "string",
            description:
              "The exact phrase or section from the site that hurts clarity. Quote it verbatim. Do NOT paraphrase.",
          },
          why_it_matters: {
            type: "string",
            description:
              "One sentence on why this confuses or loses visitors.",
          },
          fix: {
            type: "string",
            description:
              "A concrete rewrite or change a developer could ship today. If proposing a new headline, write the new headline.",
          },
          priority: {
            type: "string",
            enum: ["high", "medium", "low"],
          },
        },
        required: ["issue", "why_it_matters", "fix", "priority"],
        additionalProperties: false,
      },
    },
  },
  required: [
    "business_summary",
    "clarity_score",
    "clarity_reasoning",
    "suggestions",
  ],
  additionalProperties: false,
};
