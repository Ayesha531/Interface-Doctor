"use client";

import { useCallback, useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { Sidebar } from "@/components/Sidebar";
import { AiStatusBadge } from "@/components/AiStatusBadge";
import { UploadDropzone } from "@/components/UploadDropzone";
import { ScreenshotPreview } from "@/components/ScreenshotPreview";
import { AnalysisResultPanel } from "@/components/AnalysisResultPanel";
import { RedesignPanel } from "@/components/RedesignPanel";
import { RecentProjects } from "@/components/RecentProjects";
import { fileToSelection, loadSampleSelection, makeThumbnail } from "@/lib/imageUtils";
import {
  createProject,
  deleteProject,
  listProjects,
  loadProject,
  updateProject,
  type Project,
  type StorageMode,
} from "@/lib/projects";
import type {
  AiStatusResponse,
  AnalysisFinding,
  AnalyzeResult,
  RedesignResult,
  ScreenshotSelection,
} from "@/lib/types";

export function Dashboard() {
  const [selection, setSelection] = useState<ScreenshotSelection | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [activeFindingId, setActiveFindingId] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatusResponse | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsStorage, setProjectsStorage] = useState<StorageMode | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [redesignResult, setRedesignResult] = useState<RedesignResult | null>(null);
  const [generatingRedesign, setGeneratingRedesign] = useState(false);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: AiStatusResponse | null) => setAiStatus(data))
      .catch(() => setAiStatus(null));

    setProjectsLoading(true);
    listProjects()
      .then((loaded) => {
        setProjects(loaded);
        setProjectsStorage(loaded[0]?.storage ?? "local_storage");
      })
      .catch(() => {
        setProjects([]);
        setProjectsStorage("local_storage");
      })
      .finally(() => setProjectsLoading(false));
  }, []);

  const registerProject = useCallback(async (sel: ScreenshotSelection) => {
    const thumbnail = await makeThumbnail(sel.previewUrl).catch(() => sel.previewUrl);
    try {
      const project = await createProject(sel, thumbnail);
      setProjects((prev) => [project, ...prev].slice(0, 20));
      setActiveProjectId(project.id);
      setProjectsStorage(project.storage);
    } catch {
      // createProject already falls back to localStorage internally.
    }
  }, []);

  const acceptSelection = useCallback(
    (sel: ScreenshotSelection) => {
      setSelection(sel);
      setResult(null);
      setActiveFindingId(null);
      setRedesignResult(null);
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
      if (data.status === "ok" && data.findings.length > 0) {
        const firstWithRegion = data.findings.find((f: AnalysisFinding) => f.region);
        setActiveFindingId(firstWithRegion?.id ?? data.findings[0].id);
      } else {
        setActiveFindingId(null);
      }
      if (activeProjectId) {
        void updateProject(activeProjectId, { findings: data }).then((updated) => {
          if (updated) {
            setProjects((prev) =>
              prev.map((p) => (p.id === updated.id ? updated : p)),
            );
          }
        });
      }
    } catch {
      setResult({
        status: "error",
        message: "The analysis request could not be sent. Check your connection and try again.",
      });
    } finally {
      setAnalyzing(false);
    }
  }, [selection, analyzing]);

  const handleGenerateRedesign = useCallback(async () => {
    if (!selection || generatingRedesign) return;
    setGeneratingRedesign(true);
    setRedesignResult(null);
    try {
      const res = await fetch("/api/redesign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: selection.dataUrl,
          mimeType: selection.mimeType,
          findings: result?.status === "ok" ? result.findings : [],
          originalWidth: selection.width,
          originalHeight: selection.height,
        }),
      });
      const data = (await res.json()) as RedesignResult;
      setRedesignResult(data);
      if (activeProjectId) {
        void updateProject(activeProjectId, { redesign: data }).then((updated) => {
          if (updated) {
            setProjects((prev) =>
              prev.map((p) => (p.id === updated.id ? updated : p)),
            );
          }
        });
      }
    } catch {
      setRedesignResult({
        status: "error",
        message: "The redesign request could not be sent. Check your connection and try again.",
      });
    } finally {
      setGeneratingRedesign(false);
    }
  }, [selection, generatingRedesign, result]);

  const handleResetRedesign = useCallback(() => {
    setRedesignResult(null);
  }, []);

  const handleLoadProject = useCallback(async (project: Project) => {
    if (project.screenshot) {
      setSelection(project.screenshot);
      setResult(project.findings ?? null);
      setRedesignResult(project.redesign ?? null);
      setActiveProjectId(project.id);
      setActiveFindingId(null);
      setUploadError(null);
      return;
    }

    const loaded = await loadProject(project.id);
    if (loaded?.screenshot) {
      setSelection(loaded.screenshot);
      setResult(loaded.findings ?? null);
      setRedesignResult(loaded.redesign ?? null);
      setActiveProjectId(loaded.id);
      setActiveFindingId(null);
      setUploadError(null);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelection(null);
    setResult(null);
    setActiveFindingId(null);
    setRedesignResult(null);
    setUploadError(null);
    setActiveProjectId(null);
  }, []);

  const handleRemoveProject = useCallback(
    async (id: string, storage: StorageMode) => {
      await deleteProject(id, storage);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (activeProjectId === id) {
        clearSelection();
      }
    },
    [activeProjectId, clearSelection],
  );

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
                visual design, reports concrete problems, and generates a safe responsive
                redesign you can compare side-by-side — no invented results, ever.
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
                  findings={result?.status === "ok" ? result.findings : []}
                  activeFindingId={activeFindingId}
                  onActivateFinding={setActiveFindingId}
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

            <AnalysisResultPanel
              loading={analyzing}
              result={result}
              activeFindingId={activeFindingId}
              onActivateFinding={setActiveFindingId}
            />

            {selection && (
              <RedesignPanel
                selection={selection}
                redesignResult={redesignResult}
                generating={generatingRedesign}
                onGenerate={() => void handleGenerateRedesign()}
                onReset={handleResetRedesign}
              />
            )}
          </section>

          {/* How it works */}
          <section aria-labelledby="how-heading" className="mt-10">
            <h2 id="how-heading" className="text-lg font-semibold tracking-tight text-ink-900">
              How it works
            </h2>
            <ol className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { step: "1", title: "Upload", text: "Drop in a PNG or JPG screenshot of any website or app screen." },
                { step: "2", title: "Diagnose", text: "A vision AI model reviews hierarchy, spacing, contrast, typography and layout." },
                { step: "3", title: "Redesign", text: "Generate a safe, responsive webpage preview that addresses the diagnosed issues." },
                { step: "4", title: "Compare", text: "Use the interactive before-and-after slider to see the improvements." },
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
            storage={projectsStorage}
            loading={projectsLoading}
            onLoad={handleLoadProject}
            onRemove={handleRemoveProject}
          />
        </div>
      </main>
    </div>
  );
}
