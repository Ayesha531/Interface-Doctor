"use client";

import { useMemo, useState } from "react";
import type { AnalysisFinding, AnalyzeResult, Severity } from "@/lib/types";
import { CATEGORY_LABELS, FINDING_CATEGORIES, type FindingCategory } from "@/lib/types";

interface AnalysisResultPanelProps {
  loading: boolean;
  result: AnalyzeResult | null;
  activeFindingId?: string | null;
  onActivateFinding?: (id: string | null) => void;
}

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: "bg-red-100 text-red-800 border-red-300",
  high: "bg-red-50 text-red-700 border-red-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-sky-50 text-sky-700 border-sky-200",
};

const SEVERITY_DOT: Record<Severity, string> = {
  critical: "bg-red-600",
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-sky-500",
};

export function AnalysisResultPanel({
  loading,
  result,
  activeFindingId,
  onActivateFinding,
}: AnalysisResultPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<FindingCategory | "all">("all");

  const findings = useMemo<AnalysisFinding[]>(() => {
    if (!result || result.status !== "ok") return [];
    return result.findings;
  }, [result]);

  const filteredFindings = useMemo(() => {
    if (selectedCategory === "all") return findings;
    return findings.filter((f) => f.category === selectedCategory);
  }, [findings, selectedCategory]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<FindingCategory, number>();
    for (const f of findings) {
      counts.set(f.category, (counts.get(f.category) ?? 0) + 1);
    }
    return counts;
  }, [findings]);

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
      <div
        role="status"
        className="mt-6 animate-fade-in rounded-xl border border-amber-200 bg-amber-50 p-5"
      >
        <div className="flex items-start gap-3">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-500"
            aria-hidden="true"
          >
            <path
              d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-amber-800">
              AI analysis requires configuration
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-amber-800/90">{result.message}</p>
            <p className="mt-2 text-xs text-amber-700">
              Required:{" "}
              <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono">{(result.missing ?? []).join(", ")}</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (result.status === "error") {
    return (
      <div
        role="alert"
        className="mt-6 animate-fade-in rounded-xl border border-red-200 bg-red-50 p-5"
      >
        <h3 className="text-sm font-semibold text-red-800">Analysis could not be completed</h3>
        <p className="mt-1 text-sm text-red-700">{result.message}</p>
      </div>
    );
  }

  return (
    <section
      aria-label="AI diagnosis results"
      className="mt-6 animate-fade-in rounded-xl border border-ink-200 bg-white p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink-900">
          Diagnosis — {result.findings.length} finding{result.findings.length === 1 ? "" : "s"}
        </h3>
        <span className="text-xs text-ink-400">
          {result.provider} · {result.model}
        </span>
      </div>

      {findings.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <FilterChip
            label="All"
            count={findings.length}
            selected={selectedCategory === "all"}
            onClick={() => setSelectedCategory("all")}
          />
          {FINDING_CATEGORIES.map((category) => {
            const count = categoryCounts.get(category) ?? 0;
            if (count === 0) return null;
            return (
              <FilterChip
                key={category}
                label={CATEGORY_LABELS[category]}
                count={count}
                selected={selectedCategory === category}
                onClick={() => setSelectedCategory(category)}
              />
            );
          })}
        </div>
      )}

      {filteredFindings.length === 0 ? (
        <p className="mt-5 text-sm text-ink-500">
          No findings match the selected category. Choose a different filter or upload a new
          screenshot.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {filteredFindings.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              index={findings.findIndex((f) => f.id === finding.id)}
              active={activeFindingId === finding.id}
              onActivate={() => onActivateFinding?.(finding.id)}
              onDeactivate={() => onActivateFinding?.(null)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function FilterChip({
  label,
  count,
  selected,
  onClick,
}: {
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        selected
          ? "border-brand-500 bg-brand-50 text-brand-700"
          : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50"
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
          selected ? "bg-brand-100 text-brand-800" : "bg-ink-100 text-ink-600"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function FindingCard({
  finding,
  index,
  active,
  onActivate,
  onDeactivate,
}: {
  finding: AnalysisFinding;
  index: number;
  active: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
}) {
  return (
    <li
      className={`rounded-lg border p-4 transition-colors ${
        active ? "border-brand-400 bg-brand-50/40" : "border-ink-200 bg-white hover:bg-ink-50/50"
      } ${finding.region ? "cursor-pointer" : ""}`}
      onMouseEnter={() => finding.region && onActivate()}
      onMouseLeave={onDeactivate}
      onClick={() => finding.region && onActivate()}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${SEVERITY_DOT[finding.severity]}`}
        >
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SEVERITY_STYLES[finding.severity]}`}
            >
              {finding.severity}
            </span>
            <span className="text-xs text-ink-500">{CATEGORY_LABELS[finding.category]}</span>
          </div>
          <h4 className="mt-2 text-sm font-semibold text-ink-900">{finding.title}</h4>
          <p className="mt-1 text-sm leading-relaxed text-ink-600">{finding.explanation}</p>
          {finding.suggestion && (
            <p className="mt-2 text-sm text-ink-700">
              <span className="font-medium text-brand-700">Suggested fix: </span>
              {finding.suggestion}
            </p>
          )}
          {typeof finding.confidence === "number" && (
            <p className="mt-2 text-xs text-ink-400">
              Confidence:{" "}
              <span className="font-medium text-ink-600">
                {Math.round(finding.confidence * 100)}%
              </span>
            </p>
          )}
          {!finding.region && (
            <p className="mt-2 text-xs text-ink-400">No screenshot location provided.</p>
          )}
        </div>
      </div>
    </li>
  );
}
