/**
 * Server-side AI provider configuration and vision diagnosis call.
 *
 * Phase 2 scope: a stronger structured prompt that asks for category,
 * confidence, and screenshot regions; validated parsing; and findings sorted
 * by severity. The provider is selected via AI_PROVIDER so alternatives can
 * be added without touching client code.
 */

import {
  CATEGORY_LABELS,
  FINDING_CATEGORIES,
  type AnalysisFinding,
  type FindingCategory,
  type Severity,
} from "@/lib/types";

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

const CATEGORY_PROMPT_LIST = FINDING_CATEGORIES.map(
  (c) => `"${c}" — ${CATEGORY_LABELS[c]}`,
).join("; ");

const SYSTEM_PROMPT = [
  "You are Interface Doctor AI, a UI/UX design reviewer.",
  "Examine the provided website or app screenshot and identify concrete, visible interface problems.",
  "Focus on: visual hierarchy, spacing and alignment, typography and readability, color contrast and accessibility,",
  "component consistency, navigation and usability, and any obvious responsive-design concerns inferable from the screenshot.",
  "Respond with ONLY a JSON object of the shape:",
  '{"findings":[{"title":string,"severity":"critical"|"high"|"medium"|"low","category":"visual-hierarchy"|...,"explanation":string,',
  '"suggestion":string,"confidence":number(0-1),"region":{"x":number,"y":number,"width":number,"height":number}}]}.',
  `Available categories: ${CATEGORY_PROMPT_LIST}.`,
  "Region values are fractions (0-1) of image width/height locating the problem area. Width and height must be positive.",
  "Confidence is optional but should be a number between 0 and 1 when provided.",
  "Report at most 6 findings, ordered by severity (critical first, then high, medium, low). Only report issues visible in the screenshot.",
  "Do not invent measurements, accessibility test results, or numerical scores.",
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

const VALID_SEVERITIES: readonly Severity[] = ["critical", "high", "medium", "low"];

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

    const category = parseCategory(f.category);
    const confidence = parseConfidence(f.confidence);
    const region = parseRegion(f.region);

    findings.push({
      id: crypto.randomUUID(),
      title: f.title,
      severity: VALID_SEVERITIES.includes(f.severity as Severity)
        ? (f.severity as Severity)
        : "medium",
      category,
      explanation: f.explanation,
      suggestion: typeof f.suggestion === "string" ? f.suggestion : "",
      confidence,
      region,
    });
  }

  if (findings.length === 0) {
    throw new AiRequestError("The AI response contained no usable findings.", "invalid_response");
  }

  const severityRank: Record<Severity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  return findings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}

function parseCategory(value: unknown): FindingCategory {
  if (typeof value !== "string") return "other";
  return (FINDING_CATEGORIES as readonly string[]).includes(value)
    ? (value as FindingCategory)
    : "other";
}

function parseConfidence(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  if (value < 0 || value > 1) return undefined;
  return value;
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
