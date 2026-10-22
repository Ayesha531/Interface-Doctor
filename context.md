Project: Interface Doctor AI — Phase 1–4 context

Purpose and architecture
- Next.js + TypeScript + Tailwind frontend with server API routes under app/api.
- AI provider pluggable: supports Ollama (local, no API key) and OpenAI (requires OPENAI_API_KEY).
- Vision analysis (/api/analyze) and redesign generation (/api/redesign) call into lib/ai.ts and lib/ollama.ts.
- AI-generated HTML is sanitized server-side and rendered inside a sandboxed iframe on the client.

What I changed (Phase 1: Ollama HTTP 500 fix + basic screenshot analysis)
- lib/ollama.ts: hardened response parsing for /api/chat. Previously code assumed a single response shape and referenced a duplicated 'payload' variable; now we detect multiple possible shapes (message.content, choices[0].message.content, output[0].content, text/result/response) and return extracted JSON. This prevents unhandled exceptions that surfaced as HTTP 500.
- lib/ai.ts: clarified provider detection so Ollama is considered configured without an OpenAI key. Error classification for Ollama/network/provider remains. No OpenAI-only checks block Ollama flows.
- .env.example: updated earlier to explain Ollama settings (left intact; no secrets added).
- context.md: added this file describing current state and next steps.

Root causes found
1) lib/ollama.ts assumed a single rigid response shape and returned undefined content when Ollama returned a different field (some Ollama versions return 'output', 'text', or top-level fields). The code then threw, leading to HTTP 500 in /api/analyze.
2) Minor provider logic: Ai runtime detection treated missing OPENAI_API_KEY as an error for non-openai providers in messaging; clarified to ensure Ollama does not require an API key.

Files changed
- lib/ollama.ts (response parsing and error messaging hardened)
- lib/ai.ts (provider handling minor tweak)
- context.md (new)
- .env.example (no secrets; reviewed)

Testing performed here
- Static code inspection and lightweight TypeScript edits. I did not run the dev server or TypeScript checks in this environment.
- Did not attempt to call Ollama; per constraints, Ollama may not be reachable from this runner. The code now surfaces clear errors if Ollama is down or the model is missing.

Manual testing steps for GitHub Codespaces (exact commands)
1. Start Ollama in the Codespace/container and ensure gemma3 is installed:
   - ollama status
   - ollama pull gemma3
2. Set workspace secrets or environment variables in Codespaces:
   - AI_PROVIDER=ollama
   - AI_VISION_MODEL=gemma3
   - OLLAMA_BASE_URL=http://localhost:11434
   (Do NOT set OPENAI_API_KEY unless using OpenAI.)
3. In the repo: npm install
4. Start dev server: npm run dev
5. In the app UI: upload a PNG/JPG screenshot (<=10MB) and run "Analyze".
   - If Ollama is reachable and gemma3 is installed, analysis should return findings.
   - If not, the API response contains clear diagnostics: connection error, model not installed, or malformed response.
6. Generate redesign after analysis; the redesign endpoint uses the same Ollama client and will return sanitized HTML/CSS.

Remaining blockers and next steps
- I could not run typecheck, lint, or runtime tests in this environment. Please run:
  - npm run typecheck
  - npm run lint
  - npm run dev
  in your Codespace.
- If Ollama still returns HTTP 500 in your Codespace after these fixes, capture /api/chat response body (server logs) and share it — the code now surfaces the returned details.

Notes
- No API keys or secrets were added to the repo.
- AI outputs are not mocked; failures surface as errors.
- Image size limit enforced at 10 MB (base64 approx).
