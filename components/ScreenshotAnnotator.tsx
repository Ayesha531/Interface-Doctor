"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AnalysisFinding, Severity } from "@/lib/types";
import { fractionToPixels, type Rect } from "@/lib/geometry";

interface ScreenshotAnnotatorProps {
  src: string;
  alt: string;
  findings: AnalysisFinding[];
  activeFindingId?: string | null;
  onActivateFinding?: (id: string | null) => void;
}

const SEVERITY_RING: Record<Severity, string> = {
  critical: "ring-red-600 bg-red-600/25",
  high: "ring-red-500 bg-red-500/20",
  medium: "ring-amber-500 bg-amber-500/20",
  low: "ring-sky-500 bg-sky-500/20",
};

const SEVERITY_DOT: Record<Severity, string> = {
  critical: "bg-red-600",
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-sky-500",
};

function useImageRenderedRect(
  containerRef: React.RefObject<HTMLDivElement>,
  imageRef: React.RefObject<HTMLImageElement>,
) {
  const [rect, setRect] = useState<Rect>({ left: 0, top: 0, width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    const img = imageRef.current;
    if (!container || !img) return;

    const measure = () => {
      const containerRect = container.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();
      setRect({
        left: imgRect.left - containerRect.left,
        top: imgRect.top - containerRect.top,
        width: imgRect.width,
        height: imgRect.height,
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    ro.observe(img);
    window.addEventListener("resize", measure);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [containerRef, imageRef]);

  return rect;
}

export function ScreenshotAnnotator({
  src,
  alt,
  findings,
  activeFindingId,
  onActivateFinding,
}: ScreenshotAnnotatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const renderedRect = useImageRenderedRect(containerRef, imageRef);

  const findingsWithRects = useMemo(() => {
    return findings
      .map((f, originalIndex) => ({ finding: f, originalIndex }))
      .filter(({ finding }) => finding.region)
      .map(({ finding, originalIndex }) => ({
        finding,
        originalIndex,
        rect: fractionToPixels(finding.region!, renderedRect),
      }))
      .filter(({ rect }) => rect.width >= 6 && rect.height >= 6);
  }, [findings, renderedRect]);

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-xl border border-ink-200 bg-ink-950">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        className="mx-auto max-h-[560px] w-full object-contain"
      />

      <div className="pointer-events-none absolute inset-0">
        {findingsWithRects.map(({ finding, originalIndex, rect }) => {
          const active = activeFindingId === finding.id;
          const dimmed = activeFindingId != null && !active;
          const label = `${originalIndex + 1}. ${finding.title}`;
          return (
            <button
              key={finding.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onActivateFinding?.(active ? null : finding.id);
              }}
              onMouseEnter={() => onActivateFinding?.(finding.id)}
              onMouseLeave={() => onActivateFinding?.(null)}
              className={`pointer-events-auto absolute flex items-start justify-start rounded-lg transition-all duration-200 ${SEVERITY_RING[finding.severity]} ${
                active ? "z-20 ring-2 ring-offset-2 ring-offset-ink-950" : "ring-1"
              } ${dimmed ? "opacity-30" : "opacity-100"}`}
              style={{
                left: `${rect.left}px`,
                top: `${rect.top}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
              }}
              aria-label={`Issue ${originalIndex + 1}: ${finding.title}`}
              title={label}
            >
              <span
                className={`ml-1 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-md ${SEVERITY_DOT[finding.severity]} ${
                  active ? "scale-110" : ""
                }`}
              >
                {originalIndex + 1}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
