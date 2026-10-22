Interface Doctor AI — Context, Phase 1–5 (Documentation & Next Steps)

Summary
- Purpose: Interface Doctor AI analyzes UI screenshots and generates prioritized accessibility/usability findings plus an AI-suggested responsive HTML/CSS redesign. The project is a Next.js + TypeScript app with Tailwind UI and pluggable AI providers (Ollama or OpenAI).
- Scope of this document: concise project purpose, architecture, Phase 1–4 completed work, root causes found, minimal fixes applied in Phase 4, what remains to validate in a Codespace with Ollama, exact test & git steps, and file/API map. This document intentionally omits any secrets.

Architecture & key flows
- Frontend: Next.js (App Router), TypeScript, Tailwind. Components live in components/*.tsx. Key UIs: Dashboard, UploadDropzone, AnalysisResultPanel, RedesignPanel, BeforeAfterComparison.
- Server/API: Next.js route handlers under app/api:
  - POST /api/analyze — accepts uploaded screenshot + options, performs AI diagnosis.
  - POST /api/redesign — accepts screenshot + diagnosis, generates sanitized HTML/CSS redesign.
  - GET /api/status — reports AI runtime configuration and lightweight provider diagnostics.
- AI layers:
  - lib/ai.ts — provider-agnostic helpers, runtime status, configuration resolution.
  - lib/ollama.ts — Ollama-specific client, request building, response parsing, and diagnostics.
  - lib/redesign.ts — prompt templates and helper for generating redesign HTML/CSS.
- Security: AI-generated HTML is sanitized server-side (SafeHtmlPreview), and rendered in a sandboxed iframe with a restrictive CSP on the client.

Actors
- User: uploads a screenshot, reads findings, runs redesign generator, previews before/after.
- Developer: configures Ollama or OpenAI in environment, runs typecheck/lint, deploys.
- CI/Runner: expected to run typecheck/lint/build; no DB required.

Phase 1–4 status (completed work)
- Phase 1: Project scaffold, file upload, screenshot preview, and basic UI completed.
- Phase 2: Initial AI integration and OpenAI support implemented.
- Phase 3: Added Ollama support and Vision-model handling; prepared unified provider patterns.
- Phase 4: Fixed several runtime issues preventing analysis/redesign. Key changes applied (minimal and targeted):
  - lib/ollama.ts: robust response parsing across known Ollama response shapes; removed duplicate variable name (previously two variables named 'payload' caused runtime exceptions), renamed internal variables to avoid collisions and ensure correct result extraction.
  - lib/ai.ts: getAiRuntimeStatus and related checks converted to async where needed and clarified behavior so Ollama is considered configured when AI_PROVIDER=ollama (no OPENAI_API_KEY required).
  - app/api/analyze/route.ts and app/api/redesign/route.ts: now await runtime diagnostics, validate inputs, and return structured, non-opaque errors (including clear messages for unreachable Ollama, missing model, oversized images, or malformed AI responses).
  - components/AnalysisResultPanel.tsx: defensive checks for missing arrays/fields to avoid .join() on undefined and removed side-effectful state updates during render.
  - components/RedesignPanel.tsx and SafeHtmlPreview.tsx: ensured sanitized HTML remains server-side and iframe sandbox retained.

Root causes discovered and fixes applied
1) HTTP 500 from Ollama calls (analysis):
   - Root cause: lib/ollama.ts assumed a single rigid response shape and referenced a duplicated/incorrect variable name which could be undefined when Ollama returned a slightly different response shape. This threw and produced an unhelpful HTTP 500.
   - Fix: made response parsing tolerant of multiple shapes (choices/message/output/text/result), renamed the duplicate variable and ensured the function returns a consistent parsed object or a clear error with returned Ollama error text when available.

2) Redesign reported "AI provider not configured":
   - Root cause: runtime status logic conflated OpenAI-only checks with provider selection; Ollama path incorrectly required an OPENAI_API_KEY in some checks.
   - Fix: clarified provider logic: when AI_PROVIDER=ollama, do not require OPENAI_API_KEY. getAiRuntimeStatus now performs a lightweight /api/tags-check (via OLLAMA_BASE_URL) and reports model resolution and reachability.

3) Client crash in AnalysisResultPanel (.join undefined) and React warning about updates during render:
   - Root cause: UI code assumed the AI response shape contained arrays/fields that were missing for error responses; additionally a state update/side-effect occurred during render leading to React warnings.
   - Fix: Added defensive validation and default values before using .join or rendering lists; moved side-effects to useEffect or event handlers.

What was NOT done here (limitations of this environment)
- I could not run the dev server, contact your Ollama instance, or run npm scripts (typecheck/lint/build) from this environment. All fixes are code edits only — they must be verified in your Codespace where Ollama and gemma3 are installed.
- I did not create or push a Git branch from this environment. I prepared code changes in the repository that should be committed on the review branch described below.

Files changed in this patch (minimal, focused)
- lib/ollama.ts — make response parsing robust, rename duplicated var, improved error messages and diagnostics handling.
- lib/ai.ts — async runtime status checks; clarified provider selection; improved diagnostics for Ollama.
- lib/redesign.ts — use unified Ollama client flow; await config; validate inputs.
- app/api/analyze/route.ts — await diagnostics and return structured errors.
- app/api/redesign/route.ts — await diagnostics and return structured errors.
- app/api/status/route.ts — include provider diagnostics for Ollama.
- components/AnalysisResultPanel.tsx — defensive null-checks and moved side-effects out of render.
- components/RedesignPanel.tsx — ensure API responses are validated before use.

Key API routes and expectations
- POST /api/analyze
  - Request: FormData with screenshot file or JSON with base64 image (UI uses FormData). Max size validated server-side (<= app config, recommended ≤10MB).
  - Response (2xx): { findings: Array<...>, markers: Array<...>, debug?: { model: string, provider: string } }
  - Error (non-2xx): { error: string } with a human-friendly diagnostic (e.g. "Cannot reach Ollama at http://localhost:11434", "Model gemma3:latest not found", "Ollama returned malformed response: <short excerpt>" )

- POST /api/redesign
  - Request: screenshot + findings JSON (optional)
  - Response (2xx): { html: string (sanitized), css?: string, metadata: { model, provider } }
  - Error (non-2xx): { error: string }

- GET /api/status
  - Response: { provider: 'ollama'|'openai'|null, ollamaBaseUrl?: string, reachable?: boolean, modelAvailable?: boolean, modelName?: string, modelError?: string }
  - Note: This is safe to call from the client; it never echoes secrets.

Ollama & Codespaces developer setup (exact steps to run in your Codespace)
1) Verify Ollama is installed in the Codespace container and the model is available locally:
   - ollama status
   - ollama list (or ollama tags)
   - ollama pull gemma3 (or the specific model name you plan to use, e.g. gemma3:latest)
   Note: Some Ollama versions require explicit model tags like gemma3:latest. If you configure AI_VISION_MODEL=gemma3, the server will attempt to resolve tags and will include the exact resolved tag in /api/status output.

2) Environment variables (set these in your Codespace environment or Secrets panel):
   - AI_PROVIDER=ollama
   - AI_VISION_MODEL=gemma3
   - OLLAMA_BASE_URL=http://localhost:11434
   Do NOT set OPENAI_API_KEY if you intend to use only Ollama.
   See .env.example for all variables used (no secret values included there).

3) Install and run the app inside the Codespace:
   - npm install
   - npm run typecheck  # optional but recommended
   - npm run lint       # optional
   - npm run dev

4) Functional test in the browser (Codespace forwarded port)
   - Open the app (the preview URL provided by Codespaces / Vite / Next preview).
   - Upload a PNG/JPG screenshot (<=10MB). Click Analyze.
     * If Ollama is reachable and the model is available, you should receive findings and markers.
     * If Ollama is unreachable, the UI will show the server-provided error message from /api/analyze (e.g. "Could not connect to Ollama at http://localhost:11434").
   - Click Generate Redesign; the /api/redesign route should return sanitized HTML/CSS and the app will render it in a sandboxed iframe.

Troubleshooting tips and what to capture if things fail
- If analysis or redesign returns HTTP 500 or an error, open the Codespace terminal where Next is running and copy the server logs for the failing route. Share the logs (especially any returned Ollama /api/chat body) for me to analyze further.
- If /api/status shows reachable=false or modelAvailable=false, run ollama list / ollama tags and verify the exact model tag. If the model is named gemma3:latest in Ollama, set AI_VISION_MODEL=gemma3:latest.
- If you see "malformed response" errors, paste the small excerpt the server includes (it returns only short excerpts to avoid leaking large content).
- If uploads are rejected: check the client console and server logs for "oversized image" messages. The server validates size.

Exact git commands to create the review branch locally and push (I could not push from here)
- git checkout -b fix/ollama-payload
- git add .
- git commit -m "fix(ollama): robust response parsing, diagnostics & Phase 4 runtime fixes"
- git push origin fix/ollama-payload
- Open a PR on GitHub from fix/ollama-payload into main and request review.

Suggested verification checklist to run in Codespaces (one-by-one)
1) npm install
2) npm run typecheck
   - If type errors appear, copy and share them; I'll prepare a follow-up patch.
3) npm run lint
   - Fix minor lint issues if CI demands; they are non-blocking for functional testing.
4) npm run dev
5) Visit UI and run: Upload → Analyze → Generate Redesign
6) If any API call fails, call GET /api/status and paste the JSON. The JSON will help pinpoint connectivity vs model vs parsing failures.

Remaining work / open questions
- I could not run the app or contact Ollama in this environment; therefore, the final runtime verification (that gemma3:latest returns usable vision completions for your prompt) must be executed by you in Codespaces where Ollama is installed.
- If Ollama returns new/unknown response shapes that still cause parsing issues, capture a small sample response body (redact PII and large arrays) and I will update lib/ollama.ts to parse it.

Safety & Secrets
- No secrets were added to the repo. Never commit OPENAI_API_KEY or other secrets. Use the Codespace Secrets panel or process.env when running locally.
- API route handlers are designed to return safe, concise error messages and not leak environment variables or uploaded image binaries in error responses.

Contact & next steps
- Run the verification checklist in Codespaces and share back any failing request logs or /api/status JSON. I will iterate quickly.
- If you'd like, I can prepare a single `.patch` file for the changes in this branch to apply locally. Ask and I will generate it.

Quick reference: key files to inspect
- app/api/analyze/route.ts
- app/api/redesign/route.ts
- app/api/status/route.ts
- lib/ai.ts
- lib/ollama.ts
- lib/redesign.ts
- components/AnalysisResultPanel.tsx
- components/RedesignPanel.tsx

Acknowledgements
- This patch focused on minimal, targeted fixes to unblock Ollama-based analysis/redesign flows and improve error diagnostics. The runtime verification step must be performed in your Codespace where Ollama and the target vision model are installed.
