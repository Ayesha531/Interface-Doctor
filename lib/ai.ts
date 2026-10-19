/**
 * Server-side AI provider configuration and vision diagnosis call.
 *
 * Phase 1 scope: honestly report configuration status and, when credentials
 * exist, perform a genuine OpenAI vision request with validated output.
 * The provider is selected via AI_PROVIDER so alternatives can be added
 * without touching client code.
 */

import type { AnalysisFinding, Severity } from "@/lib/types";

export interface AiConfig {
  configured: boolean;
  provider: string;
  model: string;
  missing: string[];
  apiKey?: string;
}

export function getAiConfig(): AiConfig {
  const provider = (process.env.AI_PROVIDER || "openai").trim() || "openai";
  const model = (process.env.AI_VISION_MODEL || "gpt-4o-mini").trim() || "gpt-4o-mini";
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  return {
    configured: provider === "openai" ? Boolean(apiKey) : false,
    provider,
    model,
    missing: apiKey ? [] : ["OPENAI_API_KEY"],
    apiKey,
  };
}

export class AiRequestError extends Error {
  constructor(
    message: string,
    readonly kind: "rate_limited" | "provider_error" | "invalid_response" | "network",
  ) {
    super(message);
    this.name = "AiRequestError";
  }
}

const SYSTEM_PROMPT = [
  "You are Interface Doctor AI, a UI/UX design reviewer.",
  "Examine the provided website or app screenshot and identify concrete interface problems.",
  "Respond with ONLY a JSON object of the shape:",
  '{"findings":[{"title":string,"severity":"low"|"medium"|"high","explanation":string,"suggestion":string,',
  '"region":{"x":number,"y":number,"width":number,"height":number}}]}.',
  "Region values are fractions (0-1) of image width/height locating the problem area.",
  "Report at most 6 findings, ordered by severity. Only report issues visible in the screenshot.",
].join(" ");

export async function runVisionDiagnosis(
  imageDataUrl: string,
  config: AiConfig,
): Promise<AnalysisFinding[]> {
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 1500,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Diagnose the interface problems in this screenshot." },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
      }),
    });
  } catch {
    throw new AiRequestError(
      "Could not reach the AI provider. Check the network connection and try again.",
      "network",
    );
  }

  if (response.status === 429) {
    throw new AiRequestError(
      "The AI provider rate limit was reached. Wait a moment and try again.",
      "rate_limited",
    );
  }
  if (!response.ok) {
    throw new AiRequestError(
      `The AI provider returned an error (HTTP ${response.status}).`,
      "provider_error",
    );
  }

  let content: string | undefined;
  try {
    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    content = payload.choices?.[0]?.message?.content;
  } catch {
    throw new AiRequestError("The AI provider returned an unreadable response.", "invalid_response");
  }
  if (!content) {
    throw new AiRequestError("The AI provider returned an empty response.", "invalid_response");
  }

  return parseFindings(content);
}

const VALID_SEVERITIES: readonly Severity[] = ["low", "medium", "high"];

function parseFindings(content: string): AnalysisFinding[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new AiRequestError("The AI response was not valid JSON.", "invalid_response");
  }

  const raw = (parsed as { findings?: unknown })?.findings;
  if (!Array.isArray(raw)) {
    throw new AiRequestError("The AI response did not contain a findings list.", "invalid_response");
  }

  const findings: AnalysisFinding[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const f = item as Record<string, unknown>;
    if (typeof f.title !== "string" || typeof f.explanation !== "string") continue;

    findings.push({
      id: crypto.randomUUID(),
      title: f.title,
      severity: VALID_SEVERITIES.includes(f.severity as Severity)
        ? (f.severity as Severity)
        : "medium",
      explanation: f.explanation,
      suggestion: typeof f.suggestion === "string" ? f.suggestion : "",
      region: parseRegion(f.region),
    });
  }

  if (findings.length === 0) {
    throw new AiRequestError("The AI response contained no usable findings.", "invalid_response");
  }
  return findings;
}

function parseRegion(value: unknown): AnalysisFinding["region"] {
  if (typeof value !== "object" || value === null) return undefined;
  const r = value as Record<string, unknown>;
  const nums = [r.x, r.y, r.width, r.height];
  if (!nums.every((n) => typeof n === "number" && Number.isFinite(n))) return undefined;
  const [x, y, width, height] = nums as number[];
  const inRange = [x, y].every((n) => n >= 0 && n <= 1) && width > 0 && height > 0;
  return inRange ? { x, y, width, height } : undefined;
}
