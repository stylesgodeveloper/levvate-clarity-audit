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

async function scrape(url: string): Promise<string> {
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
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
    let scrapeError: string | null = null;
    if (!text && url) {
      try {
        text = await scrape(url);
      } catch (e) {
        scrapeError =
          e instanceof Error ? e.message : "unknown scrape error";
      }
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
      max_tokens: 1500,
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
        { role: "user", content: userPrompt(url || "(pasted)", text) },
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
        framework: ["5-second test (Nielsen Norman)", "StoryBrand SB7"],
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return corsJson({ error: message }, { status: 500 });
  }
}
