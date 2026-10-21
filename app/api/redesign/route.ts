import { NextRequest, NextResponse } from "next/server";
import { getAiRuntimeStatus } from "@/lib/ai";
import { runRedesignGeneration } from "@/lib/redesign";
import type { AnalysisFinding, RedesignResult } from "@/lib/types";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/png", "image/jpeg"]);

interface RedesignRequestBody {
  image?: unknown;
  mimeType?: unknown;
  findings?: unknown;
  originalWidth?: unknown;
  originalHeight?: unknown;
}

/** POST /api/redesign — validate input and generate a safe responsive redesign. */
export async function POST(req: NextRequest): Promise<NextResponse<RedesignResult>> {
  let body: RedesignRequestBody;
  try {
    body = (await req.json()) as RedesignRequestBody;
  } catch {
    return NextResponse.json(
      { status: "error", message: "The request body was not valid JSON." },
      { status: 400 },
    );
  }

  const { image, mimeType, findings, originalWidth, originalHeight } = body;

  if (typeof mimeType !== "string" || !ALLOWED_MIME.has(mimeType)) {
    return NextResponse.json(
      { status: "error", message: "Only PNG or JPG screenshots can be redesigned." },
      { status: 400 },
    );
  }
  if (typeof image !== "string" || !image.startsWith(`data:${mimeType};base64,`)) {
    return NextResponse.json(
      { status: "error", message: "The screenshot data is missing or malformed." },
      { status: 400 },
    );
  }

  const approxBytes = Math.ceil((image.length * 3) / 4);
  if (approxBytes > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { status: "error", message: "The screenshot exceeds the 10 MB limit." },
      { status: 413 },
    );
  }

  const parsedFindings = parseFindings(findings);
  const width = typeof originalWidth === "number" ? originalWidth : 1200;
  const height = typeof originalHeight === "number" ? originalHeight : 800;

  const runtimeStatus = getAiRuntimeStatus();
  if (!runtimeStatus.configured) {
    return NextResponse.json(
      {
        status: "ai_unconfigured",
        message:
          "Redesign generation cannot run: " +
          runtimeStatus.message +
          " No redesign was generated.",
        missing: runtimeStatus.missing,
      },
      { status: 200 },
    );
  }

  try {
    const redesign = await runRedesignGeneration({
      imageDataUrl: image,
      findings: parsedFindings,
      originalWidth: width,
      originalHeight: height,
    });
    return NextResponse.json({
      status: "ok",
      redesign,
      provider: runtimeStatus.provider,
      model: runtimeStatus.model,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Redesign generation failed.";
    return NextResponse.json({ status: "error", message }, { status: 502 });
  }
}

function parseFindings(value: unknown): AnalysisFinding[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is AnalysisFinding => {
    if (typeof item !== "object" || item === null) return false;
    const f = item as Record<string, unknown>;
    return typeof f.id === "string" && typeof f.title === "string";
  });
}
