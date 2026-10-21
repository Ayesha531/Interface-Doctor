/**
 * Shared Ollama helpers for screenshot analysis and redesign generation.
 *
 * These functions run only on the server and never expose environment secrets.
 */

import { extractJsonContent } from "@/lib/jsonExtraction";

export const OLLAMA_DEFAULT_BASE_URL = "http://localhost:11434";
export const OLLAMA_REQUEST_TIMEOUT_MS = 120_000;
export const OLLAMA_HEALTH_TIMEOUT_MS = 5_000;

export function getOllamaBaseUrl(): string {
  return (process.env.OLLAMA_BASE_URL || OLLAMA_DEFAULT_BASE_URL).replace(
    /\/+$/,
    "",
  );
}

export interface OllamaAvailabilityResult {
  available: boolean;
  error?: string;
}

/**
 * Check whether the configured Ollama model is installed.
 *
 * Ollama returns a 200 with a list of local models from /api/tags. A model
 * matches if its name equals the configured name or starts with "name:".
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

  let data: { models?: Array<{ name: string }> };
  try {
    data = (await response.json()) as { models?: Array<{ name: string }> };
  } catch {
    return {
      available: false,
      error: "Ollama /api/tags returned unreadable JSON.",
    };
  }

  const installed = data.models?.map((m) => m.name) ?? [];
  const target = model.toLowerCase();

  const installedMatch = installed.find((name) => {
    const lower = name.toLowerCase();
    return lower === target || lower.startsWith(`${target}:`);
  });

  if (!installedMatch) {
    return {
      available: false,
      error:
        `Model '${model}' is not installed in Ollama. ` +
        `Installed models: ${installed.length > 0 ? installed.join(", ") : "none"}. ` +
        `Run 'ollama pull ${model}' and restart the dev server if needed.`,
    };
  }

  return { available: true };
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
}

export async function callOllamaChat(
  baseUrl: string,
  model: string,
  options: OllamaChatOptions,
): Promise<string> {
  const availability = await checkOllamaModelAvailability(baseUrl, model);
  if (!availability.available) {
    throw new Error(availability.error);
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(OLLAMA_REQUEST_TIMEOUT_MS),
      body: JSON.stringify({
        model,
        stream: false,
        options: {
          num_predict: options.numPredict ?? 1_500,
        },
        messages: [
          { role: "system", content: options.systemPrompt },
          {
            role: "user",
            content: options.userPrompt,
            images: [options.imageBase64],
          },
        ],
      }),
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
    throw new Error(`Ollama returned HTTP ${response.status}: ${detail}`);
  }

  const payload = (await response.json()) as {
    message?: { content?: string };
  };

  const rawContent = payload.message?.content;
  if (!rawContent) {
    throw new Error("Ollama returned an empty response message.");
  }

  return extractJsonContent(rawContent);
}
