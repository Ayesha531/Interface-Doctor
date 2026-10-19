/** Browser-only helpers: files → previews, sample conversion, thumbnails. */

import type { ScreenshotSelection } from "@/lib/types";

/** Read an image file into a ScreenshotSelection with a preview + data URL. */
export function fileToSelection(file: File): Promise<ScreenshotSelection> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () =>
        reject(new Error("The file could not be decoded as an image. It may be corrupted."));
      img.onload = () =>
        resolve({
          previewUrl: dataUrl,
          dataUrl,
          name: file.name,
          sizeBytes: file.size,
          mimeType: file.type || "image/png",
          width: img.naturalWidth,
          height: img.naturalHeight,
          source: "upload",
        });
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Load the bundled sample screenshot (SVG) and rasterize it to a real PNG so
 * it passes through the exact same pipeline (and server validation) as an
 * uploaded file.
 */
export async function loadSampleSelection(): Promise<ScreenshotSelection> {
  const res = await fetch("/sample-screenshot.svg");
  if (!res.ok) throw new Error("The sample screenshot could not be loaded.");
  const svgText = await res.text();

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("The sample screenshot could not be decoded."));
    el.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || 1200;
  canvas.height = img.naturalHeight || 800;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("The sample screenshot could not be converted to PNG.");

  const dataUrl = canvas.toDataURL("image/png");
  return {
    previewUrl: dataUrl,
    dataUrl,
    name: "sample-screenshot.png",
    sizeBytes: blob.size,
    mimeType: "image/png",
    width: canvas.width,
    height: canvas.height,
    source: "sample",
  };
}

/** Downscale a screenshot to a small thumbnail data URL for recent projects. */
export async function makeThumbnail(dataUrl: string, maxWidth = 320): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Thumbnail generation failed."));
    el.src = dataUrl;
  });
  const scale = Math.min(1, maxWidth / img.naturalWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.72);
}
