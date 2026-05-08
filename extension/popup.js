const API_URL = "https://levvate-clarity.vercel.app/api/analyze";

const urlEl = document.getElementById("url");
const runBtn = document.getElementById("run");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const scoreEl = document.getElementById("score");
const summaryEl = document.getElementById("summary");
const reasoningEl = document.getElementById("reasoning");
const suggestionsEl = document.getElementById("suggestions");
const copyHookBtn = document.getElementById("copyHook");
const copyJsonBtn = document.getElementById("copyJson");
const copiedEl = document.getElementById("copied");
const projectFitEl = document.getElementById("projectFit");

const TIER_LABELS = {
  FULL_REDESIGN: { label: "Full Redesign", blurb: "Site needs a ground-up rebuild." },
  OPTIMIZATION: { label: "Conversion Optimization", blurb: "Solid bones. Sharpen messaging and CTAs." },
  MAINTENANCE_OR_SEO: { label: "Maintenance / SEO", blurb: "Site does its job. Keep it healthy and grow traffic." },
};

let currentUrl = "";
let currentAudit = null;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

async function init() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentUrl = tab?.url || "";
    urlEl.textContent = currentUrl || "(no URL)";
    if (!/^https?:\/\//.test(currentUrl)) {
      statusEl.innerHTML =
        '<div class="err">This tab is not a regular web page. Open any http(s) site and try again.</div>';
      runBtn.disabled = true;
    }
  } catch (e) {
    urlEl.textContent = "(could not read current tab)";
    runBtn.disabled = true;
  }
}

async function runAudit() {
  runBtn.disabled = true;
  runBtn.innerHTML = '<span class="spinner"></span>Analyzing...';
  statusEl.innerHTML = "";
  resultEl.style.display = "none";
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: currentUrl }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || `request failed (${res.status})`);
    render(j);
  } catch (e) {
    statusEl.innerHTML = `<div class="err">${escapeHtml(e.message)}</div>`;
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = "Re-run audit";
  }
}

function render(data) {
  currentAudit = data.audit;
  const a = data.audit;

  scoreEl.textContent = a.clarity_score;
  scoreEl.className =
    "score " +
    (a.clarity_score >= 8 ? "high" : a.clarity_score >= 5 ? "med" : "low");

  summaryEl.textContent = a.business_summary;
  reasoningEl.textContent = a.clarity_reasoning;

  if (a.levvate_project_fit && TIER_LABELS[a.levvate_project_fit.tier]) {
    const tier = a.levvate_project_fit.tier;
    const meta = TIER_LABELS[tier];
    projectFitEl.innerHTML = `
      <div class="fit-card ${tier}">
        <div class="fit-label ${tier}">Levvate Project Fit · ${escapeHtml(meta.label)}</div>
        <div class="fit-blurb">${escapeHtml(meta.blurb)}</div>
        <div class="fit-rationale">${escapeHtml(a.levvate_project_fit.rationale)}</div>
      </div>
    `;
  } else {
    projectFitEl.innerHTML = "";
  }

  suggestionsEl.innerHTML = a.suggestions
    .map((s) => {
      const why = s.why_it_matters || "";
      const fix = s.fix || s.action || "";
      const pillar = s.pillar || "";
      return `
    <div class="sug ${escapeHtml(s.priority)}">
      <div class="sug-meta">
        ${pillar ? `<span class="pillar ${escapeHtml(pillar)}">${escapeHtml(pillar)}</span>` : ""}
        <span class="sug-priority">${escapeHtml(s.priority)} priority</span>
      </div>
      <div class="sug-issue">&ldquo;${escapeHtml(s.issue)}&rdquo;</div>
      ${why ? `<div class="sug-why">${escapeHtml(why)}</div>` : ""}
      <div class="sug-fix"><span class="sug-fix-label">Fix:</span> ${escapeHtml(fix)}</div>
    </div>
  `;
    })
    .join("");

  resultEl.style.display = "block";
}

function buildOutreachHook() {
  if (!currentAudit) return "";
  const top = currentAudit.suggestions[0];
  let hostname = currentUrl;
  try {
    hostname = new URL(currentUrl).hostname;
  } catch {}
  const why = top.why_it_matters || top.issue || "";
  const fix = top.fix || top.action || "";
  return `Hi [Name],

I came across ${hostname} and ran a quick clarity check on the homepage. It scored ${currentAudit.clarity_score}/10 against the 5-second test and StoryBrand framework.

The biggest thing I noticed: ${why}

A quick fix: ${fix}

If you'd want a fresh set of eyes on the rest of the site, I'm happy to walk through the full audit.

[Your name]
Levvate
`;
}

async function copy(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    copiedEl.textContent = label + " copied to clipboard";
    copiedEl.style.display = "block";
    setTimeout(() => {
      copiedEl.style.display = "none";
    }, 2000);
  } catch (e) {
    copiedEl.textContent = "Copy failed: " + e.message;
    copiedEl.style.display = "block";
  }
}

runBtn.addEventListener("click", runAudit);
copyHookBtn.addEventListener("click", () =>
  copy(buildOutreachHook(), "Outreach hook")
);
copyJsonBtn.addEventListener("click", () =>
  copy(JSON.stringify(currentAudit, null, 2), "JSON")
);

init();
