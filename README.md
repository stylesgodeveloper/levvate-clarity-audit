# Clarity Audit

Built for the Levvate AI Automation intern technical assessment, May 2026.

**Live web app:** https://levvate-clarity.vercel.app
**Chrome extension:** [`extension/`](./extension) (load unpacked at `chrome://extensions`)
**Repo:** https://github.com/stylesgodeveloper/levvate-clarity-audit

## Two surfaces, one backend, two real users

The brief asks for a tool that audits a website's messaging clarity. Most candidates will ship a text-box web app. I shipped two surfaces over the same `/api/analyze` endpoint because Levvate's clarity audit serves two distinct workflows, and a generic text box serves neither well:

**Inbound: the web app** at levvate.com today already says "Get My Free Site Assessment." The web app is a drop-in automation of that exact lead magnet. Prospect lands, enters their URL, gets a structured report, sales team books the meeting.

**Outbound: the Chrome extension** is for Levvate's sales team browsing prospect sites pulled from LinkedIn Sales Nav, Apollo, or local-business scrapes. Click the icon while on a prospect's homepage, get the audit overlaid on the page, copy a ready-to-paste outreach hook into Gmail or LinkedIn. Zero context switching.

Same backend, same Claude Haiku 4.5 + tool-use call, two surfaces matched to two users.

## What the audit returns

URL in. Out:

- 1 to 2 sentence plain-language summary of what the business does
- A 1 to 10 clarity score with framework-grounded reasoning
- 2 to 3 ranked suggestions, each with the verbatim quoted issue, why it matters, and a concrete fix the developer could ship today

## Sample audits captured live

- `examples/stripe.json` — stripe.com, score 9 / 10 (anchored against Stripe-tier reference)
- `examples/gentledental.json` — a real multi-location dental practice, score 5 / 10
- `examples/linear.json` — linear.app, score 6 / 10

## How to run

```bash
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
npm run dev
```

Open http://localhost:3000, paste a URL, hit "Run audit." If a site blocks scraping (CAPTCHA, JS-only render, anti-bot), expand "Scraping blocked? Paste homepage text instead" and paste the visible text manually.

## Approach

1. **Scrape** the URL with `fetch` and a desktop User-Agent. Strip `<script>`, `<style>`, comments, and tags down to plain text. If the request fails, the UI prompts for a manual paste fallback (handy for JS-only or anti-bot sites).
2. **Tool-use LLM call.** The endpoint calls Claude Haiku 4.5 with `tool_choice` forcing a single `submit_clarity_audit` call. The tool's input schema IS the audit shape. The model cannot return free-form prose; it must populate the structured fields. This eliminates a whole class of JSON-parsing failures.
3. **Framework-grounded prompt.** The system prompt anchors evaluation in the 5-second test (Nielsen Norman Group) and StoryBrand SB7 (Donald Miller). Scores are anchored to reference brands ("Stripe-tier instant clarity = 9-10") to prevent drift to middling 7s. Suggestions must quote the source verbatim and propose a concrete rewrite, not generic advice.
4. **Validate** the tool output through zod before returning. If the model somehow violates the schema, the API surfaces the error rather than render bad data.
5. **Render** as cards (summary, score, prioritized suggestions with quoted issue + why it matters + fix). The web app's "Export PDF" button uses `window.print()` with print-friendly CSS. The extension's "Copy outreach hook" button generates a personalized cold-email scaffold from the top suggestion.

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
