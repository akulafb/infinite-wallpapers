# Wallpaper Cycle — Implementation Plan

## Context

The user wants a macOS app that automatically rotates their desktop wallpaper. They pick a
theme — either from a preset list or a free-text natural-language description — and a change
frequency (hourly / daily / weekly). The app sources **real, high-resolution, watermark-free,
non-AI** images from the web and sets them as the desktop wallpaper on schedule, continuing in
the background from the menu bar.

Confirmed decisions:
- **Web-wide search via Serper.dev** (real Google Images results across the whole web) as the
  primary engine, plus **Wallhaven** as a no-key supplement. Multi-provider design.
- **Mature content ON** by default (Wallhaven People + "sketchy" purity; Serper safe-search
  relaxed). Full explicit NSFW is out of scope. Toggleable in Settings.
- **AI-assisted search**: the app's built-in AI turns a description into good search keywords +
  category hints. AI only refines the *query* — images are always real from the web.
- **Menu-bar app**: rotation continues after the window closes, as long as the app runs.

### Feasibility notes (from exploration)
- No native wallpaper API exists → set wallpaper by shelling out to `osascript` via
  `child_process.execFile` (allowed; not a forbidden import). First set triggers a macOS
  Automation (System Events) permission prompt — must be surfaced gracefully.
- `Tray`, `protocol`, `safeStorage`, `app.getPath`, backend `fetch` are all available.
- Serve downloaded local images to the renderer via a custom privileged `wallpaper://` protocol
  (not base64-over-IPC, not `file://`).

### Honest limitations to communicate
- Open-web search can surface AI-generated or watermarked images. Mitigations: min-resolution
  filter, landscape aspect preference, safe-search, a stock/watermark-domain blocklist
  (shutterstock, gettyimages, alamy, istockphoto, dreamstime, depositphotos, 123rf…), and
  excluding Wallhaven's AI-art category. Cannot be a 100% guarantee → in-app "Skip / block this
  image" lets the user reject a bad result so it won't reappear.

## Architecture

Frontend picks theme + frequency and shows previews/history. All web calls, downloads,
scheduling, and wallpaper-setting live in the **backend** (must persist across window close).

### Backend (`main/`)
- `services/settings-store.ts` — JSON config in `app.getPath("userData")/config.json`:
  `{ theme, frequency, matureContent, aiAssist, minResolution, paused, current, history[] }`.
  Serper API key stored **encrypted via `safeStorage`** in a separate file.
- `services/ai-query.ts` — `generateText` (glaze-ai) turns a NL description into
  `{ keywords, category, sfwHint }` JSON. Falls back to raw text on any blocked/unavailable AI
  state.
- `services/image-search.ts` — provider interface `search(query, opts) => Candidate[]`.
  Providers: **Serper** (`POST https://google.serper.dev/images`, `X-API-KEY` header) and
  **Wallhaven** (`GET api/v1/search`, `categories`/`purity`/`atleast=1920x1080`/`ratios=16x9,16x10`,
  `ai_art_filter`). Merge + dedupe + apply resolution/aspect/domain-blocklist/history filters.
- `services/wallpaper-download.ts` — download chosen image to
  `userData/wallpapers/<uuid>.<ext>`, validate content-type + real dimensions, bounded cache
  (max count + TTL cleanup on `before-quit`).
- `services/wallpaper-setter.ts` — `execFile("osascript", ["-e", script], { timeout, maxBuffer })`
  setting picture for every desktop; unique filenames to bust macOS caching; detect/report TCC
  denial.
- `services/rotation-scheduler.ts` — chained `setTimeout` for hourly/daily/weekly; pause/resume;
  picks next non-repeating candidate; on tick: search → pick → download → set → update current +
  history → broadcast. `clearTimeout` in `app.on("before-quit")`.
- Tray in `main/tray.ts` — stable GUID literal, retina icon (SF Symbol / nativeImage reps).
  Menu: current theme (sublabel), **Next wallpaper**, **Pause/Resume**, **Open window**,
  **Settings…**, **Quit**.
- Protocol: register `wallpaper://` privileged scheme early (before window load) and
  `protocol.handle` serving files under the `wallpapers/` root with path-traversal guards.
