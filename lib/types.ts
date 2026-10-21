/** Shared types for the Interface Doctor AI client and API. */

export type Severity = "critical" | "high" | "medium" | "low";

export type FindingCategory =
  | "visual-hierarchy"
  | "spacing-alignment"
  | "typography-readability"
  | "color-contrast"
  | "accessibility"
  | "component-consistency"
  | "navigation-usability"
  | "responsive-design"
  | "other";

export const FINDING_CATEGORIES: readonly FindingCategory[] = [
  "visual-hierarchy",
  "spacing-alignment",
  "typography-readability",
  "color-contrast",
  "accessibility",
  "component-consistency",
  "navigation-usability",
  "responsive-design",
  "other",
];

export const CATEGORY_LABELS: Record<FindingCategory, string> = {
  "visual-hierarchy": "Visual hierarchy",
  "spacing-alignment": "Spacing & alignment",
  "typography-readability": "Typography & readability",
  "color-contrast": "Color & contrast",
  accessibility: "Accessibility",
  "component-consistency": "Component consistency",
  "navigation-usability": "Navigation & usability",
  "responsive-design": "Responsive design",
  other: "Other",
};

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
  category: FindingCategory;
  explanation: string;
  suggestion: string;
  confidence?: number;
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

export type AiSupportStatus = "ready" | "key_missing" | "provider_unsupported";

export interface AiStatusResponse {
  configured: boolean;
  provider: string;
  model: string;
  /** True when OPENAI_API_KEY (or the provider-specific key) is present in the server environment. */
  keyPresent: boolean;
  /** True when the configured provider is implemented by the application. */
  supportedProvider: boolean;
  status: AiSupportStatus;
  missing: string[];
  /** Human-readable, safe explanation of the current AI configuration state. */
  message: string;
  /** Safe runtime diagnostics — never includes the secret value. */
  diagnostics: {
    runtime: "nodejs";
    variablesChecked: string[];
  };
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
