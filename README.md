# Interface Doctor AI

**by Team DebugMD** — an AI-powered interface improvement tool. Upload a screenshot of a
website or app, get an honest AI diagnosis of design problems, generate a safe responsive
redesign, and compare the original and improved versions with an interactive slider.

This repository currently contains **Phase 4**: AI-generated responsive webpage redesign
previews rendered safely inside sandboxed iframes, plus a visual before-and-after
comparison. Phase 3's accurate runtime detection of the `OPENAI_API_KEY` secret and Phase 2's
real AI-powered vision diagnosis with prioritized findings, category filters, confidence
levels, and clickable screenshot issue markers are preserved and extended.

## Stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** for styling
- Server-side API route (`app/api/analyze/route.ts`) for AI access — keys never reach the browser

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL. Other scripts:

```bash
npm run lint        # ESLint (next/core-web-vitals)
npm run typecheck   # tsc --noEmit
npm run build       # production build
```

## AI configuration

The Analyze Interface button posts the screenshot to `/api/analyze` (server-side).
The Generate Redesign button posts to `/api/redesign`. Both routes run on the server,
so API keys and Ollama URLs never reach the browser.

The provider is configurable via environment variables (see `.env.example`):

| Variable | Purpose |
|----------|---------|
| `AI_PROVIDER` | AI engine to use. Default `ollama`; set to `openai` to use OpenAI. |
| `OLLAMA_BASE_URL` | Local Ollama endpoint. Default `http://localhost:11434`. In GitHub Codespaces this refers to the Codespace/container environment, not your personal computer. |
| `AI_VISION_MODEL` | Model used for analysis and redesign. Default `gemma3` for Ollama; must be installed and support image inputs. |
| `OPENAI_API_KEY` | Required only when `AI_PROVIDER=openai`. Add it in the workspace **Secrets** panel. |

**How environment variables reach the app:**

1. Add variables in the workspace **Secrets** panel (or use `.env.example` as a reference for a local `.env` file).
2. **Restart the dev server** (`npm run dev`) after adding or changing a secret. Next.js reads
   environment variables at process startup, so a running server will not see new secrets until
   it is restarted.
3. The dashboard fetches `/api/status`, which inspects the server environment and optionally
   probes Ollama `/api/tags`. It returns safe diagnostics only; the secret value is never exposed.

**Status badge meanings:**

- **AI engine ready** — the provider is supported and (for Ollama) the service is reachable and the model is installed.
- **Ollama unreachable** — `AI_PROVIDER=ollama` is set, but the server cannot reach Ollama at `OLLAMA_BASE_URL`.
- **Model missing** — Ollama is reachable, but the configured `AI_VISION_MODEL` is not installed.
- **Key not found in server environment** — `AI_PROVIDER=openai` but `OPENAI_API_KEY` is missing.
- **Provider unsupported** — `AI_PROVIDER` is set to a value that is not implemented.

You can also verify the runtime status directly:

```bash
curl http://localhost:3000/api/status
```

The response reports configuration, Ollama reachability, and model availability;
the secret value is never returned.

### Ollama setup in GitHub Codespaces

1. Install Ollama in the Codespace if it is not already present:
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```
2. Start the Ollama service in the background:
   ```bash
   ollama serve &
   ```
3. Pull a vision-capable model. The default is `gemma3`, but any Ollama model
   that supports images works (e.g. `llava`, `llama3.2-vision`):
   ```bash
   ollama pull gemma3
   ```
4. Verify the model is installed and Ollama is reachable from the same container:
   ```bash
   curl http://localhost:11434/api/tags
   ```
5. Add the environment variables in the workspace **Secrets** panel (or create a
   local `.env` file from `.env.example`):
   ```bash
   AI_PROVIDER=ollama
   OLLAMA_BASE_URL=http://localhost:11434
   AI_VISION_MODEL=gemma3
   ```
6. **Restart the Next.js dev server** (`npm run dev`) after changing secrets so
   the server reads the new values.

`localhost:11434` refers to the Codespace/container environment, not your personal
computer, because both Ollama and the dev server run inside the same Codespace.

### Troubleshooting Ollama

If analysis or redesign fails with an Ollama error:

1. Check the server-side status badge or call `curl http://localhost:3000/api/status`.
   It reports whether the provider is configured, Ollama is reachable, and the model is installed.
