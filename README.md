# Clarity Audit

Built for the Levvate AI Automation intern technical assessment, May 2026.

**Live web app:** https://levvate-clarity.vercel.app
**Chrome extension:** [`extension/`](./extension) (load unpacked at `chrome://extensions`)
**Repo:** https://github.com/stylesgodeveloper/levvate-clarity-audit
**Demo video:** https://www.loom.com/share/583cc97db4004351b27e973a83e5d4a9

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

## Roadmap if hired (priority-ranked)

The 60-minute build is the foundation. Here is what I would ship in the first sprint, with effort estimates.

**Day 1 quick wins (already shipped post-call as v0.2):**

1. **Service-business rubric.** Replace the generic SaaS rubric with one tuned to Levvate's actual customer base (consultants, lawyers, doctors, contractors, financial advisors). Score on service clarity, niche specificity, problem framing, credibility markers above the fold, booking CTA strength, and trust design (real photos vs stock, named team vs anonymous "we"). Half-day patch.
2. **Levvate Project Fit classifier.** Each audit returns a tier (`FULL_REDESIGN` / `OPTIMIZATION` / `MAINTENANCE_OR_SEO`) with rationale, so the sales team's queue auto-sorts by opportunity size. A Full Redesign prospect is roughly 10× the revenue of a Maintenance prospect. Half-day patch.
3. **Three-pillar tagging.** Each suggestion is tagged with one of Levvate's own pillars (`CLARITY` / `CREDIBILITY` / `CONVERSION`), pulled directly from levvate.com's three-section structure. Output reads as native Levvate voice. 1-hour patch.
4. **Credibility-signal pre-extraction at scrape time.** Detect "testimonial", "review", "client", "case study", "trusted by", star ratings, etc. and feed the structural signals into the prompt as context, not just raw text. 1-hour patch.

**Sprint 2 (high ROI, 1-2 day each):**

5. **Vision-based audit.** Send the page screenshot alongside the text via Claude's vision API. The model can then comment on visual hierarchy, photo authenticity (real vs stock), white space, color contrast, and mobile readability. This is where the audit moves from "text clarity" to "design clarity," which is what Levvate actually sells. Half-day, biggest single quality jump.
6. **Multi-page crawl.** Audit the homepage AND `/about`, `/services`, `/pricing`, `/testimonials` instead of homepage only. Aggregate score plus per-page weak spots. 1 day.
7. **HubSpot write-back.** Button on the extension: "Push to HubSpot." Writes the audit JSON plus Project Fit tier as custom properties on the matching contact. The sales team's HubSpot queue auto-sorts by tier. 1 day.
8. **Persona-tuned rubrics.** Different scoring weights per niche. Medical wants HIPAA / credentials / patient testimonials. Legal wants case results / bar admissions / specific practice areas. Contractors want before-after photos / licenses / service area. Mirrors Levvate's actual customer segments. 1-2 days.
9. **Email-gated funnel.** Show summary plus score for free, gate the three fixes plus Project Fit behind email capture. Same lead-capture mechanics as today, instant value on top. 2 hours.

**Sprint 3 (the killer UX play):**

10. **Annotation drill-down (Tier 1).** Content script that overlays the page in the Chrome extension. User hovers any DOM element (hero, CTA, testimonial section), gets an "Audit this section" tooltip. Click sends that element's HTML plus a screenshot region to a new `/api/analyze-section` endpoint. Like Chrome DevTools, but for clarity. 1-2 days.
11. **Live overlay annotations (Tier 2).** After running the page audit, the extension highlights each problematic element directly on the page with a colored badge. Click a suggestion in the popup, the element on the page glows. Sales team can screenshot the annotated page and paste it into a cold email. 3 days.
12. **Drift detection.** Save audits, re-audit monthly, flag score deltas. "This prospect's site got worse since last month — perfect re-engagement moment." 2-3 days.

**Production hardening (any time):**

- Calibrate the 1 to 10 rubric against a labeled set of 20 sites with a golden-set grading prompt
- Per-section scoring (headline, value prop, CTA, trust signals, mobile)
- Rate limiting and an API key gate for the production endpoint
- Real PDF rendering via `puppeteer` for emailable reports; cache by URL hash

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
