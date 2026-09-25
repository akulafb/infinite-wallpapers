# Project Context

## Overview

- **App Name:** Infinite Wallpapers (bundle `CFBundleName`/`CFBundleDisplayName` both "Infinite Wallpapers")
- **Purpose:** Automatically rotates the macOS desktop wallpaper with real, high-res, non-AI, watermark-free images sourced from the web by theme.
- **Features:**
  - Preset theme picker (12 themes) + free-text custom description.
  - AI-assisted search: turns a description into a better web query (images stay real).
  - Change frequency: Hourly / Daily / Weekly / Manual.
  - Multi-source image search: Serper.dev (whole-web, needs user API key) + Wallhaven (free, no key).
  - Mature-content toggle (People + sketchy; no explicit NSFW).
  - Menu-bar (tray) app: keeps rotating after the window closes; Next / Pause / Resume / Open / Settings / Quit.
  - Current-wallpaper preview, Change now / Skip, recent history re-apply, next-change countdown.

## Current State

### Key files
- `main/index.ts` — registers `wallpaper://` privileged protocol (serves cached images), window sizing (780×760, min 480×560), starts scheduler + tray on ready, `window-all-closed` keeps app alive.
- `main/tray.ts` — menu-bar tray (stable GUID), SF Symbol `photo.on.rectangle.angled`; `createTray()`, `refreshTray()`.
- `main/handlers/wallpaper.ts` — all wallpaper IPC handlers; validates inputs, calls services, `refreshTray()` after mutations.
- `main/services/settings-store.ts` — atomic JSON config + safeStorage-encrypted Serper key in `userData/wallpaper-cycle/`; exports `WALLPAPERS_DIR`.
- `main/services/image-search.ts` — Serper + Wallhaven providers, merge/dedupe, **display-aware** resolution+aspect filter, stock/watermark domain blocklist, Wallhaven `ai_art_filter`. `displayAspect()` reads the primary display via the public `screen` export (60s memo, 16:9 fallback) and drives both `suitableForDisplay()` and the Wallhaven `ratios`/`atleast` params.
- `main/services/wallpaper-service.ts` — orchestrates search→pick(fresh)→download→set→record→broadcast; `applyNext`, `applyFromHistory`, `skipCurrent`, `previewCandidates`.
- `main/services/wallpaper-setter.ts` — sets wallpaper via `osascript` (System Events); `WallpaperPermissionError`; `checkAutomationPermission`.
- `main/services/wallpaper-download.ts` — downloads to `WALLPAPERS_DIR`, bounded cache (40 files), content-type/size validation.
- `main/services/rotation-scheduler.ts` — persisted `nextRunAt` is authoritative across restarts; `armFromPersisted()` (startup) catches up when overdue vs `reschedule()` (explicit user action) which restarts a full interval. 60s watchdog survives sleep/wake; `ticking` guard prevents overlap; timeout+interval both cleared on `before-quit`.
- `main/services/ai-query.ts` — `generateText(glaze("fast"))` refines description → query; falls back to raw text on any block.
- `renderer/main/home-view.tsx` — main UI (preview, theme grid, custom textarea, frequency, mature switch, history).
- `renderer/settings/settings-view.tsx` — appearance, Serper key input, AI/mature toggles, min-quality, Automation permission check.
- `renderer/lib/wallpaper-api.ts` + `wallpaper-types.ts` — typed IPC wrappers + `wallpaperUrl()`.
- `renderer/main/presets.ts` — default 12 `PRESETS` + ~37-entry `SHUFFLE_POOL` + `shuffleThemes(count, exclude)` (Fisher-Yates, biased away from currently visible ids) + `presetsFromIds(ids, count)` which rehydrates persisted ids, drops stale ones and backfills to a full grid.
- `renderer/components/theme-card.tsx` — selectable tile (unchanged by shuffle; keyed by whatever preset it's given).

### Components
`@glaze/core/components`: `ScrollArea` (title/subtitle/actions props drive the toolbar), `SegmentedControl` (frequency + min-quality), `Switch`, `Textarea`, `Input`, `Button` (single `accent` = "Change now"), `Badge`, `Callout` (permission + Serper-key notices), `EmptyState`, `Field/FieldSet/FieldGroup` (settings), `Text`, `RadioGroup` (theme appearance). Theme tiles are custom markup (no DS selectable-card) using `border-accent`/`bg-accent/10`/`text-accent-contrast`.

### Data & storage
- `userData/wallpaper-cycle/config.json` — `AppConfig` (theme, frequency, matureContent, aiAssist, minWidth, paused, current, history[30], blocked[], nextRunAt).
- `userData/wallpaper-cycle/serper-key.bin` — safeStorage-encrypted Serper API key.
- `userData/wallpaper-cycle/wallpapers/<uuid>.<ext>` — downloaded images, served via `wallpaper://img?file=<name>`.
- `userData/wallpaper-cycle/theme-thumbs.json` — cached preset→sample-thumbnail URL map (14-day TTL; misses retried).

### IPC channels
`config:get`→{config,hasSerperKey}; `theme:thumbnail`({presetId,query,category})→string|null; `theme:setPreset`(ThemeConfig)→AppConfig; `theme:setCustom`(string)→{config,aiBlocked?}; `settings:update`(patch)→AppConfig; `serper:setKey`(string)→bool; `serper:hasKey`→bool; `wallpaper:preview`→Candidate[]; `wallpaper:next`/`wallpaper:skip`→WallpaperRecord; `wallpaper:applyFromHistory`(id)→WallpaperRecord; `rotation:pause`/`resume`/`getState`→RotationState; `permissions:checkAutomation`→bool. Notifications: `wallpaper:changed`, `rotation:changed`.

### Integrations
- Serper.dev `POST https://google.serper.dev/images` (X-API-KEY) — whole-web images.
- Wallhaven `GET https://wallhaven.cc/api/v1/search` — free, no key.
- Glaze AI capability `ai` (grades `["fast"]`, optional) for query refinement only.

### Conventions & constraints
- Menu-bar app: `appConfig.macOS.activationPolicy: "accessory"` (no dock); reopen window from tray. Requires UpdateBundle after changing it.
- No native wallpaper API → `osascript`; first change triggers macOS Automation permission (surfaced via `WallpaperPermissionError` + orange Callout).
- AI is only called on explicit custom-theme submit (cached into theme), never during scheduled/background rotation, to avoid surprise consent prompts.
- Can't guarantee zero AI/watermarked images from open-web search — mitigated by domain blocklist + resolution/aspect filter + Wallhaven AI filter; "Skip" blocks a bad image.
- **CSP:** the `wallpaper:` scheme must be whitelisted in `img-src` (and `connect-src`) of the CSP meta in `main-window.html` AND `settings-window.html`, or `<img src="wallpaper://…">` silently fails to load (fetch still works). Both files edited.

## Recent History

### 2026-08-30 — Fix wallpaper change failure on generic content-type and query tag mismatch
- **Goal:** Users received "Error invoking remote method 'wallpaper:next': Error: Not an image (content-type: application/force-download)" when clicking "Change now" for custom themes.
- **What was done:**
  - `main/services/wallpaper-download.ts`: added `detectImageType()` buffer inspection checking JPEG/PNG/WebP magic bytes so valid images served with generic `application/force-download` or `application/octet-stream` headers are accepted and properly saved with their real extension.
  - `main/services/image-search.ts`: added `cleanWallhavenQuery()` to strip generic fluff keywords ("wallpaper", "high resolution", "4k", etc.) and progressive query attempts to `searchWallhaven()`, preventing Wallhaven from returning 0 candidates on multi-word custom descriptions.
  - `main/services/wallpaper-service.ts`: updated candidate ordering to prioritize fresh candidates while preserving seen candidates as fallbacks (preventing pool starvation when only 1 candidate was fresh), and increased retry attempts up to 12.
  - `renderer/lib/wallpaper-api.ts` & `renderer/main/home-view.tsx`: added `cleanErrorMessage()` to strip internal IPC prefix strings from user-facing error toasts.
- **Key decisions:** Rather than relying solely on HTTP `Content-Type` headers which image hosts and PHP download scripts often set to `application/force-download`, inspect the downloaded buffer's magic bytes. Combine this with query cleanup so Wallhaven remains a dependable source for custom themes.
- **UI elements:** Toast notification error messages now display clean, actionable descriptions.
- **Backend elements:** Image format detection from buffer, resilient multi-candidate retry loop, Wallhaven query normalization.

### 2026-08-21 — Cross-window settings sync
- **Goal:** Changing a setting in the Settings window left the main window showing a stale value (and vice versa) — the last known bug before publishing a public update.
- **What was done:** Added `broadcastConfig()` in `main/handlers/wallpaper.ts`, which pushes the full `ConfigResult` on `config:changed` after `settings:update` and `serper:setKey`. Both windows now subscribe via a new `wallpaperApi.onConfigChanged()` and apply it with `queryClient.setQueryData()` — main window into `["config"]`, Settings into `["settings-config"]`.
- **Key decisions:** Followed the App Guide's "Settings Convention & Cross-Window Sync" pattern (broadcast + `setQueryData`) rather than inventing one. Broadcast the whole `ConfigResult`, not just the changed field, because `hasSerperKey` was stale too — saving a Serper key in Settings left the main window still showing the "Add a Serper API key" callout. Theme mutations (`theme:setPreset`/`setCustom`) deliberately do **not** broadcast: only the main window renders the theme and it already updates its own cache, so broadcasting there would risk racing its in-flight `next()` refetch.
- **UI elements:** main-window mature-content switch + frequency control + Serper callout; Settings switches and min-quality control.
- **Backend elements:** ipc broadcast on `config:changed`.
- **Corrections/Lessons Learned:** The preload bridge types `onNotification` params as `unknown` and is **not** generic — only the SDK's `ipcRenderer` accepts a type argument. `ipc().onNotification<T>(...)` fails with TS2558; narrow inside the callback in the API wrapper instead. Also note `npm run format` reflows multi-line conditions, so anchoring edits on previously single-line statements breaks.
- **User Frustrations & Important Remarks:** User reviewed the pre-publish checklist and explicitly chose to keep `matureContent: true` as the default for the public release.

### 2026-08-21 — Fix cache prune deleting live history images
- **Goal:** The Recent strip rendered broken tiles; startup logged `[protocol] Protocol handler failed ENOENT` for 6 cached wallpapers.
- **What was done:** `pruneCache()` no longer takes an optional `keepFiles` parameter — it derives the protected set (current + all history files) from `settingsStore` itself. Added `settingsStore.reconcileHistory()`, called once from `main/index.ts` after `load()`, which drops config references to images no longer on disk.
- **Key decisions:** Protection is now *intrinsic* rather than opt-in. The old signature `pruneCache(keepFiles: string[] = [])` meant callers had to remember; `wallpaper-service.applyNext()` passed the history list but the `downloadImage()` call site omitted it, so every download could delete images that history still pointed at. Making the function self-sufficient removes the footgun instead of just fixing the one bad call. Verified `settings-store.ts` does not import `wallpaper-download.ts`, so the added import introduces no cycle.
- **UI elements:** Recent strip (no longer shows broken tiles).
- **Backend elements:** download cache prune, settings store.
- **Corrections/Lessons Learned:** An optional parameter guarding data integrity is a latent bug — one forgetful caller is enough. Prefer deriving the invariant inside the function. Confirmed on real data at runtime: history 30 → 25, missing files 5 → 0, and `[settings] Dropped config references to missing wallpaper files {"removedFromHistory":5,"clearedCurrent":false}`.

### 2026-08-21 — Rename, rotation catch-up, ultrawide, persistent shuffle
- **Goal:** Four fixes: adopt the "Infinite Wallpapers" name in all user-facing copy, make missed rotations catch up, serve ultrawide displays correctly, and persist the shuffled theme grid.
- **What was done:**
  - **Rename:** every user-facing string and comment moved from "Wallpaper Cycle" to "Infinite Wallpapers" across 10 files; outbound `User-Agent` is now `InfiniteWallpapers/1.0`.
  - **Rotation catch-up:** `rotation-scheduler.ts` now treats persisted `nextRunAt` as the source of truth on launch — overdue rotations fire immediately, future ones arm for the *remaining* time instead of resetting. Added a 60s watchdog for sleep/wake drift and a `ticking` re-entrancy guard.
  - **Ultrawide:** candidate filtering and the Wallhaven `ratios`/`atleast` params derive from the primary display's real aspect ratio. 32:9 images were previously rejected outright by a hard `<= 2.5` cap.
  - **Shuffle persistence:** grid survives relaunch via id-only `localStorage` (`infiniteWallpapers.themeGrid.v1`) with stale-id backfill.
- **Key decisions:**
  - The `userData/wallpaper-cycle/` directory and `package.json` `appId` were deliberately **left unrenamed** — changing either would orphan every existing user's config, encrypted Serper key, history and cached wallpapers. The rename is presentation-only.
  - Ultrawide was fixed display-*aware* rather than by widening the band for everyone; naively adding `32x9` would have pushed super-ultrawide images at 16:9 users — the same bug in reverse.
  - The startup catch-up is intentionally **not awaited**: `start()` runs before the window is created, so awaiting a network fetch + download would stall launch.
  - One catch-up rotation per overdue window, not one per missed interval (rotating 7 times after a week away would be user-hostile).
  - Shuffle persistence stayed frontend-only (no IPC, no `AppConfig` field) per the "default to frontend-only" rule.
- **UI elements:** theme grid (now persistent), all app-name copy, permission callout.
- **Backend elements:** rotation scheduler, image search / display detection.
- **Corrections/Lessons Learned:** `npm run format` reflows `renderer/preload.ts` and split an `if (` across lines, detaching an `// eslint-disable-next-line no-undef` from the `process.env` reference it guarded — which broke lint in a file nobody edited. Fixed by hoisting the flag to its own `const` so the disable stays attached; `format` is now idempotent.
- **User Frustrations & Important Remarks:** `npm run launch` fails with `App not found: wallpaper-cycle-local-aqiba2xv` — the Glaze host's `apps` registry is empty and the id is absent from `glaze.db`, so the installed bundle at `/Applications/Glaze/Infinite Wallpapers.app` is not registered with the running host and still carries the 2026-08-17 build. Source build is green and published to `../runtime/build`; re-registering the app in Glaze is required before runtime behaviour can be confirmed.

### 2026-07-29 — Shuffle themes button
- **Goal:** Delighter feature — a button to randomly refresh the theme grid with unpredictable options, from generic ("Landscapes") to ultra-specific ("Monet's Last Works", "Naruto Anime", "90s Batman Comics").
- **What was done:** Grew `presets.ts` with a ~37-entry `SHUFFLE_POOL` (art movements, franchises, eras, niche aesthetics) alongside the original 12 `PRESETS`. Added `shuffleThemes(count, exclude)` — Fisher-Yates over the combined pool, excluding the currently visible ids when possible so each shuffle feels fresh. `HomeView` now holds `visiblePresets` state (starts as `PRESETS`) and a `Shuffle` button (icon spins briefly on click) in the Theme section header, added via a new `actions` prop on the local `Section` component.
- **Key decisions:** Frontend-only — no backend/IPC needed, since existing `theme:thumbnail` caching is already keyed by preset id and works for any id in the pool. Grid state is ephemeral (resets to default 12 on relaunch), not persisted — matches "delighter" framing, avoids extra storage.
- **UI elements:** shuffle button (Section header action), theme grid (now stateful).
- **Backend elements:** none.
- **Corrections/Lessons Learned:** Reused the existing per-id thumbnail cache/IPC unchanged — any preset id, old or new, just works as long as it's unique.

### 2026-07-29 — Theme picker gallery + layout polish
- **Goal:** User wanted real sample thumbnails on theme tiles and general UI polish.
- **What was done:** Theme cards are now image tiles showing a live Wallhaven sample photo per preset (label + icon over a bottom scrim; accent ring + check when selected). Added `main/services/theme-thumbnails.ts` (persistent cache `theme-thumbs.json`, misses always retried) + `theme:thumbnail` IPC + `wallhavenThumbnail()` (SFW, progressive-simpler-query fallback) in `image-search.ts`. Frontend `ThemeCard` fetches its own thumbnail via React Query (staleTime Infinity). Polished `Section` (optional description), grid gap.
- **Key decisions:** Thumbnails come from Wallhaven only (free, no Serper spend) and SFW regardless of mature toggle; cached on disk so the picker is instant/free after first load.
- **UI elements:** theme gallery tiles, section descriptions.
- **Backend elements:** ipc_handler, external_api (Wallhaven), local cache file.
- **Corrections/Lessons Learned:** Multi-word Wallhaven queries can return 0 results → fall back to last-2-words then last word; don't cache empty thumbnail results (retry next load).
- **User Frustrations & Important Remarks:** User picked "Real theme thumbnails" + "Layout & polish"; declined the bigger-hero and bigger-history options for now.

### 2026-07-29 — Fix broken wallpaper preview & Recent thumbnails (CSP)
- **Goal:** Preview image and Recent history strip showed nothing.
- **What was done:** Added `wallpaper:` to `img-src` and `connect-src` in the CSP meta of `main-window.html` and `settings-window.html`.
- **Key decisions:** Root cause was CSP blocking the custom scheme for `<img>` (fetch of the same URL returned 200/JPEG); the protocol/download/setter were all working. Whitelisting the app's own local-image scheme is the correct minimal fix.
- **UI elements:** current-wallpaper preview, Recent strip.
- **Corrections/Lessons Learned:** `<img>` with a custom privileged scheme needs that scheme in CSP `img-src`; a working `fetch()` to the same URL does not prove `<img>` will load it. Verify local-image rendering with `img.naturalWidth`, not just protocol fetch.
- **User Frustrations & Important Remarks:** User also noted the UI needs improvement generally (not yet scoped).

### 2026-07-29 — Initial build of Wallpaper Cycle
- **Goal:** Build a theme-based automatic desktop wallpaper rotator sourcing real, non-AI, watermark-free web images.
- **What was done:** Full backend (settings/safeStorage, multi-source search, AI query refinement, osascript setter, download cache, rotation scheduler, tray, `wallpaper://` protocol, IPC) + full renderer (theme grid, custom description, frequency, mature toggle, preview, history, settings). Menu-bar accessory app.
- **Key decisions:** Serper.dev (whole web, user key) + Wallhaven (no key); mature content on by default; AI refines query only on explicit submit; single-timer scheduler; images served via custom protocol.
- **UI elements:** ScrollArea toolbar, selectable theme card grid, segmented controls, switches, textarea, callouts, empty state, history strip.
- **Backend elements:** local_storage (JSON), safeStorage secret, external_api (Serper/Wallhaven), child_process (osascript), ipc_handlers, tray, protocol handler, scheduler.
- **Corrections/Lessons Learned:** ESLint `no-undef` flags `React.ReactNode` — import `type { ReactNode }` instead.
- **User Frustrations & Important Remarks:** User explicitly wanted "the entire web" (not one source) and gave a "girls in bikinis" example → mature content enabled by default; strict no-AI / no-watermark requirement drove filtering + honest limitations.
