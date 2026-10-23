"use client";

import type { Project, StorageMode } from "@/lib/projects";

interface RecentProjectsProps {
  projects: Project[];
  storage: StorageMode | null;
  loading?: boolean;
  onLoad: (project: Project) => void;
  onRemove: (id: string, storage: StorageMode) => void;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function storageLabel(storage: StorageMode | null): string {
  if (storage === "database") return "Saved to server";
  if (storage === "local_storage") return "Stored in this browser";
  return "Checking storage…";
}

function canReload(project: Project): boolean {
  return project.storage === "database" || Boolean(project.screenshot?.dataUrl);
}

export function RecentProjects({
  projects,
  storage,
  loading,
  onLoad,
  onRemove,
}: RecentProjectsProps) {
  return (
    <section
      id="recent"
      aria-labelledby="recent-heading"
      className="mt-10 scroll-mt-6"
    >
      <div className="flex items-baseline justify-between">
        <h2
          id="recent-heading"
          className="text-lg font-semibold tracking-tight text-ink-900"
        >
          Recent projects
        </h2>
        <span className="text-xs text-ink-400">{storageLabel(storage)}</span>
      </div>

      {loading ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card"
            >
              <div className="aspect-[16/9] bg-ink-100" />
              <div className="px-4 py-3">
                <div className="h-4 w-2/3 rounded bg-ink-100" />
                <div className="mt-2 h-3 w-1/3 rounded bg-ink-100" />
              </div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-ink-300 bg-white/60 px-6 py-10 text-center">
          <p className="text-sm font-medium text-ink-600">No recent projects yet</p>
          <p className="mt-1 text-sm text-ink-400">
            Upload a screenshot or load the sample to start your first diagnosis.
          </p>
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const reloadable = canReload(project);
            return (
            <li
              key={project.id}
              className={`group overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card transition-shadow ${reloadable ? "hover:shadow-lift" : ""}`}
            >
              <button
                type="button"
                onClick={() => reloadable && onLoad(project)}
                disabled={!reloadable}
                className={`block w-full text-left ${reloadable ? "" : "cursor-default"}`}
                aria-label={reloadable ? `Open project ${project.name}` : `Project ${project.name} (thumbnail only)`}
              >
                <div className="aspect-[16/9] overflow-hidden bg-ink-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={project.thumbnail}
                    alt={`Thumbnail of ${project.name}`}
                    className={`h-full w-full object-cover object-top ${reloadable ? "transition-transform duration-300 group-hover:scale-[1.02]" : "opacity-80 grayscale"}`}
                  />
                </div>
              </button>
              <div className="flex items-center justify-between gap-2 px-4 py-3">
                <button
                  type="button"
                  onClick={() => reloadable && onLoad(project)}
                  disabled={!reloadable}
                  className={`min-w-0 text-left ${reloadable ? "" : "cursor-default"}`}
                >
                  <p
                    className="truncate text-sm font-medium text-ink-800"
                    title={project.name}
                  >
                    {project.name}
                  </p>
                  <p className="text-xs text-ink-400">
                    {formatDate(project.createdAt)}
                    {project.source === "sample" ? " · sample" : ""}
                    {!reloadable && " · thumbnail only"}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(project.id, project.storage)}
                  aria-label={`Remove ${project.name} from recent projects`}
                  className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
