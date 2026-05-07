# Clarity Audit

A 60-minute build for the Levvate AI Automation intern technical assessment, May 2026.

URL in. Out: a 1 to 2 sentence summary of what the business does, a 1 to 10 clarity score with reasoning, and 2 to 3 prioritized suggestions to improve the homepage's clarity.

## How to run

```bash
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
npm run dev
```

Open http://localhost:3000, paste a URL, hit "Run audit." If a site blocks scraping (CAPTCHA, JS-only render, anti-bot), expand "Scraping blocked? Paste homepage text instead" and paste the visible text manually.

## Approach

1. **Scrape** the URL with `fetch` and a desktop User-Agent. Strip `<script>`, `<style>`, comments, and tags down to plain text. If the request fails, the API surfaces a clear error so the UI can prompt for manual paste.
2. **Schema-first LLM call.** A zod schema (`lib/schema.ts`) defines the audit shape. The system prompt embeds the JSON schema and a 1 to 10 scoring rubric. The model is asked to return JSON only.
3. **Validate** the model output through zod before returning to the client. If the LLM drifts from the schema, the API returns a 500 with the validation error rather than render bad data.
4. **Render** as cards (summary, score, prioritized suggestions). The "Export PDF" button uses `window.print()` plus print-friendly CSS, which is enough to ship a client-ready report without a heavyweight PDF dependency.

## Design choices and trade-offs

**Why schema-first:** The agency's downstream tooling (sales follow-ups, CRM routing) depends on a stable output shape. Free-form LLM prose breaks pipelines. A typed schema with runtime validation makes the audit safe to embed into HubSpot, email templates, or a sales dashboard with no parsing logic.

**Why one global score, not per-section:** Faster decision for the sales team, simpler to act on. A per-section breakdown (headline, CTA, social proof, mobile, etc.) is the right v2.

**Why `window.print()` instead of a real PDF library:** Within a 60-minute scope, a print stylesheet beats wrestling with `react-pdf` or `puppeteer`. The output is identical for client delivery purposes.

**Crude HTML-to-text scraping:** Regex-based, not a real DOM parser. Misses nuance like image alt text and structured data. A v2 would use `cheerio` plus a Readability extractor and pull `og:` meta tags into the prompt.

## Things I would build next

- Crawl `/about`, `/pricing`, `/services`, `/testimonials` instead of homepage only
- Calibrate the 1 to 10 rubric against a labeled set of 20 sites (golden set + grading prompt)
- Per-section scoring (headline, value prop, CTA, trust signals, mobile readability)
- Tool-use mode on the Anthropic SDK so the schema is enforced at the model boundary, not just by post-hoc validation
- Rate limiting and an API key gate for the production endpoint
- Real PDF rendering via `puppeteer` for emailable reports; cache by URL hash
- HubSpot integration: write the audit object to a CRM property and tag the lead automatically

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4 (default scaffold)
- `@anthropic-ai/sdk` with Claude Haiku 4.5
- `zod` for schema validation

## Files of interest

- `lib/schema.ts` — the zod schema for the audit output
- `lib/prompt.ts` — the system prompt and the user prompt template
- `app/api/analyze/route.ts` — scrape + LLM + validate
- `app/page.tsx` — single-page UI

## Example output

See `examples/` for a sample JSON response captured at build time.
