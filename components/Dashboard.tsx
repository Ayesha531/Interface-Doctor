"use client";

import { useCallback, useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { Sidebar } from "@/components/Sidebar";
import { AiStatusBadge } from "@/components/AiStatusBadge";
import { UploadDropzone } from "@/components/UploadDropzone";
import { ScreenshotPreview } from "@/components/ScreenshotPreview";
import { AnalysisResultPanel } from "@/components/AnalysisResultPanel";
import { RecentProjects } from "@/components/RecentProjects";
import { fileToSelection, loadSampleSelection, makeThumbnail } from "@/lib/imageUtils";
import {
  addRecentProject,
  loadRecentProjects,
  removeRecentProject,
  type RecentProject,
} from "@/lib/recentProjects";
import type { AiStatusResponse, AnalyzeResult, ScreenshotSelection } from "@/lib/types";

export function Dashboard() {
  const [selection, setSelection] = useState<ScreenshotSelection | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatusResponse | null>(null);
  const [projects, setProjects] = useState<RecentProject[]>([]);

  useEffect(() => {
    setProjects(loadRecentProjects());
    fetch("/api/analyze")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: AiStatusResponse | null) => setAiStatus(data))
      .catch(() => setAiStatus(null));
  }, []);

  const registerProject = useCallback(async (sel: ScreenshotSelection) => {
    const thumbnail = await makeThumbnail(sel.previewUrl).catch(() => sel.previewUrl);
    setProjects(
      addRecentProject({
        name: sel.name,
        thumbnail,
        width: sel.width,
        height: sel.height,
        source: sel.source,
      }),
    );
  }, []);

  const acceptSelection = useCallback(
    (sel: ScreenshotSelection) => {
      setSelection(sel);
      setResult(null);
      setUploadError(null);
      void registerProject(sel);
    },
    [registerProject],
  );

  const handleFile = useCallback(
    (file: File) => {
      setUploadError(null);
      fileToSelection(file)
        .then(acceptSelection)
        .catch((err: Error) => setUploadError(err.message));
    },
    [acceptSelection],
  );

  const handleSample = useCallback(() => {
    setSampleLoading(true);
    setUploadError(null);
    loadSampleSelection()
      .then(acceptSelection)
      .catch((err: Error) => setUploadError(err.message))
      .finally(() => setSampleLoading(false));
  }, [acceptSelection]);

  const handleAnalyze = useCallback(async () => {
    if (!selection || analyzing) return;
    setAnalyzing(true);
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: selection.dataUrl,
          mimeType: selection.mimeType,
          fileName: selection.name,
        }),
      });
      const data = (await res.json()) as AnalyzeResult;
      setResult(data);
    } catch {
      setResult({
        status: "error",
        message: "The analysis request could not be sent. Check your connection and try again.",
      });
    } finally {
      setAnalyzing(false);
    }
  }, [selection, analyzing]);

  const clearSelection = useCallback(() => {
    setSelection(null);
    setResult(null);
    setUploadError(null);
  }, []);

  return (
    <div id="top" className="min-h-screen">
      <Sidebar aiStatus={aiStatus} />

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-ink-800 bg-ink-900 px-4 py-3 lg:hidden">
        <Logo compact={false} />
      </header>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-10">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl text-balance">
                Diagnose your interface
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-500 sm:text-base">
                Upload a screenshot of your website or app. Interface Doctor AI reviews the
                visual design and reports concrete problems with suggested fixes — no invented
                results, ever.
              </p>
            </div>
            <div className="hidden rounded-xl border border-ink-200 bg-white px-4 py-3 shadow-card sm:block lg:hidden">
              <AiStatusBadge status={aiStatus} />
            </div>
          </div>

          {/* Upload card */}
          <section id="upload" aria-labelledby="upload-heading" className="mt-8 scroll-mt-6 rounded-2xl border border-ink-200 bg-white p-5 shadow-card sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="upload-heading" className="text-lg font-semibold tracking-tight text-ink-900">
                {selection ? "Your screenshot" : "New diagnosis"}
              </h2>
              {!selection && (
                <button
                  type="button"
                  onClick={handleSample}
                  disabled={sampleLoading}
                  className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-100 disabled:opacity-60"
                >
                  {sampleLoading && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-300 border-t-brand-600" aria-hidden="true" />
                  )}
                  {sampleLoading ? "Loading sample…" : "Use a sample screenshot"}
                </button>
              )}
            </div>

            <div className="mt-5">
              {selection ? (
                <ScreenshotPreview
                  selection={selection}
                  analyzing={analyzing}
                  onAnalyze={() => void handleAnalyze()}
                  onRemove={clearSelection}
                  onReplace={clearSelection}
                />
              ) : (
                <UploadDropzone
                  onFileAccepted={handleFile}
                  onValidationError={setUploadError}
                  disabled={sampleLoading}
                />
              )}
            </div>

            {uploadError && (
              <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {uploadError}
              </p>
            )}

            <AnalysisResultPanel loading={analyzing} result={result} />
          </section>

          {/* How it works */}
          <section aria-labelledby="how-heading" className="mt-10">
            <h2 id="how-heading" className="text-lg font-semibold tracking-tight text-ink-900">
              How it works
            </h2>
            <ol className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { step: "1", title: "Upload", text: "Drop in a PNG or JPG screenshot of any website or app screen." },
                { step: "2", title: "Diagnose", text: "A vision AI model reviews hierarchy, spacing, contrast, typography and layout." },
                { step: "3", title: "Improve", text: "Get prioritized findings with explanations and concrete suggested fixes." },
              ].map((item) => (
                <li key={item.step} className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700">
                    {item.step}
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-ink-900">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-500">{item.text}</p>
                </li>
              ))}
            </ol>
          </section>

          <RecentProjects
            projects={projects}
            onRemove={(id) => setProjects(removeRecentProject(id))}
          />
        </div>
      </main>
    </div>
  );
}
