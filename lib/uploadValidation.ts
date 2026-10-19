/** Client-side validation for screenshot uploads (PNG/JPG/JPEG, size-limited). */

export const ACCEPTED_MIME_TYPES = ["image/png", "image/jpeg"] as const;
export const ACCEPTED_EXTENSIONS = [".png", ".jpg", ".jpeg"] as const;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_FILE_SIZE_MB = MAX_FILE_SIZE_BYTES / (1024 * 1024);

export type ValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export function validateScreenshotFile(file: File): ValidationResult {
  const mimeOk = (ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type);
  const name = file.name.toLowerCase();
  const extOk = ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));

  if (!mimeOk && !extOk) {
    return {
      ok: false,
      error: `"${file.name}" is not a supported format. Please upload a PNG or JPG screenshot.`,
    };
  }

  if (file.size === 0) {
    return { ok: false, error: `"${file.name}" appears to be empty.` };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      error: `"${file.name}" is ${formatBytes(file.size)}, which exceeds the ${MAX_FILE_SIZE_MB} MB limit.`,
    };
  }

  return { ok: true };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