- IPC handlers (`main/handlers/`): `config:get/set`, `serper:setKey/hasKey`,
  `wallpaper:preview` (candidate metadata + remote thumb URLs), `wallpaper:applyNow`,
  `wallpaper:next`, `rotation:pause/resume/getState`, `wallpaper:getCurrent/getHistory`,
  `permissions:checkAutomation`; notifications `wallpaper:changed`, `rotation:state`.

### Frontend (`renderer/`)
- `main/home-view.tsx` — single scrollable pane (`ScrollArea` + `Toolbar`):
  - **Current wallpaper** preview card (local `wallpaper://` image), theme label, countdown to
    next change, **Change now / Skip** buttons.
  - **Theme picker** grid (~12 selectable preset cards: Star Wars, Gaming, Nature & Landscapes,
    Space & Galaxies, Anime, Minimal & Abstract, Cyberpunk/Neon, Cars, Cityscapes, Animals &
    Wildlife, Fantasy Art, Mountains & Oceans). Icon/gradient cards + live preview on select.
  - **Custom description** textarea + "Use this theme" (AI-refined).
  - **Frequency** selector (`RadioGroup`/segmented: Hourly / Daily / Weekly / Manual).
  - **Mature content** toggle (default on).
  - **History** strip with re-apply.
- Toolbar actions: Next, Pause/Resume.
- `settings/settings-view.tsx` — masked **Serper API key** input + save, AI-assist toggle,
  mature-content toggle, min-resolution preference, cache size, Automation-permission status +
  helper text.
- Use `glaze-component-patterns` / `glaze-component-docs-reader` to pick exact card / segmented /
  input / switch components before coding.

### Config / lifecycle (`package.json`, `main/index.ts`)
- Add `glaze.capabilities.ai` (for AI query refinement).
- Add `appConfig.macOS.activationPolicy: "accessory"` (menu-bar app); reopen the main window from
  the tray. Run **UpdateBundle** after this change.
- `window-all-closed`: do nothing (keep app alive for background rotation).
- Window sizing via `glaze-window-sizing` (settings+preview utility ≈ 760×760, min ≈ 480×560).

## Skills to load during implementation
`glaze-backend-rules`, `glaze-backend-performance` (child_process/osascript, timers, IPC payloads),
`glaze-external-api` (Serper/Wallhaven + safeStorage key), `glaze-ai`, `glaze-protocol-large-files`,
`glaze-app-lifecycle` + `glaze-browser-window-recipes` (tray/accessory/window), `glaze-data-storage`,
`glaze-frontend-rules`, `glaze-component-patterns`, `glaze-window-sizing`, `glaze-theming`.

## Files
- New: `main/services/{settings-store,ai-query,image-search,wallpaper-download,wallpaper-setter,rotation-scheduler}.ts`, `main/tray.ts`, `main/protocol.ts`, `renderer/components/*` (theme card, etc.).
- Modify: `main/index.ts` (tray, protocol, lifecycle, sizing), `main/handlers/index.ts` (+ new handler modules), `renderer/main/home-view.tsx`, `renderer/settings/settings-view.tsx`, `renderer/preload.ts` (expose new IPC + protocol usage), `package.json` (capabilities + appConfig).

## Verification (end-to-end)
1. `BuildApp` (lint + type-check + build) green; `UpdateBundle` after `appConfig` change.
2. Launch. Enter a Serper key in Settings; confirm it persists (encrypted) and `serper:hasKey` true.
3. Select "Star Wars" + Hourly → **Change now**: candidates return, one downloads, and the macOS
   desktop wallpaper actually changes (accept the first-time Automation prompt). Verify via the
   running app's current-wallpaper preview (served over `wallpaper://`).
4. Test a custom description (e.g. "girls in bikinis playing chess") with mature content on →
   returns relevant real images; AI-refined keywords produce sensible results.
5. **Next** and **Pause/Resume** work from both the window and the tray menu; countdown updates.
6. Close the main window → app stays in the menu bar and a scheduled rotation still fires.
7. "Skip/block" a result → it does not reappear.
8. Confirm no watermarked stock-preview domains slip through the blocklist on a few searches.
