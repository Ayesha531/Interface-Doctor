"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface BeforeAfterComparisonProps {
  /** Original content (left / before side). */
  before: React.ReactNode;
  /** Redesigned content (right / after side). */
  after: React.ReactNode;
  /** Aspect ratio for the comparison container. */
  aspectRatio?: number;
  /** Accessible label for the comparison. */
  label?: string;
}

/**
 * Interactive before-and-after comparison slider.
 *
 * Renders two layers: the redesigned (after) content on the bottom and the
 * original (before) content on top, clipped to the current slider position.
 * Users can drag the handle or click anywhere on the container to move it.
 */
export function BeforeAfterComparison({
  before,
  after,
  aspectRatio = 4 / 3,
  label = "Before and after comparison",
}: BeforeAfterComparisonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);

  const updatePositionFromEvent = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const pct = (x / rect.width) * 100;
    setPosition(pct);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setDragging(true);
      updatePositionFromEvent(e.clientX);
    },
    [updatePositionFromEvent],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      setDragging(true);
      updatePositionFromEvent(e.touches[0].clientX);
    },
    [updatePositionFromEvent],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPosition((p) => Math.max(0, p - 5));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setPosition((p) => Math.min(100, p + 5));
      } else if (e.key === "Home") {
        e.preventDefault();
        setPosition(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setPosition(100);
      }
    },
    [],
  );

  useEffect(() => {
    if (!dragging) return;

    const onMouseMove = (e: MouseEvent) => updatePositionFromEvent(e.clientX);
    const onTouchMove = (e: TouchEvent) => updatePositionFromEvent(e.touches[0].clientX);
    const onUp = () => setDragging(false);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, updatePositionFromEvent]);

  return (
    <div
      ref={containerRef}
      role="slider"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position)}
      tabIndex={0}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onKeyDown={handleKeyDown}
      className={`relative w-full select-none overflow-hidden rounded-xl border border-ink-200 bg-ink-950 ${
        dragging ? "cursor-ew-resize" : "cursor-col-resize"
      }`}
      style={{ aspectRatio: `${aspectRatio}` }}
    >
      {/* After (redesign) layer */}
      <div className="absolute inset-0">{after}</div>

      {/* Before (original) layer, clipped to slider position */}
      <div
        className="absolute inset-0 z-10 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        {before}
      </div>

      {/* Divider and handle */}
      <div
        className="absolute inset-y-0 z-20 w-px bg-white/70 shadow-[0_0_8px_rgba(0,0,0,0.4)]"
        style={{ left: `${position}%` }}
      >
        <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-white shadow-lg">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M9 5l-4 7 4 7M15 5l4 7-4 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <span className="absolute left-3 top-3 z-30 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
        Before
      </span>
      <span className="absolute right-3 top-3 z-30 rounded-md bg-brand-600/90 px-2 py-1 text-xs font-medium text-white">
        After
      </span>
    </div>
  );
}
