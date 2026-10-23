Interface Doctor AI — Context (Phase 5: Documentation & Verification)

Purpose
- Interface Doctor AI analyzes UI screenshots and returns prioritized accessibility/usability findings and an AI-generated responsive HTML/CSS redesign. Built with Next.js + TypeScript and a pluggable AI provider layer (Ollama or OpenAI).

Scope of this file
- Concise summary of architecture, what was completed in Phases 1–4, confirmed root causes for the Phase 4 failures, minimal fixes applied, test coverage done here, exact steps to verify in GitHub Codespaces (where Ollama runs), and next steps. No secrets are included.

Architecture (high level)
- Frontend: Next.js App Router (app/), TypeScript, Tailwind CSS. Components live in components/*.tsx.
- Server/API: Next.js route handlers at app/api/*: analyze, redesign, status. Routes accept FormData, call the selected AI provider via lib/*, sanitize outputs, and return structured JSON.
- AI layer: lib/ai.ts (provider selection & runtime diagnostics), lib/ollama.ts (Ollama client + parsing), lib/redesign.ts (prompt composition & post-processing).
- Security: Generated HTML/CSS are sanitized server-side and rendered in a sandboxed iframe (SafeHtmlPreview) under a restrictive CSP. No environment secrets are leaked to clients.

Completed Phases (1–4)
- Phase 1: Project scaffold, screenshot upload UI, basic OpenAI integration, safe preview components.
- Phase 2: Provider abstraction and initial Ollama support for analysis & redesign prompts.
- Phase 3: Type adjustments, CLI-style diagnostics (api/status), upload validation, and UI hardening.
- Phase 4: Root-cause fixes enabling Ollama-based analysis/redesign flows to work when Ollama is available in the runtime (Codespace). Key runtime fixes are limited and targeted (see below).

Confirmed Phase 4 root causes and minimal fixes applied
- Root cause A — lib/ollama.ts runtime exception (HTTP 500 on /api/analyze):
  - Cause: duplicate variable name shadowing/fragile response parsing (two variables named `payload` in the same scope) which caused runtime exceptions when Ollama returned different response shapes.
  - Fix: Renamed the duplicate variable to `result` and implemented tolerant parsing that checks multiple common fields (choices, output, text, result). Added clearer, safe error messages when response shapes are unexpected.

- Root cause B — /api/redesign reported provider misconfiguration:
  - Cause: OpenAI-centric checks in provider-selection caused unnecessary OPENAI_API_KEY validation even when AI_PROVIDER=ollama.
  - Fix: Updated lib/ai.ts provider selection and runtime diagnostics so Ollama is treated independently (no OpenAI key required). getAiRuntimeStatus now pings OLLAMA_BASE_URL and attempts model resolution (e.g. gemma3 -> gemma3:latest) without exposing secrets.

- Root cause C — frontend crashes in AnalysisResultPanel:
  - Cause: code assumed arrays/strings were present and called .join() on undefined; also a state update occurred during render.
  - Fix: Defensive checks added in components/AnalysisResultPanel.tsx and side-effects moved into useEffect/event handlers.

Files changed (minimal, focused)
- lib/ollama.ts — fixed duplicate variable, tolerant parsing, improved errors
- lib/ai.ts — provider selection, Ollama-aware diagnostics and model resolution
- lib/redesign.ts — using unified provider flow and validating inputs
- app/api/analyze/route.ts — input validation, structured errors, non-leaky diagnostics
- app/api/redesign/route.ts — input validation, provider usage fixed, sanitized HTML output
- app/api/status/route.ts — safe provider diagnostics for browser consumption
- components/AnalysisResultPanel.tsx — defensive rendering; no .join on undefined; moved side-effects
- components/RedesignPanel.tsx — response-shape validation and clearer error UI

What the APIs now return (contracts)
- POST /api/analyze
  - Request: FormData with `file` (image). Recommended max size: 10MB.
  - 200: { findings: Array, markers?: Array, debug?: { provider: string, model?: string } }
  - non-2xx: { error: string } — useful messages such as "Cannot reach Ollama at http://localhost:11434" or "Model gemma3:latest not found".

- POST /api/redesign
  - Request: FormData with `file` and optional `findings` JSON string.
  - 200: { html: string (sanitized), css?: string, metadata: { provider: string, model?: string } }
  - non-2xx: { error: string }

- GET /api/status
  - 200: { provider: string|null, ollamaBaseUrl?: string, reachable?: boolean, modelAvailable?: boolean, modelName?: string, modelError?: string }
  - Safe to call from the browser; contains no API keys or secrets.

Errors surfaced to users (examples)
- Cannot reach Ollama: "Cannot reach Ollama at http://localhost:11434. Make sure Ollama is running and OLLAMA_BASE_URL is correct. (fetch failed)"
- Model not found: "Model gemma3:latest not found. Run 'ollama pull gemma3' or update AI_VISION_MODEL to an installed tag."
- Malformed response: "Unexpected response shape from Ollama: (short excerpt)"
- Oversized image: "Uploaded image exceeds max allowed size (10MB)."
- Provider misconfiguration: "AI_PROVIDER is not configured. Set AI_PROVIDER=ollama or set OPENAI_API_KEY for OpenAI."

What I could and could not do here (testing performed)
- Done in this environment:
  - Inspected and edited the source files listed above.
  - Applied minimal, targeted code fixes described earlier (variable rename, parsing hardening, defensive UI guards, provider-aware checks).
  - Static TypeScript and logic inspection; corrected obvious type mismatches by code edits.
- Not done (cannot run here):
  - I could not start the Next.js dev server, run npm scripts, or contact an Ollama service from this assistant environment. No runtime Ollama calls were made here.

Exact verification steps to run in your GitHub Codespace (where Ollama is installed)
Note: Ollama must be reachable from the same environment that runs the Next.js server (i.e., inside the Codespace container). Do not run these steps from your laptop if Ollama runs inside Codespaces.

1) Verify Ollama and model availability in the Codespace shell
   - ollama status
   - ollama list
   - If gemma3 is missing: ollama pull gemma3
   - Confirm the model tag (eg. gemma3:latest or the tag shown by ollama list).

2) Set environment variables in Codespaces (do NOT commit secrets)
   - AI_PROVIDER=ollama
   - AI_VISION_MODEL=gemma3 OR gemma3:latest (match ollama list output)
   - OLLAMA_BASE_URL=http://localhost:11434
   - (If using OpenAI instead: AI_PROVIDER=openai and set OPENAI_API_KEY)

3) Install and run the app
   - npm install
   - npm run typecheck    # optional
   - npm run lint         # optional
   - npm run dev

4) Quick HTTP checks from the same Codespace (server runtime environment)
   - curl -sS http://localhost:3000/api/status | jq
     - Expect: reachable=true and modelAvailable=true when Ollama + model are running.
   - If reachable=false: verify that Ollama is running in the same environment and that OLLAMA_BASE_URL is correct.

5) UI test
   - Open the app preview in Codespaces or forwarded port.
   - Upload a PNG/JPEG screenshot (<=10MB). Click Analyze.
     - On success: Findings panel fills and markers appear.
     - On failure: UI shows the exact server error string returned by the API.
   - Click Generate Redesign to get sanitized HTML/CSS preview. Confirm before/after slider works and the iframe is sandboxed.

Git commands to prepare the review branch (run these in your Codespace/local repo)
- git checkout -b fix/ollama-payload
- git add .
- git commit -m "fix(ollama): robust response parsing, provider diagnostics, and UI guards"
- git push origin fix/ollama-payload
- Open a PR from fix/ollama-payload -> main in your git host UI.

Remaining tasks and recommendations
- Run the app in Codespaces and confirm /api/status reports reachable/modelAvailable. If not, attach the JSON output and any server logs to the PR.
- If you see "Unexpected response shape from Ollama", copy the short scrubbed excerpt the server returns and open an issue so parsing in lib/ollama.ts can be extended for that shape.
- Run full TypeScript and lint checks in the Codespace and fix any environment-specific issues that surface at runtime.

Notes and constraints
- No secrets or API keys are added to the repo. Provide them via Codespaces environment or your secure secrets panel.
- Localhost:11434 refers to the Codespace/container where Ollama runs — make sure Ollama is running there.
- This document is intentionally concise; for deeper debugging attach /api/status output and a single failing API response body (server logs) to the PR.

If you want me to iterate further
- Run the verification steps and paste the JSON from GET /api/status and any failing API response excerpt. I will update lib/ollama.ts parsing or lib/ai.ts checks based on real runtime output.

End of context.md
