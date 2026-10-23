import { NextRequest, NextResponse } from "next/server";
import { checkDbHealth } from "@/lib/db";
import { getClientToken } from "@/lib/cookieToken";
import { createProject, listProjects } from "@/lib/projectsDb";
import type { ScreenshotSelection } from "@/lib/types";

export const runtime = "nodejs";

export interface ProjectListResponse {
  projects: ProjectSummary[];
  storage: "database" | "local_storage";
}

export interface ProjectSummary {
  id: string;
  name: string;
  source: "upload" | "sample";
  thumbnail: string;
  width: number;
  height: number;
  createdAt: string;
  updatedAt?: string;
  storage: "database";
}

/** GET /api/projects — list recent projects for the current browser. */
export async function GET(): Promise<NextResponse<ProjectListResponse>> {
  const { token } = await getClientToken();
  const health = await checkDbHealth();

  if (!health.available) {
    return NextResponse.json(
      { projects: [], storage: "local_storage" },
      { status: 503 },
    );
  }

  const rows = await listProjects(token, 20);
  const projects: ProjectSummary[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    source: row.source,
    thumbnail: row.thumbnail ?? row.screenshot.dataUrl,
    width: row.width,
    height: row.height,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    storage: "database",
  }));

  return NextResponse.json({ projects, storage: "database" });
}

/** POST /api/projects — persist a new project. */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const { token } = await getClientToken();
  const health = await checkDbHealth();

  if (!health.available) {
    return NextResponse.json(
      { error: "Database unavailable", storage: "local_storage" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const screenshot = parseScreenshot(body);
  if (!screenshot) {
    return NextResponse.json(
      { error: "Missing or invalid screenshot" },
      { status: 400 },
    );
  }

  const approxBytes = Math.ceil((screenshot.dataUrl.length * 3) / 4);
  if (approxBytes > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Screenshot exceeds the 10 MB limit" },
      { status: 413 },
    );
  }

  const name = parseName(body, screenshot.name);
  const thumbnail = parseThumbnail(body, screenshot.dataUrl);
  const source = screenshot.source;

  const project = await createProject({
    clientToken: token,
    name,
    source,
    screenshot,
    thumbnail,
  });

  if (!project) {
    return NextResponse.json(
      { error: "Failed to create project", storage: "local_storage" },
      { status: 500 },
    );
  }

  const summary: ProjectSummary = {
    id: project.id,
    name: project.name,
    source: project.source,
    thumbnail: project.thumbnail ?? project.screenshot.dataUrl,
    width: project.width,
    height: project.height,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    storage: "database",
  };

  return NextResponse.json({ project: summary, storage: "database" });
}

function parseScreenshot(body: unknown): ScreenshotSelection | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  const s = b.screenshot;
  if (typeof s !== "object" || s === null) return null;
  const shot = s as Record<string, unknown>;

  const dataUrl = shot.dataUrl;
  const previewUrl = shot.previewUrl ?? dataUrl;
  const mimeType = shot.mimeType;
  const name = shot.name;
  const width = shot.width;
  const height = shot.height;
  const sizeBytes = shot.sizeBytes;
  const source = shot.source;

  if (
    typeof dataUrl !== "string" ||
    typeof mimeType !== "string" ||
    typeof name !== "string" ||
    typeof width !== "number" ||
    typeof height !== "number" ||
    typeof sizeBytes !== "number" ||
    (source !== "upload" && source !== "sample")
  ) {
    return null;
  }

  return {
    previewUrl: typeof previewUrl === "string" ? previewUrl : dataUrl,
    dataUrl,
    name,
    mimeType,
    width,
    height,
    sizeBytes,
    source,
  };
}

function parseName(body: Record<string, unknown>, fallback: string): string {
  if (typeof body.name === "string" && body.name.trim().length > 0) {
    return body.name.trim().slice(0, 200);
  }
  return fallback.slice(0, 200);
}

function parseThumbnail(body: Record<string, unknown>, fallback: string): string {
  if (typeof body.thumbnail === "string" && body.thumbnail.startsWith("data:")) {
    return body.thumbnail;
  }
  return fallback;
}
