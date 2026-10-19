import type { AiStatusResponse } from "@/lib/types";

export function AiStatusBadge({ status }: { status: AiStatusResponse | null }) {
  if (!status) {
    return (
      <p className="flex items-center gap-2 text-xs text-ink-400">
        <span className="h-2 w-2 animate-pulse rounded-full bg-ink-500" aria-hidden="true" />
        Checking AI engine…
      </p>
    );
  }

  if (status.configured) {
    return (
      <p className="flex items-center gap-2 text-xs text-brand-300">
        <span className="h-2 w-2 rounded-full bg-brand-400" aria-hidden="true" />
        AI engine ready · {status.provider}/{status.model}
      </p>
    );
  }

  return (
    <p className="flex items-center gap-2 text-xs text-amber-300">
      <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />
      AI not configured · add {status.missing[0] ?? "API key"}
    </p>
  );
}
