/**
 * Recent projects stored in localStorage.
 *
 * Phase 1 has no database, so "recent projects" are kept client-side and reset
 * if the browser storage is cleared. A later phase will move this to a real
 * database.
 */

export interface RecentProject {
  id: string;
  name: string;
  createdAt: string; // ISO date
  /** Small data-URL thumbnail (downscaled via canvas). */
  thumbnail: string;
  width: number;
  height: number;
  source: "upload" | "sample";
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
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota exceeded or storage unavailable — keep the in-memory list only.
  }
  return next;
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

function isRecentProject(value: unknown): value is RecentProject {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    typeof p.createdAt === "string" &&
    typeof p.thumbnail === "string" &&
    (p.source === "upload" || p.source === "sample")
  );
}
