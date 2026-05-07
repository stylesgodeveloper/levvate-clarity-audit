import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { ClarityAuditSchema } from "@/lib/schema";
import { SYSTEM_PROMPT, userPrompt } from "@/lib/prompt";

export const runtime = "nodejs";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function scrape(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (LevvateAudit/1.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
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

function extractJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("no JSON object found in model output");
  return JSON.parse(match[0]);
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not set on server" },
        { status: 500 }
      );
    }
    const body = await req.json();
    const url: string = body.url ?? "";
    const manualText: string = body.manualText ?? "";

    if (!url && !manualText) {
      return NextResponse.json(
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
      return NextResponse.json(
        {
          error: `could not get page text. ${scrapeError ?? ""}. Paste the homepage text manually and retry.`,
        },
        { status: 422 }
      );
    }

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt(url || "(pasted)", text) }],
    });

    const raw =
      msg.content[0]?.type === "text" ? msg.content[0].text : "";
    const json = extractJson(raw);
    const audit = ClarityAuditSchema.parse(json);

    return NextResponse.json({
      url: url || "(pasted text)",
      audit,
      meta: {
        text_chars: text.length,
        truncated: text.length > 8000,
        scrape_warning: scrapeError,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
