# Interface Doctor AI

**by Team DebugMD** — an AI-powered interface improvement tool. Upload a screenshot of a
website or app, and get an honest AI diagnosis of design problems with suggested fixes.

This repository currently contains **Phase 1**: the greenfield app scaffold with the branded
dashboard, validated drag-and-drop screenshot upload (plus a sample option), recent projects,
and the Analyze Interface flow that honestly reports when AI services are not configured
instead of fabricating findings.

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

**If no key is configured**, the upload/preview workflow still works end-to-end and the UI
clearly states that AI analysis requires configuration — no fake findings are ever shown.
When a key is present, the route performs a genuine OpenAI vision request and validates the
JSON response before displaying it. Rate limits, network failures and invalid responses are
surfaced as honest error messages.

## Data persistence

There is no database yet. "Recent projects" are stored in the browser's `localStorage`
(downscaled thumbnails only) and reset if storage is cleared. A later phase will move this
to a real database (it can be enabled from the workspace Database button).

## Structure

```
app/
  layout.tsx            Root layout + metadata
  page.tsx              Dashboard entry
  globals.css           Tailwind layers + focus styles
  api/analyze/route.ts  GET: AI config status · POST: validate + diagnose
components/
  Dashboard.tsx         Client-side state orchestration
  Sidebar.tsx, Logo.tsx, AiStatusBadge.tsx
  UploadDropzone.tsx    Drag-and-drop + file picker with validation
  ScreenshotPreview.tsx Preview, remove/replace, Analyze button
  AnalysisResultPanel.tsx Loading / unconfigured / error / findings states
  RecentProjects.tsx    localStorage-backed recent projects grid
lib/
  types.ts              Shared API/domain types
  ai.ts                 Server-side provider config + validated vision call
  uploadValidation.ts   PNG/JPG + 10 MB validation, byte formatting
  imageUtils.ts         File→preview, sample rasterization, thumbnails
  recentProjects.ts     localStorage store
public/
  sample-screenshot.svg Bundled sample UI screenshot (rasterized to PNG on use)
```

## What is intentionally not here yet (later phases)

- Issue markers drawn over the screenshot (Phase 2 returns `region` data ready for this)
- AI-generated redesign and before/after comparison (Phases 2–3)
- Measurable verification checks (Phase 4)
- Server-side project persistence (Phase 5)
