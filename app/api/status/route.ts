import { NextResponse } from "next/server";
import { getAiRuntimeStatus } from "@/lib/ai";
import { checkOllamaModelAvailability, getOllamaBaseUrl } from "@/lib/ollama";
import type { AiStatusResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/status — safe server-side AI configuration diagnostics.
 *
 * Returns whether the chosen provider is supported and configured. For Ollama,
 * it also checks connectivity and model availability so the badge does not
 * claim the engine is ready when the service or model is missing.
 * Secret values are never exposed.
 */
export async function GET(): Promise<NextResponse<AiStatusResponse>> {
  const status = getAiRuntimeStatus();

  if (status.provider === "ollama") {
    const baseUrl = getOllamaBaseUrl();
    const availability = await checkOllamaModelAvailability(
      baseUrl,
      status.model,
    ).catch((err) => ({
      available: false,
      error: err instanceof Error ? err.message : String(err),
    }));

    const diagnostics: AiStatusResponse["diagnostics"] = {
      ...status.diagnostics,
      ollamaBaseUrl: baseUrl,
      ollamaReachable: availability.available,
      modelInstalled: availability.available,
      modelName: availability.modelName,
      modelError: availability.error,
    };

    if (!availability.available) {
      const isConnection =
        availability.error?.toLowerCase().includes("could not reach") ?? false;

      return NextResponse.json(
        {
          ...status,
          status: isConnection ? "ollama_unreachable" : "model_missing",
          message: availability.error,
          diagnostics,
        },
        {
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        },
      );
    }

    return NextResponse.json(
      { ...status, diagnostics },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }

  return NextResponse.json(status, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
