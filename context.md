Project: Interface Doctor AI — Phase 1–4 context

Purpose and architecture
- Next.js + TypeScript + Tailwind frontend with server API routes under app/api.
- AI provider pluggable: supports Ollama (local, no API key) and OpenAI (requires OPENAI_API_KEY).
- Vision analysis (/api/analyze) and redesign generation (/api/redesign) call into lib/ai.ts and lib/ollama.ts.
- AI-generated HTML is sanitized server-side and rendered inside a sandboxed iframe on the client.

Phase 4 changes completed in this patch
- Fixed duplicated/misnamed payload handling and hardened response parsing in lib/ollama.ts so different Ollama /api/chat shapes (message, choices, output, text/result/response) are handled. This prevents unhandled exceptions that caused HTTP 500 during analysis and redesign.
- Ensured Ai runtime status and redesign route use async diagnostics so Ollama reachability and installed model are reported. getAiRuntimeStatus now performs a lightweight /api/tags check and includes ollamaBaseUrl, reachability, modelName, and modelError in diagnostics.
- Unified provider configuration: /api/analyze and /api/redesign now respect AI_PROVIDER=ollama without requiring OPENAI_API_KEY. The redesign generator reuses the same Ollama client and model detection.
- Added clear, safe server-side error messages for unreachable Ollama, missing model, oversized images, and malformed AI responses.

Files changed
- lib/ollama.ts — response parsing and diagnostics improvements.
- lib/ai.ts — getAiRuntimeStatus turned async and now reports ollama diagnostics.
- app/api/analyze/route.ts — await getAiRuntimeStatus call.
- app/api/redesign/route.ts — await getAiRuntimeStatus call.
- context.md — updated details and Codespaces test steps.

Root causes discovered
1) lib/ollama.ts previously assumed a single rigid response shape and referenced a duplicated/undefined variable; when Ollama returned a different shape the function threw, causing HTTP 500. The response parsing is now robust across known shapes.
2) getAiRuntimeStatus previously returned diagnostic messages that could imply Ollama required OPENAI_API_KEY. The provider logic was clarified so Ollama is treated as configured when AI_PROVIDER=ollama.

What I tested here
- Static code inspection and focused TypeScript edits to ensure consistent async flow and robust parsing.
- Did not run the dev server or TypeScript checks in this environment per restrictions.

Exact manual tests to run in GitHub Codespaces (recommended)
1. Ensure Ollama is installed and running in the Codespace container:
   - ollama status
   - ollama pull gemma3
2. Set environment variables in Codespaces Secrets or shell:
   - AI_PROVIDER=ollama
   - AI_VISION_MODEL=gemma3
   - OLLAMA_BASE_URL=http://localhost:11434
   (Do NOT set OPENAI_API_KEY unless you intend to use OpenAI.)
3. Install and run the app:
   - npm install
   - npm run dev
4. In the web UI: upload a PNG/JPG screenshot (≤10MB) and click "Analyze".
   - If Ollama is reachable and gemma3 is installed, /api/analyze should return findings.
   - If not, the response will include a helpful diagnostics message (e.g. could not reach Ollama, model not installed, or malformed response).
5. After analysis, click "Generate redesign" — /api/redesign uses the same model and should return sanitized HTML/CSS inside the response.

If Ollama still returns HTTP 500
- Inspect server logs for the full /api/chat response body. The code now surfaces returned error text where possible; share that body if further fixes are needed.

Next steps I did not perform here
- Run npm run typecheck, npm run lint, and npm run build in Codespaces. Please run these and share any failures; I'll prepare follow-ups.
- Create a review branch and PR: I prepared minimal fixes here, but cannot push branches from this environment. Use the git commands below to create a branch and open a PR.

Git commands to create review branch and push
- git checkout -b fix/ollama-payload
- git add .
- git commit -m "fix(ollama): robust response parsing and diagnostics for Codespaces"
- git push origin fix/ollama-payload

Create a PR from the branch on GitHub and request review before merging.

Changed files in this patch
- lib/ollama.ts — made response parsing robust across Ollama versions and improved error messages.
- lib/ai.ts — getAiRuntimeStatus is now async and returns safe Ollama diagnostics; getAiConfig is async; added error classification and safer handling for Ollama vs OpenAI. Also renamed duplicate variables to avoid runtime crashes.
- lib/redesign.ts — now awaits getAiConfig and reuses Ollama client flow.
- app/api/analyze/route.ts — await runtime checks and config before running diagnosis; improved error responses.
- app/api/redesign/route.ts — ensure runtime status awaited and input validation; improved logging.
- app/api/status/route.ts — await getAiRuntimeStatus and include Ollama diagnostics in the response.
- components/AnalysisResultPanel.tsx — defensive fix for missing 'missing' array when showing configuration errors.

What I changed vs. what you still need to do in Codespaces
- I could not run npm scripts or contact Ollama from this environment. I made only code changes that are safe and minimal.
- In your GitHub Codespace (where Ollama and gemma3:latest are installed) run the following tests and report results back so I can follow up:
  1. npm install
  2. npm run typecheck
  3. npm run lint
  4. npm run dev
  5. Open the app, upload a PNG/JPG screenshot (≤10MB), click Analyze, then Generate Redesign.

If any of the server routes return errors, copy server logs (especially any /api/chat response body) and share them — I can patch parsing or prompts further.

Notes on safety
- No secrets were committed.
- AI-generated HTML is sanitized server-side and displayed inside a sandboxed iframe with no scripts.

If you want, I can prepare a single patch file you can apply locally or provide the exact git commands to create a review branch and open a PR. I'm not able to create the PR from here.
Assumptions and security
- No secrets or API keys were added to the repo. Environment variables remain required in Codespaces.
- AI-generated HTML remains sanitized server-side and presented inside a sandboxed iframe on the client.

Contact
- After you run the Codespaces tests, share any server logs or error responses and I'll iterate quickly.