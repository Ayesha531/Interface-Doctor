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
The provider is configurable via environment variables (see `.env.example`):

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Vision AI key, read only on the server. Add it in the workspace **Secrets** panel. |
| `AI_PROVIDER` | Provider identifier (default `openai`) so future providers can be swapped in. |
| `AI_VISION_MODEL` | Vision model name (default `gpt-4o-mini`). |

**How secrets reach the app:**

1. Add `OPENAI_API_KEY` in the workspace **Secrets** panel.
2. **Restart the dev server** (`npm run dev`) after adding or changing a secret. Next.js reads
   environment variables at process startup, so a running server will not see new secrets until
   it is restarted.
3. The dashboard fetches `/api/status`, which inspects `process.env.OPENAI_API_KEY` inside the
   Node.js runtime and returns a safe diagnostic (key present/absent, never the value).

**Status badge meanings:**

- **AI engine ready** — the key is present and `AI_PROVIDER` is supported.
- **Key not found in server environment** — `OPENAI_API_KEY` is missing from the runtime.
  Restart the dev server if you already added the secret.
- **Key present but provider unsupported** — the key exists, but `AI_PROVIDER` is set to a
  provider that is not implemented. Set `AI_PROVIDER=openai`.

You can also verify the runtime status directly:

```bash
curl http://localhost:3000/api/status
```

The response only reports whether the key is present and whether the provider is supported;
the secret value is never returned.

**If no key is configured**, the upload/preview workflow still works end-to-end and the UI
clearly states that AI analysis requires configuration — no fake findings are ever shown.
When a key is present, the route performs a genuine OpenAI vision request and validates the
JSON response before displaying it. Rate limits, network failures and invalid responses are
surfaced as honest error messages.

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
configuration — no fabricated previews are shown.

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
