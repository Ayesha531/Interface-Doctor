import { NextRequest, NextResponse } from "next/server";
import { AiRequestError, getAiConfig, runVisionDiagnosis } from "@/lib/ai";
import type { AiStatusResponse, AnalyzeResult } from "@/lib/types";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // matches client-side limit
const ALLOWED_MIME = new Set(["image/png", "image/jpeg"]);

/** GET /api/analyze — report whether a vision AI provider is configured. */
export async function GET(): Promise<NextResponse<AiStatusResponse>> {
  const config = getAiConfig();
  return NextResponse.json({
    configured: config.configured,
    provider: config.provider,
    model: config.model,
    missing: config.missing,
  });
}

/** POST /api/analyze — validate the screenshot and run (or honestly skip) AI diagnosis. */
export async function POST(req: NextRequest): Promise<NextResponse<AnalyzeResult>> {
  let body: { image?: unknown; mimeType?: unknown; fileName?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { status: "error", message: "The request body was not valid JSON." },
      { status: 400 },
    );
  }

  const { image, mimeType } = body;

  if (typeof mimeType !== "string" || !ALLOWED_MIME.has(mimeType)) {
    return NextResponse.json(
      { status: "error", message: "Only PNG or JPG screenshots can be analyzed." },
      { status: 400 },
    );
  }
  if (typeof image !== "string" || !image.startsWith(`data:${mimeType};base64,`)) {
    return NextResponse.json(
      { status: "error", message: "The screenshot data is missing or malformed." },
      { status: 400 },
    );
  }
  // base64 inflates size by ~4/3
  const approxBytes = Math.ceil((image.length * 3) / 4);
  if (approxBytes > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { status: "error", message: "The screenshot exceeds the 10 MB limit." },
      { status: 413 },
    );
  }

  const config = getAiConfig();
  if (!config.configured) {
    return NextResponse.json(
      {
        status: "ai_unconfigured",
        message:
          "Your screenshot is ready, but AI diagnosis is not configured yet. " +
          "Add an OPENAI_API_KEY in the workspace Secrets panel and retry — " +
          "no findings are shown because none were generated.",
        missing: config.missing,
      },
      { status: 200 },
    );
  }

  try {
    const findings = await runVisionDiagnosis(image, config);
    return NextResponse.json({
      status: "ok",
      findings,
      provider: config.provider,
      model: config.model,
    });
  } catch (error) {
    if (error instanceof AiRequestError) {
      const status = error.kind === "rate_limited" ? 429 : 502;
      return NextResponse.json({ status: "error", message: error.message }, { status });
    }
    return NextResponse.json(
      { status: "error", message: "AI analysis failed unexpectedly. Please try again." },
      { status: 500 },
    );
  }
}
