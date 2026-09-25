# Project History

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
