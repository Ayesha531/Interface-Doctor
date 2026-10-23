/**
 * Unified project persistence client.
 *
 * The application first tries to save projects to the server-side Postgres
 * database (via /api/projects). If the database is unavailable, it falls back
 * to browser localStorage. The storage mode is reported by the server on the
 * first list/create call and cached in memory.
 */

import {
  addRecentProject as addLocalRecentProject,
  loadRecentProjects as loadLocalRecentProjects,
  removeRecentProject as removeLocalRecentProject,
  updateRecentProject as updateLocalRecentProject,
  type RecentProject as LocalRecentProject,
} from "@/lib/recentProjects";
import type {
  AnalyzeResult,
  RedesignResult,
  ScreenshotSelection,
} from "@/lib/types";

export type StorageMode = "database" | "local_storage";

export interface Project {
  id: string;
  name: string;
  source: "upload" | "sample";
  thumbnail: string;
  width: number;
  height: number;
  createdAt: string;
  updatedAt?: string;
  storage: StorageMode;
  screenshot?: ScreenshotSelection;
  findings?: AnalyzeResult | null;
  redesign?: RedesignResult | null;
}

interface ServerProjectList {
  projects: Project[];
  storage: StorageMode;
}

let cachedStorage: StorageMode | null = null;

export async function getStorageMode(): Promise<StorageMode> {
  if (cachedStorage) return cachedStorage;
  await listProjects();
  return cachedStorage ?? "local_storage";
}

export async function listProjects(): Promise<Project[]> {
  try {
    const res = await fetch("/api/projects", {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as ServerProjectList;
    cachedStorage = data.storage;
    return data.projects;
  } catch {
    cachedStorage = "local_storage";
    return loadLocalRecentProjects().map(localToProject);
  }
}

export async function createProject(
  selection: ScreenshotSelection,
  thumbnail: string,
): Promise<Project> {
  try {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: selection.name,
        source: selection.source,
        screenshot: selection,
        thumbnail,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { project: Project; storage: StorageMode };
    cachedStorage = data.storage;
    return data.project;
  } catch {
    cachedStorage = "local_storage";
    const local = addLocalRecentProject({
      name: selection.name,
      thumbnail,
      dataUrl: selection.dataUrl,
      mimeType: selection.mimeType,
      width: selection.width,
      height: selection.height,
      source: selection.source,
    });
    const latest = local[0];
    return localToProject(latest);
  }
}

export async function updateProject(
  id: string,
  updates: {
    findings?: AnalyzeResult | null;
    redesign?: RedesignResult | null;
    thumbnail?: string;
  },
): Promise<Project | null> {
  const mode = await getStorageMode();
  if (mode === "local_storage") {
    const updated = updateLocalRecentProject(id, {
      findings: updates.findings,
      redesign: updates.redesign,
    });
    return updated ? localToProject(updated) : null;
  }

  try {
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { project: Project };
    return data.project;
  } catch {
    return null;
  }
}

export async function loadProject(id: string): Promise<Project | null> {
  const mode = await getStorageMode();
  if (mode === "local_storage") {
    const local = loadLocalRecentProjects().find((p) => p.id === id);
    return local ? localToProject(local) : null;
  }

  try {
    const res = await fetch(`/api/projects/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { project: Project };
    return data.project;
  } catch {
    return null;
  }
}

export async function deleteProject(id: string, storage: StorageMode): Promise<void> {
  if (storage === "local_storage") {
    removeLocalRecentProject(id);
    return;
  }

  try {
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch {
    // ignore
  }
}

function localToProject(local: LocalRecentProject): Project {
  const project: Project = {
    id: local.id,
    name: local.name,
    source: local.source,
    thumbnail: local.thumbnail,
    width: local.width,
    height: local.height,
    createdAt: local.createdAt,
    storage: "local_storage",
    findings: local.findings,
    redesign: local.redesign,
  };

  if (local.dataUrl && local.mimeType) {
    project.screenshot = {
      previewUrl: local.dataUrl,
      dataUrl: local.dataUrl,
      name: local.name,
      mimeType: local.mimeType,
      width: local.width,
      height: local.height,
      sizeBytes: 0,
      source: local.source,
    };
  }

  return project;
}
