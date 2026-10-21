/**
 * Extract a JSON object from AI responses that may be wrapped in Markdown
 * fences or contain trailing explanatory text.
 */

export function extractJsonContent(text: string): string {
  const trimmed = text.trim();

  // Markdown fenced code block (```json ... ``` or ``` ... ```).
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch?.[1]) {
    return fenceMatch[1].trim();
  }

  // Find the first balanced top-level JSON object, ignoring braces inside strings.
  const start = trimmed.indexOf("{");
  if (start === -1) return trimmed;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (char === "\\") {
        escape = true;
      } else if (char === '"') {
        inString = false;
      }
    } else {
      if (char === '"') {
        inString = true;
      } else if (char === "{") {
        depth++;
      } else if (char === "}") {
        depth--;
        if (depth === 0) {
          return trimmed.slice(start, i + 1);
        }
      }
    }
  }

  return trimmed.slice(start);
}
