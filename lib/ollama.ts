/**
 * Shared Ollama helpers for screenshot analysis and redesign generation.
 *
 * These functions run only on the server and never expose environment secrets.
 */

import { extractJsonContent } from "@/lib/jsonExtraction";

export const OLLAMA_DEFAULT_BASE_URL = "http://localhost:11434";
export const OLLAMA_REQUEST_TIMEOUT_MS = 180_000;
export const OLLAMA_HEALTH_TIMEOUT_MS = 8_000;

export function getOllamaBaseUrl(): string {
  return (process.env.OLLAMA_BASE_URL || OLLAMA_DEFAULT_BASE_URL).replace(
    /\/+$/,
    "",
  );
}

export interface OllamaAvailabilityResult {
  available: boolean;
  /** Exact installed model name to use in /api/chat (e.g. "gemma3:latest"). */
  modelName?: string;
  error?: string;
}

interface OllamaTagEntry {
  name: string;
  model?: string;
}

interface OllamaTagsResponse {
  models?: OllamaTagEntry[];
}

/**
 * Check whether the configured Ollama model is installed.
 *
 * Ollama returns a 200 with a list of local models from /api/tags. A model
 * matches if its name equals the configured name or starts with "name:".
 * When a match is found, the exact installed name is returned so callers can
 * use it in subsequent /api/chat requests — some Ollama versions are strict
 * about model aliases and return 500 when the alias cannot be resolved.
 */
export async function checkOllamaModelAvailability(
  baseUrl: string,
  model: string,
): Promise<OllamaAvailabilityResult> {
  let response: Response;

  try {
    response = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(OLLAMA_HEALTH_TIMEOUT_MS),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return {
      available: false,
      error:
        `Could not reach Ollama at ${baseUrl}. ` +
        `Make sure Ollama is running and OLLAMA_BASE_URL is correct. (${detail})`,
    };
  }

  if (!response.ok) {
    return {
      available: false,
      error: `Ollama returned HTTP ${response.status} from /api/tags.`,
    };
  }

  let data: OllamaTagsResponse;
  try {
    data = (await response.json()) as OllamaTagsResponse;
  } catch {
    return {
      available: false,
      error: "Ollama /api/tags returned unreadable JSON.",
    };
  }

  const installed = data.models ?? [];
  const target = model.toLowerCase().trim();

  const installedMatch = installed.find((entry) => {
    const name = (entry.name || entry.model || "").toLowerCase();
    return name === target || name.startsWith(`${target}:`);
  });

  if (!installedMatch) {
    const names = installed
      .map((entry) => entry.name || entry.model || "unknown")
      .filter(Boolean);
    return {
      available: false,
      error:
        `Model '${model}' is not installed in Ollama. ` +
        `Installed models: ${names.length > 0 ? names.join(", ") : "none"}. ` +
        `Run 'ollama pull ${model}' and restart the dev server if needed.`,
    };
  }

  return {
    available: true,
    modelName: installedMatch.name || installedMatch.model || model,
  };
}

export async function parseOllamaErrorText(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as
      | { error?: string; message?: string }
      | { error?: { message?: string } };

    if (typeof body === "object" && body !== null) {
      if ("error" in body) {
        const err = (body as { error?: unknown }).error;
        if (typeof err === "string") return err;
        if (typeof err === "object" && err !== null && "message" in err) {
          const msg = (err as { message?: unknown }).message;
          if (typeof msg === "string") return msg;
        }
      }
      if ("message" in body && typeof body.message === "string") {
        return body.message;
      }
    }
  } catch {
    // Fall through to status text.
  }

  return response.statusText ?? `HTTP ${response.status}`;
}

export interface OllamaChatOptions {
  systemPrompt: string;
  userPrompt: string;
  imageBase64: string;
  numPredict?: number;
  /** When true, ask Ollama to enforce JSON output (requires model support). */
  jsonMode?: boolean;
}

function createRequestTimeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  // Ensure the timer is cleaned up if the request finishes before the timeout.
  if (typeof timer === "object" && "unref" in timer) {
    (timer as NodeJS.Timeout).unref();
  }
  return controller.signal;
}

export async function callOllamaChat(
  baseUrl: string,
  model: string,
  options: OllamaChatOptions,
): Promise<string> {
  const availability = await checkOllamaModelAvailability(baseUrl, model);
  if (!availability.available || !availability.modelName) {
    throw new Error(availability.error ?? `Model '${model}' is not available.`);
  }

  const exactModel = availability.modelName;
  const imageBase64 = options.imageBase64.replace(/\s/g, "");

  // Use a system message in the messages array rather than the top-level
  // `system` field. This matches the canonical Ollama /api/chat shape and
  // avoids strict-version failures some Ollama builds show when both are
  // present or when `system` is passed at the top level for vision models.
  const requestBody: Record<string, unknown> = {
    model: exactModel,
    stream: false,
    messages: [
      { role: "system", content: options.systemPrompt },
      {
        role: "user",
        content: options.userPrompt,
        images: [imageBase64],
      },
    ],
    options: {
      num_predict: options.numPredict ?? 1_500,
    },
  };

  if (options.jsonMode) {
    requestBody.format = "json";
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: createRequestTimeoutSignal(OLLAMA_REQUEST_TIMEOUT_MS),
      body: JSON.stringify(requestBody),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Could not reach Ollama at ${baseUrl}. ` +
        `Make sure Ollama is running and reachable. (${detail})`,
    );
  }

  if (!response.ok) {
    const detail = await parseOllamaErrorText(response);
    throw new Error(
      `Ollama returned HTTP ${response.status} for model '${exactModel}': ${detail}`,
    );
  }

  const body = await response.json().catch(() => null);

  // Ollama /api/chat responses vary between versions. Try several known
  // shapes to find textual content: message.content, choices[0].message.content,
  // output[0].content, or a top-level text field. Fall back to stringifying
  // the body for diagnostics.
  let rawContent: string | undefined;

  try {
    if (!body) rawContent = undefined;
    else if (typeof body === "string") rawContent = body;
    else if (typeof body === "object") {
      // message.content
      // @ts-ignore
      rawContent = body?.message?.content ?? rawContent;
      // choices[0].message.content
      // @ts-ignore
      rawContent = rawContent ?? body?.choices?.[0]?.message?.content;
      // output array common in some builds
      // @ts-ignore
      rawContent = rawContent ?? body?.output?.[0]?.content;
      // some builds return text
      // @ts-ignore
      rawContent = rawContent ?? body?.text ?? body?.result ?? body?.response;
      // if body.output is array of strings
      // @ts-ignore
      if (!rawContent && Array.isArray(body.output) && typeof body.output[0] === "string") {
        // @ts-ignore
        rawContent = body.output[0];
      }
    }
  } catch (e) {
    // ignore
  }

  if (!rawContent || typeof rawContent !== "string") {
    throw new Error("Ollama returned an empty or unrecognized response.");
  }

  return extractJsonContent(rawContent);
}
