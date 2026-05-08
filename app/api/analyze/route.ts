import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import {
  ClarityAuditSchema,
  CLARITY_AUDIT_TOOL_INPUT_SCHEMA,
} from "@/lib/schema";
import { SYSTEM_PROMPT, userPrompt } from "@/lib/prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TOOL_NAME = "submit_clarity_audit";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function corsJson(body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: CORS_HEADERS,
  });
}

function normalizeUrl(input: string): string {
  const trimmed = input.trim().replace(/^["']|["']$/g, "");
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const CREDIBILITY_KEYWORDS = [
  "testimonial",
  "review",
  "case study",
  "case studies",
  "trusted by",
  "5 star",
  "five star",
  "client logo",
  "as seen in",
  "featured in",
  "certified",
  "accredited",
  "rated",
  "stars",
  "google reviews",
  "yelp",
  "trustpilot",
];

function extractCredibilitySignals(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const kw of CREDIBILITY_KEYWORDS) {
    if (lower.includes(kw)) found.add(kw);
  }
  // Star count pattern: "4.9", "5.0", etc., near "star" or rating
  if (/\b[1-5]\.\d\s*(?:\/|out of|stars?)/i.test(text)) {
    found.add("numeric star rating");
  }
  // "200+ clients", "500+ businesses" pattern
  if (/\b\d{2,}\+?\s+(?:clients?|customers?|businesses|companies)/i.test(text)) {
    found.add("client count claim");
  }
  return Array.from(found);
}

async function scrape(url: string): Promise<{
  text: string;
  credibilitySignals: string[];
}> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (LevvateAudit/1.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { text, credibilitySignals: extractCredibilitySignals(text) };
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return corsJson(
        { error: "ANTHROPIC_API_KEY not set on server" },
        { status: 500 }
      );
    }
    const body = await req.json();
    const rawUrl: string = body.url ?? "";
    const manualText: string = body.manualText ?? "";
    const url = normalizeUrl(rawUrl);

    if (!url && !manualText) {
      return corsJson(
        { error: "url or manualText required" },
        { status: 400 }
      );
    }

    let text = manualText.trim();
    let credibilitySignals: string[] = [];
    let scrapeError: string | null = null;
    if (!text && url) {
      try {
        const result = await scrape(url);
        text = result.text;
        credibilitySignals = result.credibilitySignals;
      } catch (e) {
        scrapeError =
          e instanceof Error ? e.message : "unknown scrape error";
      }
    } else if (text) {
      // For manual paste, run signal extraction on the pasted text too
      // (defined inline to avoid double-scraping)
      const lower = text.toLowerCase();
      const found = new Set<string>();
      const kws = ["testimonial", "review", "case study", "trusted by", "rated", "stars"];
      for (const kw of kws) if (lower.includes(kw)) found.add(kw);
      credibilitySignals = Array.from(found);
    }

    if (!text) {
      return corsJson(
        {
          error: `Could not fetch the page. ${scrapeError ?? ""}. Paste the homepage text manually below and try again.`,
          scrape_failed: true,
        },
        { status: 422 }
      );
    }

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1800,
      system: SYSTEM_PROMPT,
      tools: [
        {
          name: TOOL_NAME,
          description:
            "Submit the structured clarity audit for the given website. Return exactly one tool call.",
          input_schema: CLARITY_AUDIT_TOOL_INPUT_SCHEMA,
        },
      ],
      tool_choice: { type: "tool", name: TOOL_NAME },
      messages: [
        {
          role: "user",
          content: userPrompt(url || "(pasted)", text, credibilitySignals),
        },
      ],
    });

    const toolUse = msg.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return corsJson(
        { error: "model did not return a tool call" },
        { status: 502 }
      );
    }

    const audit = ClarityAuditSchema.parse(toolUse.input);

    return corsJson({
      url: url || "(pasted text)",
      audit,
      meta: {
        text_chars: text.length,
        truncated: text.length > 8000,
        scrape_warning: scrapeError,
        model: "claude-haiku-4-5-20251001",
        framework: ["5-second test", "StoryBrand SB7", "Levvate service-business rubric"],
        credibility_signals_detected: credibilitySignals,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return corsJson({ error: message }, { status: 500 });
  }
}
