import { NextResponse } from "next/server";
import { getAiRuntimeStatus } from "@/lib/ai";
import type { AiStatusResponse } from "@/lib/types";

export const runtime = "nodejs";

/**
 * GET /api/status — safe server-side AI configuration diagnostics.
 *
 * Returns whether OPENAI_API_KEY is present in the server process environment,
 * whether the chosen provider is supported, and a human-readable message.
 * The secret value is never exposed.
 */
export function GET(): NextResponse<AiStatusResponse> {
  const status = getAiRuntimeStatus();
  return NextResponse.json(status, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
