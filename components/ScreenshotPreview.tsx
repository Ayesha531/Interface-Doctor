"use client";

import type { ScreenshotSelection } from "@/lib/types";
import { formatBytes } from "@/lib/uploadValidation";

interface ScreenshotPreviewProps {
  selection: ScreenshotSelection;
  onRemove: () => void;
  onReplace: () => void;
  onAnalyze: () => void;
  analyzing: boolean;
}

export function ScreenshotPreview({
  selection,
  onRemove,
  onReplace,
  onAnalyze,
  analyzing,
}: ScreenshotPreviewProps) {
  return (
    <div className="animate-fade-in">
      <div className="overflow-hidden rounded-xl border border-ink-200 bg-ink-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={selection.previewUrl}
          alt={`Preview of ${selection.name}`}
          className="mx-auto max-h-[420px] w-full object-contain"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-600">
        <span className="max-w-[240px] truncate font-medium text-ink-800" title={selection.name}>
          {selection.name}
        </span>
        <span className="text-ink-400">
          {selection.width}×{selection.height}px · {formatBytes(selection.sizeBytes)}
        </span>
        {selection.source === "sample" && (
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
            Sample screenshot
          </span>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onAnalyze}
          disabled={analyzing}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lift transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {analyzing && (
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              aria-hidden="true"
            />
          )}
          {analyzing ? "Analyzing…" : "Analyze Interface"}
        </button>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onReplace}
            disabled={analyzing}
            className="rounded-xl border border-ink-300 bg-white px-4 py-3 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50 disabled:opacity-60"
          >
            Replace
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={analyzing}
            className="rounded-xl border border-ink-300 bg-white px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
