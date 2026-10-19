"use client";

import type { RecentProject } from "@/lib/recentProjects";

interface RecentProjectsProps {
  projects: RecentProject[];
  onRemove: (id: string) => void;
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

export function RecentProjects({ projects, onRemove }: RecentProjectsProps) {
  return (
    <section id="recent" aria-labelledby="recent-heading" className="mt-10 scroll-mt-6">
      <div className="flex items-baseline justify-between">
        <h2 id="recent-heading" className="text-lg font-semibold tracking-tight text-ink-900">
          Recent projects
        </h2>
        <span className="text-xs text-ink-400">Stored in this browser</span>
      </div>

      {projects.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-ink-300 bg-white/60 px-6 py-10 text-center">
          <p className="text-sm font-medium text-ink-600">No recent projects yet</p>
          <p className="mt-1 text-sm text-ink-400">
            Upload a screenshot or load the sample to start your first diagnosis.
          </p>
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <li
              key={project.id}
              className="group overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card transition-shadow hover:shadow-lift"
            >
              <div className="aspect-[16/9] overflow-hidden bg-ink-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={project.thumbnail}
                  alt={`Thumbnail of ${project.name}`}
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <div className="flex items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-800" title={project.name}>
                    {project.name}
                  </p>
                  <p className="text-xs text-ink-400">
                    {formatDate(project.createdAt)}
                    {project.source === "sample" ? " · sample" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(project.id)}
                  aria-label={`Remove ${project.name} from recent projects`}
                  className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                    <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" strokeLinecap="round" strokeLinejoin="round" />
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
