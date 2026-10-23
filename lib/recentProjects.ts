/**
 * Recent projects stored in localStorage.
 *
 * When the server-side Postgres database is unavailable, recent projects are
 * kept client-side. Because localStorage quota is small, we store the full
 * screenshot data URL only when it fits; if quota is exceeded we fall back to
 * the downscaled thumbnail and keep only metadata. Findings and redesign are
 * stored when they fit, but are also dropped if they push the entry over quota.
 */

import type { AnalyzeResult, RedesignResult } from "@/lib/types";

export interface RecentProject {
  id: string;
  name: string;
  createdAt: string; // ISO date
  /** Small data-URL thumbnail (downscaled via canvas). */
  thumbnail: string;
  /** Full screenshot data URL, stored only when it fits in localStorage. */
  dataUrl?: string;
  mimeType?: string;
  width: number;
  height: number;
  source: "upload" | "sample";
  /** AI diagnosis result, stored when it fits. */
  findings?: AnalyzeResult;
  /** AI redesign result, stored when it fits. */
  redesign?: RedesignResult;
}

const STORAGE_KEY = "interface-doctor-ai.recent-projects.v1";
const MAX_PROJECTS = 6;

export function loadRecentProjects(): RecentProject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecentProject);
  } catch {
    return [];
  }
}

export function addRecentProject(
  project: Omit<RecentProject, "id" | "createdAt">,
): RecentProject[] {
  const entry: RecentProject = {
    ...project,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const next = [entry, ...loadRecentProjects()].slice(0, MAX_PROJECTS);
  tryStore(next);
  return next;
}

export function updateRecentProject(
  id: string,
  updates: {
    findings?: AnalyzeResult | null;
    redesign?: RedesignResult | null;
  },
): RecentProject | null {
  const all = loadRecentProjects();
  const index = all.findIndex((p) => p.id === id);
  if (index === -1) return null;

  const next = [...all];
  next[index] = {
    ...next[index],
    findings: updates.findings === null ? undefined : updates.findings ?? next[index].findings,
    redesign: updates.redesign === null ? undefined : updates.redesign ?? next[index].redesign,
  };

  tryStore(next);
  return next[index];
}

export function removeRecentProject(id: string): RecentProject[] {
  const next = loadRecentProjects().filter((p) => p.id !== id);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

function tryStore(projects: RecentProject[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return;
  } catch {
    // Quota exceeded or storage unavailable — progressively trim.
  }

  // First try without the heavy dataUrl on all entries.
  const withoutDataUrl = projects.map(({ dataUrl: _dataUrl, ...rest }) => rest);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(withoutDataUrl));
    return;
  } catch {
    // Still too large — drop findings and redesign as well.
  }

  const minimal = projects.map(({ dataUrl: _dataUrl, findings: _findings, redesign: _redesign, ...rest }) => rest);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
  } catch {
    // Still cannot store; keep the in-memory list only.
  }
}

function isRecentProject(value: unknown): value is RecentProject {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    typeof p.createdAt === "string" &&
    typeof p.thumbnail === "string" &&
    (p.dataUrl === undefined || typeof p.dataUrl === "string") &&
    (p.mimeType === undefined || typeof p.mimeType === "string") &&
    (p.source === "upload" || p.source === "sample")
  );
}
