"use client";

import type { AnalysisFinding, AnalyzeResult, Severity } from "@/lib/types";

interface AnalysisResultPanelProps {
  loading: boolean;
  result: AnalyzeResult | null;
}

const SEVERITY_STYLES: Record<Severity, string> = {
  high: "bg-red-50 text-red-700 border-red-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-sky-50 text-sky-700 border-sky-200",
};

export function AnalysisResultPanel({ loading, result }: AnalysisResultPanelProps) {
  if (loading) {
    return (
      <div role="status" className="mt-6 rounded-xl border border-ink-200 bg-white p-5">
        <p className="flex items-center gap-3 text-sm text-ink-600">
          <span
            className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600"
            aria-hidden="true"
          />
          Contacting the AI engine… this can take up to a minute.
        </p>
        <div className="mt-4 space-y-3" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-ink-100" />
          ))}
        </div>
      </div>
    );
  }

  if (!result) return null;

  if (result.status === "ai_unconfigured") {
    return (
      <div role="status" className="mt-6 animate-fade-in rounded-xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden="true">
            <path d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-amber-800">
              AI analysis requires configuration
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-amber-800/90">{result.message}</p>
            <p className="mt-2 text-xs text-amber-700">
              Required: <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono">{result.missing.join(", ")}</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (result.status === "error") {
    return (
      <div role="alert" className="mt-6 animate-fade-in rounded-xl border border-red-200 bg-red-50 p-5">
        <h3 className="text-sm font-semibold text-red-800">Analysis could not be completed</h3>
        <p className="mt-1 text-sm text-red-700">{result.message}</p>
      </div>
    );
  }

  return (
    <section aria-label="AI diagnosis results" className="mt-6 animate-fade-in rounded-xl border border-ink-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink-900">
          Diagnosis — {result.findings.length} finding{result.findings.length === 1 ? "" : "s"}
        </h3>
        <span className="text-xs text-ink-400">
          {result.provider} · {result.model}
        </span>
      </div>
      <ul className="mt-4 space-y-3">
        {result.findings.map((finding) => (
          <FindingCard key={finding.id} finding={finding} />
        ))}
      </ul>
    </section>
  );
}

function FindingCard({ finding }: { finding: AnalysisFinding }) {
  return (
    <li className="rounded-lg border border-ink-200 p-4">
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${SEVERITY_STYLES[finding.severity]}`}
        >
          {finding.severity}
        </span>
        <h4 className="text-sm font-semibold text-ink-900">{finding.title}</h4>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-600">{finding.explanation}</p>
      {finding.suggestion && (
        <p className="mt-2 text-sm text-ink-700">
          <span className="font-medium text-brand-700">Suggested fix: </span>
          {finding.suggestion}
        </p>
      )}
    </li>
  );
}
