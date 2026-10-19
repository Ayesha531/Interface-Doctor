"use client";

import { useRef, useState } from "react";
import {
  ACCEPTED_MIME_TYPES,
  MAX_FILE_SIZE_MB,
  validateScreenshotFile,
} from "@/lib/uploadValidation";

interface UploadDropzoneProps {
  onFileAccepted: (file: File) => void;
  onValidationError: (message: string) => void;
  disabled?: boolean;
}

export function UploadDropzone({
  onFileAccepted,
  onValidationError,
  disabled = false,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragActive, setDragActive] = useState(false);

  const acceptFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const result = validateScreenshotFile(file);
    if (!result.ok) {
      onValidationError(result.error);
      return;
    }
    onFileAccepted(file);
  };

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload a screenshot. Drop a PNG or JPG file here, or press Enter to browse."
      aria-disabled={disabled}
      onClick={openPicker}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPicker();
        }
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        dragDepth.current += 1;
        setDragActive(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        e.preventDefault();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragActive(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        dragDepth.current = 0;
        setDragActive(false);
        if (!disabled) acceptFiles(e.dataTransfer.files);
      }}
      className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
        dragActive
          ? "border-brand-500 bg-brand-50"
          : "border-ink-300 bg-ink-50 hover:border-brand-400 hover:bg-brand-50/50"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <span
        aria-hidden="true"
        className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${
          dragActive ? "bg-brand-100 text-brand-600" : "bg-white text-ink-400 shadow-card group-hover:text-brand-500"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <circle cx="9" cy="9" r="2" />
          <path d="M21 15l-4.5-4.5a1.5 1.5 0 00-2 0L7 18" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>

      <p className="text-sm font-semibold text-ink-800">
        {dragActive ? "Drop your screenshot here" : "Drag & drop your screenshot"}
      </p>
      <p className="mt-1 text-sm text-ink-500">
        or <span className="font-medium text-brand-600 underline underline-offset-2">browse your files</span>
      </p>
      <p className="mt-3 text-xs text-ink-400">
        PNG, JPG or JPEG · up to {MAX_FILE_SIZE_MB} MB
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_MIME_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          acceptFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
