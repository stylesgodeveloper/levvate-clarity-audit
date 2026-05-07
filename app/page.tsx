"use client";

import { useState } from "react";

type Suggestion = {
  issue: string;
  action: string;
  priority: "high" | "medium" | "low";
};

type Audit = {
  business_summary: string;
  clarity_score: number;
  clarity_reasoning: string;
  suggestions: Suggestion[];
};

type ApiResponse = {
  url: string;
  audit: Audit;
  meta: {
    text_chars: number;
    truncated: boolean;
    scrape_warning: string | null;
  };
};

const priorityColor = {
  high: "border-red-600",
  medium: "border-amber-600",
  low: "border-gray-400",
} as const;

const priorityLabel = {
  high: "HIGH PRIORITY",
  medium: "MEDIUM",
  low: "LOW",
} as const;

export default function Home() {
  const [url, setUrl] = useState("");
  const [manualText, setManualText] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setErr(null);
    setData(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), manualText: manualText.trim() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "request failed");
      setData(j);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "unknown error");
    } finally {
      setLoading(false);
    }
  }

  const score = data?.audit.clarity_score;
  const scoreColor =
    score === undefined
      ? ""
      : score >= 8
      ? "text-green-700"
      : score >= 5
      ? "text-amber-700"
      : "text-red-700";

  return (
    <main className="max-w-3xl mx-auto p-6 sm:p-10 space-y-6 print:p-4">
      <header className="space-y-1 print:space-y-0">
        <h1 className="text-3xl font-bold tracking-tight">Clarity Audit</h1>
        <p className="text-gray-600 text-sm">
          Paste a website URL. Get a 1 to 10 clarity score and 2 to 3 specific suggestions.
        </p>
      </header>

      <section className="space-y-3 print:hidden">
        <input
          className="w-full border border-gray-300 rounded p-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading && (url || manualText)) run();
          }}
          disabled={loading}
        />

        <button
          type="button"
          onClick={() => setShowManual((v) => !v)}
          className="text-xs text-gray-600 underline"
        >
          {showManual ? "Hide" : "Scraping blocked? Paste homepage text instead"}
        </button>

        {showManual && (
          <textarea
            className="w-full border border-gray-300 rounded p-3 text-sm font-mono"
            rows={5}
            placeholder="Paste homepage text here. Used as a fallback when scraping fails."
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            disabled={loading}
          />
        )}

        <div className="flex gap-2 items-center">
          <button
            onClick={run}
            disabled={loading || (!url && !manualText)}
            className="px-4 py-2 bg-black text-white rounded disabled:opacity-50 text-sm font-medium"
          >
            {loading ? "Analyzing..." : "Run audit"}
          </button>
          {data && (
            <button
              onClick={() => window.print()}
              className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
            >
              Export PDF
            </button>
          )}
        </div>
      </section>

      {err && (
        <div className="border border-red-300 bg-red-50 text-red-800 p-3 rounded text-sm">
          {err}
        </div>
      )}

      {data?.audit && (
        <article className="space-y-4">
          <div className="text-xs text-gray-500">
            Audit for <span className="font-mono">{data.url}</span>
            {data.meta.truncated && " (text truncated to 8000 chars)"}
          </div>

          <Card title="What this business does">
            <p className="text-gray-900">{data.audit.business_summary}</p>
          </Card>

          <Card
            title={
              <span>
                Clarity score:{" "}
                <span className={`text-3xl font-bold ${scoreColor}`}>
                  {data.audit.clarity_score}
                </span>
                <span className="text-gray-400"> / 10</span>
              </span>
            }
          >
            <p className="text-gray-700 text-sm">{data.audit.clarity_reasoning}</p>
          </Card>

          <Card title={`Suggestions (${data.audit.suggestions.length})`}>
            <ul className="space-y-4">
              {data.audit.suggestions.map((s, i) => (
                <li
                  key={i}
                  className={`border-l-4 pl-3 ${priorityColor[s.priority]}`}
                >
                  <div className="text-xs font-semibold text-gray-500 tracking-wider">
                    {priorityLabel[s.priority]}
                  </div>
                  <div className="font-medium text-gray-900 mt-1">
                    Issue: {s.issue}
                  </div>
                  <div className="text-gray-700 text-sm mt-1">
                    Action: {s.action}
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <details className="text-xs text-gray-500 print:hidden">
            <summary className="cursor-pointer">Raw JSON</summary>
            <pre className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded overflow-x-auto">
              {JSON.stringify(data.audit, null, 2)}
            </pre>
          </details>
        </article>
      )}

      <footer className="text-xs text-gray-400 pt-8 print:pt-4">
        Built for the Levvate AI Automation intern technical assessment, May 2026.
      </footer>
    </main>
  );
}

function Card({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-gray-200 rounded p-5 bg-white print:border-gray-400">
      <h2 className="font-semibold mb-2 text-gray-900">{title}</h2>
      {children}
    </section>
  );
}
