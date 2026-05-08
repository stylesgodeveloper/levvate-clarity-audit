import { z } from "zod";

export const PillarEnum = z.enum(["CLARITY", "CREDIBILITY", "CONVERSION"]);
export const PriorityEnum = z.enum(["high", "medium", "low"]);
export const ProjectFitTierEnum = z.enum([
  "FULL_REDESIGN",
  "OPTIMIZATION",
  "MAINTENANCE_OR_SEO",
]);

export const SuggestionSchema = z.object({
  pillar: PillarEnum.describe(
    "Which Levvate pillar this maps to: CLARITY (messaging), CREDIBILITY (trust signals), or CONVERSION (CTAs and friction)."
  ),
  issue: z
    .string()
    .describe(
      "The exact phrase or section from the site that hurts. Quote it verbatim."
    ),
  why_it_matters: z
    .string()
    .describe(
      "One sentence on why this confuses or loses service-business prospects."
    ),
  fix: z
    .string()
    .describe("A concrete rewrite or change a developer could ship today."),
  priority: PriorityEnum,
});

export const LevvateProjectFitSchema = z.object({
  tier: ProjectFitTierEnum.describe(
    "FULL_REDESIGN (score <= 5 OR major credibility gaps OR template look), OPTIMIZATION (score 6-7, decent bones, weak messaging or CTAs), MAINTENANCE_OR_SEO (score 8+)."
  ),
  rationale: z
    .string()
    .describe(
      "One sentence justifying the tier, citing specific signals from the site."
    ),
});

export const ClarityAuditSchema = z.object({
  business_summary: z
    .string()
    .describe(
      "1 to 2 sentences. Lead with WHO it serves and WHAT outcome it delivers."
    ),
  clarity_score: z.number().int().min(1).max(10),
  clarity_reasoning: z
    .string()
    .describe(
      "2 to 3 sentences justifying the score against the service-business rubric."
    ),
  suggestions: z.array(SuggestionSchema).min(2).max(3),
  levvate_project_fit: LevvateProjectFitSchema,
});

export type Suggestion = z.infer<typeof SuggestionSchema>;
export type LevvateProjectFit = z.infer<typeof LevvateProjectFitSchema>;
export type ClarityAudit = z.infer<typeof ClarityAuditSchema>;

export const CLARITY_AUDIT_TOOL_INPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    business_summary: {
      type: "string",
      description:
        "1 to 2 sentences. Lead with WHO it serves and WHAT outcome it delivers, not a feature list.",
    },
    clarity_score: {
      type: "integer",
      minimum: 1,
      maximum: 10,
      description:
        "Service-business clarity score from 1 (incoherent or template) to 10 (specialized firm with sharp niche, real testimonials, clear booking flow).",
    },
    clarity_reasoning: {
      type: "string",
      description:
        "2 to 3 sentences citing the service-business rubric (service clarity, niche specificity, problem framing, credibility markers, booking CTA, trust design).",
    },
    suggestions: {
      type: "array",
      minItems: 2,
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          pillar: {
            type: "string",
            enum: ["CLARITY", "CREDIBILITY", "CONVERSION"],
            description:
              "Levvate's three pillars. Spread across pillars where the site allows.",
          },
          issue: {
            type: "string",
            description:
              "The exact phrase or section from the site that hurts. Quote it verbatim. Do NOT paraphrase.",
          },
          why_it_matters: {
            type: "string",
            description:
              "One sentence on why this loses a service-business prospect.",
          },
          fix: {
            type: "string",
            description:
              "A concrete rewrite or change a developer could ship today. If proposing new headline copy, write the actual new headline.",
          },
          priority: {
            type: "string",
            enum: ["high", "medium", "low"],
          },
        },
        required: ["pillar", "issue", "why_it_matters", "fix", "priority"],
        additionalProperties: false,
      },
    },
    levvate_project_fit: {
      type: "object",
      properties: {
        tier: {
          type: "string",
          enum: ["FULL_REDESIGN", "OPTIMIZATION", "MAINTENANCE_OR_SEO"],
          description:
            "FULL_REDESIGN: score <= 5, OR major credibility gaps, OR template design, OR no clear positioning. OPTIMIZATION: score 6-7, decent bones, weak messaging or CTAs. MAINTENANCE_OR_SEO: score 8+, site already does its job.",
        },
        rationale: {
          type: "string",
          description:
            "One sentence justifying the tier with specific signals from the site.",
        },
      },
      required: ["tier", "rationale"],
      additionalProperties: false,
    },
  },
  required: [
    "business_summary",
    "clarity_score",
    "clarity_reasoning",
    "suggestions",
    "levvate_project_fit",
  ],
  additionalProperties: false,
};