2. Verify the exact model name Ollama knows about:
   ```bash
   curl http://localhost:11434/api/tags | jq '.models[].name'
   ```
   The server uses the exact installed name (e.g. `gemma3:latest`) in `/api/chat` requests.
3. Make sure the model supports image inputs. The default `gemma3` is multimodal; plain text
   models will fail when a screenshot is supplied.
4. Restart the Next.js dev server after changing environment variables.

**If no AI service is reachable**, the upload/preview workflow still works end-to-end and the UI
clearly explains the issue — no fake findings or redesigns are ever shown. Rate limits, network
failures, missing models, invalid request formats, and malformed responses are surfaced as honest
error messages.

## Responsive redesign and before/after comparison

After diagnosis, click **Generate Redesign** to ask the AI for an improved, responsive
webpage preview based on the screenshot and the diagnosed issues.

- The request goes to `/api/redesign`, which validates the screenshot and forwards it to
  the vision model with a structured prompt.
- The AI returns HTML, CSS, a description, and a list of improvements. The server validates
  the JSON shape and sanitizes the output:
  - `<script>` tags, inline event handlers, `javascript:` URLs, and `<iframe>`/`<embed>`/
    `<object>` tags are removed.
  - CSS `@import`, `expression()`, and closing `</style>` markers are removed.
- The result is rendered in `SafeHtmlPreview` using an iframe with an empty `sandbox`
  attribute and a strict Content Security Policy. No JavaScript can execute.
- `BeforeAfterComparison` overlays the original screenshot on the redesign preview with a
draggable slider so you can compare them interactively.

If no AI key is configured, the UI clearly explains that redesign generation requires
configuration — no fabricated previews are shown. For Ollama, no OPENAI_API_KEY is required; ensure OLLAMA_BASE_URL and AI_VISION_MODEL are set and the model is pulled.

## Data persistence

There is no database yet. "Recent projects" are stored in the browser's `localStorage`
(downscaled thumbnails only) and reset if storage is cleared. A later phase will move this
to a real database (it can be enabled from the workspace Database button).

## Structure

```
app/
  layout.tsx             Root layout + metadata
  page.tsx               Dashboard entry
  globals.css            Tailwind layers + focus styles
  api/analyze/route.ts   GET: AI config status · POST: validate + diagnose
  api/redesign/route.ts  POST: validate + generate safe responsive redesign
  api/status/route.ts    GET: safe runtime AI-status diagnostics
components/
  Dashboard.tsx                 Client-side state orchestration
  Sidebar.tsx, Logo.tsx, AiStatusBadge.tsx
  UploadDropzone.tsx            Drag-and-drop + file picker with validation
  ScreenshotPreview.tsx         Preview, remove/replace, Analyze button
  ScreenshotAnnotator.tsx       Issue markers overlaid on the screenshot
  AnalysisResultPanel.tsx       Loading / unconfigured / error / findings + filters
  RedesignPanel.tsx             Generate redesign + results + tab switcher
  SafeHtmlPreview.tsx           Sandboxed iframe preview of AI-generated HTML/CSS
  BeforeAfterComparison.tsx     Interactive before/after slider
  RecentProjects.tsx            localStorage-backed recent projects grid
lib/
  types.ts                   Shared API/domain types (findings, categories, regions, redesign)
  ai.ts                      Server-side provider config + validated vision call
  ollama.ts                  Shared Ollama connectivity, model checks, and chat helpers
  jsonExtraction.ts          Robust JSON extraction from Markdown-fenced AI responses
  redesign.ts                Server-side AI redesign generation + HTML/CSS sanitization
  geometry.ts                Map fractional regions to rendered screenshot pixels
  uploadValidation.ts        PNG/JPG + 10 MB validation, byte formatting
  imageUtils.ts              File→preview, sample rasterization, thumbnails
  recentProjects.ts          localStorage store
public/
  sample-screenshot.svg Bundled sample UI screenshot (rasterized to PNG on use)
```

## What is intentionally not here yet (later phases)

- Measurable verification checks (Phase 5)
- Server-side project persistence (Phase 6)
- Comprehensive agent documentation (Phase 7)
