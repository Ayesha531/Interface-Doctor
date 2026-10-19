/** Shared types for the Interface Doctor AI client and API. */

export type Severity = "low" | "medium" | "high";

export interface FindingRegion {
  /** All values are fractions (0–1) of the screenshot's width/height. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnalysisFinding {
  id: string;
  title: string;
  severity: Severity;
  explanation: string;
  suggestion: string;
  region?: FindingRegion;
}

export type AnalyzeResult =
  | {
      status: "ok";
      findings: AnalysisFinding[];
      provider: string;
      model: string;
    }
  | {
      status: "ai_unconfigured";
      message: string;
      missing: string[];
    }
  | {
      status: "error";
      message: string;
    };

export interface AiStatusResponse {
  configured: boolean;
  provider: string;
  model: string;
  missing: string[];
}

export interface ScreenshotSelection {
  /** Object URL or data URL used for <img> preview. */
  previewUrl: string;
  /** Data URL sent to the analyze API. */
  dataUrl: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  width: number;
  height: number;
  source: "upload" | "sample";
}
