import { NextRequest, NextResponse } from "next/server";
import { checkDbHealth } from "@/lib/db";
import { getClientToken } from "@/lib/cookieToken";
import { deleteProject, getProject, updateProject } from "@/lib/projectsDb";
import type { AnalyzeResult, RedesignResult } from "@/lib/types";

export const runtime = "nodejs";

/** GET /api/projects/[id] — load a single project for the current browser. */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const { token } = await getClientToken();
  const health = await checkDbHealth();

  if (!health.available) {
    return NextResponse.json(
      { error: "Database unavailable", storage: "local_storage" },
      { status: 503 },
    );
  }

  const project = await getProject(params.id, token);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      source: project.source,
      thumbnail: project.thumbnail ?? project.screenshot.dataUrl,
      width: project.width,
      height: project.height,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      storage: "database",
      screenshot: project.screenshot,
      findings: project.findings,
      redesign: project.redesign,
    },
  });
}

/** PATCH /api/projects/[id] — update findings or redesign. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const { token } = await getClientToken();
  const health = await checkDbHealth();

  if (!health.available) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const updates: {
    findings?: AnalyzeResult | null;
    redesign?: RedesignResult | null;
    thumbnail?: string;
  } = {};

  if ("findings" in b) {
    updates.findings = b.findings as AnalyzeResult | null;
  }
  if ("redesign" in b) {
    updates.redesign = b.redesign as RedesignResult | null;
  }
  if (typeof b.thumbnail === "string") {
    updates.thumbnail = b.thumbnail;
  }

  const project = await updateProject(params.id, token, updates);
  if (!project) {
    return NextResponse.json({ error: "Not found or update failed" }, { status: 404 });
  }

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      source: project.source,
      thumbnail: project.thumbnail ?? project.screenshot.dataUrl,
      width: project.width,
      height: project.height,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      storage: "database",
      screenshot: project.screenshot,
      findings: project.findings,
      redesign: project.redesign,
    },
  });
}

/** DELETE /api/projects/[id] — remove a project. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const { token } = await getClientToken();
  const health = await checkDbHealth();

  if (!health.available) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const ok = await deleteProject(params.id, token);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
