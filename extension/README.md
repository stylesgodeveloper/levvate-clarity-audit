# Clarity Audit Chrome Extension

A Manifest V3 popup extension for Levvate's sales team. Browse any prospect's site, click the icon, get a clarity audit with a copy-paste outreach hook in seconds.

## Why an extension and not just the web app

The web app at https://levvate-clarity.vercel.app is the **inbound** flow: a drop-in replacement for Levvate's existing "Get My Free Site Assessment" form. A prospect arrives, enters their URL, gets a report, and the sales team books the meeting.

This extension is the **outbound** flow. A Levvate sales rep is browsing prospect sites pulled from LinkedIn Sales Nav, Apollo, or local-business scrapes. They don't want to leave the tab, copy the URL, switch to a separate web app, paste, and click. They want the audit overlaid on the page they're already looking at, with a ready-to-paste outreach hook for the cold email.

Same backend (`/api/analyze`), two surfaces, each matched to one user.

## Install (developer mode)

1. Open Chrome and go to `chrome://extensions`.
2. Toggle **Developer mode** on (top right).
3. Click **Load unpacked** and select this `extension/` folder.
4. The icon appears in the toolbar. Pin it for one-click access.

## Use

1. Open any prospect's homepage in a tab.
2. Click the Clarity Audit icon in the toolbar.
3. Click "Run audit on this page." Roughly 5 to 8 seconds for the result.
4. Click "Copy outreach hook" to copy a personalized cold-email scaffold to your clipboard. Paste into Gmail or LinkedIn.

## Files

- `manifest.json` — Manifest V3 declaration. Requires `activeTab` and host permission for the deployed API.
- `popup.html` — popup UI (380px wide, single page, all CSS inline).
- `popup.js` — reads the active tab URL via `chrome.tabs.query`, POSTs to the deployed `/api/analyze`, renders the structured audit, builds the outreach hook from the top suggestion.

## Backend

Calls `https://levvate-clarity.vercel.app/api/analyze` with `{ url }`. The endpoint scrapes, runs Claude Haiku 4.5 with a tool-use schema grounded in the 5-second test (Nielsen Norman) and StoryBrand SB7, and returns a typed audit. CORS is enabled for the extension origin.

## What's missing in this MVP

- Custom icons. Currently uses Chrome's default puzzle-piece icon.
- No options page; the API URL is hardcoded.
- No history of past audits.
- No bulk audit mode (paste 20 URLs at once).
- No HubSpot write-back. The next obvious step: a "Save to HubSpot" button that writes the audit to the contact record matching the prospect's domain.
