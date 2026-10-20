import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Check, Loader2, Pause, Play, RefreshCw, Settings, Shuffle, Wand2, X } from "lucide-react";
import {
  Badge,
  Button,
  Callout,
  EmptyState,
  ScrollArea,
  SegmentedControl,
  SegmentedControlItem,
  Switch,
  Text,
  Textarea,
  toast,
} from "../ui";

import {
  cleanErrorMessage,
  isPermissionError,
  wallpaperApi,
  wallpaperUrl,
} from "../lib/wallpaper-api";
import type { Frequency, StagedPreview, ThemeConfig } from "../lib/wallpaper-types";
import { PRESETS, presetsFromIds, shuffleThemes, type Preset } from "./presets";
import { ThemeCard } from "../components/theme-card";

const THEME_GRID_KEY = "infiniteWallpapers.themeGrid.v1";
const THEME_GRID_SIZE = 12;

// The shuffled grid is a renderer-local preference, so it lives in localStorage
// rather than the backend config. Only ids are stored — a `Preset` carries an
// `Icon` component reference that can't be serialised. Every access is guarded
// because storage can be unavailable or throw, and that must never stop the
// grid from rendering.
function loadThemeGrid(): Preset[] {
  try {
    const raw = window.localStorage.getItem(THEME_GRID_KEY);
    if (!raw) return PRESETS;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return PRESETS;
    const ids = parsed.filter((entry): entry is string => typeof entry === "string");
    if (ids.length === 0) return PRESETS;
    // Stale ids are dropped and backfilled, so the grid stays full.
    return presetsFromIds(ids, THEME_GRID_SIZE);
  } catch {
    // Corrupt JSON or blocked storage — fall back to the default grid.
    return PRESETS;
  }
}

function saveThemeGrid(presets: readonly Preset[]): void {
  try {
    window.localStorage.setItem(THEME_GRID_KEY, JSON.stringify(presets.map((preset) => preset.id)));
  } catch {
    // Persistence is best-effort; a failed write must not break shuffling.
  }
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "any moment now";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function Section({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <Text variant="strong" as="h2">
            {title}
          </Text>
          {description && (
            <Text variant="mini" color="tertiary">
              {description}
            </Text>
          )}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function HomeView() {
  const qc = useQueryClient();
  const [description, setDescription] = useState("");
  const [permissionError, setPermissionError] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  // Lazy initialiser so the persisted grid is restored on the first render.
  const [visiblePresets, setVisiblePresets] = useState<Preset[]>(loadThemeGrid);
  const [isShuffling, setIsShuffling] = useState(false);

  // Staged preview candidate (LIN-83 flow): preview before applying to desktop.
  const [stagedPreview, setStagedPreview] = useState<StagedPreview | null>(null);
  const [seenUrls, setSeenUrls] = useState<string[]>([]);

  const shuffleGrid = () => {
    const next = shuffleThemes(
      THEME_GRID_SIZE,
      visiblePresets.map((p) => p.id),
    );
    setVisiblePresets(next);
    saveThemeGrid(next);
    setIsShuffling(true);
    window.setTimeout(() => setIsShuffling(false), 400);
  };

  const { data, isLoading } = useQuery({ queryKey: ["config"], queryFn: wallpaperApi.getConfig });

  // Live-update countdown once per second.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Refetch when the backend changes the wallpaper or rotation state (also fires
  // for background / tray-driven changes).
  useEffect(() => {
    const off1 = wallpaperApi.onWallpaperChanged(() =>
      qc.invalidateQueries({ queryKey: ["config"] }),
    );
    const off2 = wallpaperApi.onRotationChanged(() =>
      qc.invalidateQueries({ queryKey: ["config"] }),
    );
    // Settings is a separate window with its own React tree, so changes made
    // there arrive as a push rather than through this window's own mutations.
    const off3 = wallpaperApi.onConfigChanged((next) => qc.setQueryData(["config"], next));
    return () => {
      off1();
      off2();
      off3();
    };
  }, [qc]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["config"] });
  const onApplyError = (error: unknown) => {
    if (isPermissionError(error)) setPermissionError(true);
    toast.error(cleanErrorMessage(error));
  };

  const cancelPreview = () => {
    setStagedPreview(null);
    setSeenUrls([]);
    void wallpaperApi.clearStaged();
  };

  // Stage a preset wallpaper for preview without applying to desktop.
  const stagePreset = useMutation({
    mutationFn: async (preset: Preset) => {
      const theme: ThemeConfig = {
        id: preset.id,
        label: preset.label,
        query: preset.query,
        kind: "preset",
        category: preset.category,
      };
      return wallpaperApi.stageTheme(theme);
    },
    onSuccess: (preview) => {
      setPermissionError(false);
      setStagedPreview(preview);
      setSeenUrls([preview.imageUrl]);
    },
    onError: onApplyError,
  });

  // Stage a custom description wallpaper for preview without applying to desktop.
  const stageCustom = useMutation({
    mutationFn: async (desc: string) => {
      const query = desc.trim();
      const theme: ThemeConfig = {
        id: `custom-${Date.now()}`,
        label: query.slice(0, 60),
        query,
        kind: "custom",
        category: "web",
      };
      return wallpaperApi.stageTheme(theme);
    },
    onSuccess: (preview) => {
      setPermissionError(false);
      setStagedPreview(preview);
      setSeenUrls([preview.imageUrl]);
      setDescription("");
    },
    onError: onApplyError,
  });

  // Fetch and stage another candidate for the currently staged theme.
  const refreshPreview = useMutation({
    mutationFn: async () => {
      if (!stagedPreview) return null;
      return wallpaperApi.stageTheme(stagedPreview.theme, seenUrls);
    },
    onSuccess: (preview) => {
      if (!preview) return;
      setPermissionError(false);
      setStagedPreview(preview);
      setSeenUrls((prev) => [...prev, preview.imageUrl]);
    },
    onError: onApplyError,
  });

  // Apply the staged candidate to macOS desktop.
  const applyStaged = useMutation({
    mutationFn: async () => {
      if (!stagedPreview) return null;
      return wallpaperApi.applyStaged(stagedPreview);
    },
    onSuccess: () => {
      setPermissionError(false);
      setStagedPreview(null);
      setSeenUrls([]);
      invalidate();
      toast.success("Applied as macOS desktop wallpaper");
    },
    onError: onApplyError,
  });

  const nextWallpaper = useMutation({
    mutationFn: () => wallpaperApi.next(),
    onSuccess: () => {
      cancelPreview();
      setPermissionError(false);
      invalidate();
    },
    onError: onApplyError,
  });

  const skipWallpaper = useMutation({
    mutationFn: () => wallpaperApi.skip(),
    onSuccess: () => {
      cancelPreview();
      setPermissionError(false);
      invalidate();
    },
    onError: onApplyError,
  });

  const applyHistory = useMutation({
    mutationFn: (id: string) => wallpaperApi.applyFromHistory(id),
    onSuccess: () => {
      cancelPreview();
      setPermissionError(false);
      invalidate();
    },
    onError: onApplyError,
  });

  const togglePause = useMutation({
    mutationFn: (paused: boolean) => (paused ? wallpaperApi.resume() : wallpaperApi.pause()),
    onSuccess: invalidate,
  });

  const setFrequency = useMutation({
    mutationFn: (frequency: Frequency) => wallpaperApi.updateSettings({ frequency }),
    onSuccess: invalidate,
  });

  const setMature = useMutation({
    mutationFn: (matureContent: boolean) => wallpaperApi.updateSettings({ matureContent }),
    onSuccess: invalidate,
  });

  const config = data?.config;
  const isBusy =
    stagePreset.isPending ||
    stageCustom.isPending ||
    refreshPreview.isPending ||
    applyStaged.isPending ||
    nextWallpaper.isPending ||
    skipWallpaper.isPending ||
    applyHistory.isPending;

  const statusText = !config
    ? ""
    : config.paused
      ? "Rotation paused"
      : config.frequency === "manual"
        ? "Manual mode"
        : config.nextRunAt
          ? `Next change in ${formatRemaining(config.nextRunAt - now)}`
          : `Changes ${config.frequency}`;

  const activeThemeId = stagedPreview ? stagedPreview.theme.id : config?.theme.id;

  const headerTitle = stagedPreview
    ? `${stagedPreview.theme.label} (Preview)`
    : (config?.theme.label ?? "Infinite Wallpapers");

  const headerSubtitle = stagedPreview
    ? "Previewing candidate — tap Apply to set as desktop"
    : statusText;

  return (
    <ScrollArea
      className="h-full"
      title={headerTitle}
      subtitle={headerSubtitle}
      actions={
        <>
          <Button
            variant="glass"
            size="large"
            iconOnly
            aria-label={config?.paused ? "Resume rotation" : "Pause rotation"}
            disabled={!config || togglePause.isPending}
            onClick={() => config && togglePause.mutate(config.paused)}
          >
            {config?.paused ? <Play /> : <Pause />}
          </Button>
          <Button
            variant="glass"
            size="large"
            iconOnly
            aria-label="Open settings"
            onClick={() => void wallpaperApi.openSettings()}
          >
            <Settings />
          </Button>
        </>
      }
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-7 px-4 pb-10">
        {/* Hero Card: Staged Preview or Current Wallpaper */}
        {isLoading || !config ? (
          <div className="aspect-video w-full animate-pulse rounded-card bg-foreground-5" />
        ) : stagedPreview ? (
          <div className="overflow-hidden rounded-card border-2 border-accent/70 shadow-lg">
            <div className="relative aspect-video w-full bg-foreground-5">
              <img
                src={wallpaperUrl(stagedPreview.file)}
                alt={stagedPreview.theme.label}
                className="h-full w-full object-cover"
              />
              <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                <Badge color="primary">Preview</Badge>
                <Badge>{stagedPreview.theme.label}</Badge>
                {stagedPreview.width > 0 && (
                  <Badge>
                    {stagedPreview.width}×{stagedPreview.height}
                  </Badge>
                )}
              </div>
              <button
                type="button"
                onClick={cancelPreview}
                disabled={isBusy}
                aria-label="Cancel preview"
                className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-opacity hover:bg-black/80 disabled:opacity-50"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 p-3 bg-card">
              <div className="min-w-0">
                <Text variant="small-strong" truncate>
                  {stagedPreview.theme.label}
                </Text>
                <Text variant="mini" color="tertiary">
                  Source: {stagedPreview.provider} • Not yet applied as desktop
                </Text>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="muted"
                  size="small"
                  disabled={isBusy}
                  onClick={cancelPreview}
                >
                  Cancel
                </Button>
                <Button
                  variant="muted"
                  size="small"
                  disabled={isBusy}
                  onClick={() => refreshPreview.mutate()}
                >
                  {refreshPreview.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  Try another
                </Button>
                <Button
                  variant="accent"
                  size="small"
                  disabled={isBusy}
                  onClick={() => applyStaged.mutate()}
                >
                  {applyStaged.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Apply
                </Button>
              </div>
            </div>
          </div>
        ) : config.current ? (
          <div className="overflow-hidden rounded-card border border-field">
            <div className="relative aspect-video w-full bg-foreground-5">
              <img
                src={wallpaperUrl(config.current.file)}
                alt={config.current.themeLabel}
                className="h-full w-full object-cover"
              />
              <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                <Badge color="primary">{config.current.themeLabel}</Badge>
                {config.current.width > 0 && (
                  <Badge>
                    {config.current.width}×{config.current.height}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <Text variant="small-strong" truncate className="tabular-nums">
                  {statusText}
                </Text>
                <Text variant="mini" color="tertiary">
                  Source: {config.current.provider}
                </Text>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="muted"
                  size="small"
                  disabled={isBusy}
                  onClick={() => skipWallpaper.mutate()}
                >
                  {skipWallpaper.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Ban className="size-4" />
                  )}
                  Skip & block
                </Button>
                <Button
                  variant="accent"
                  size="small"
                  disabled={isBusy}
                  onClick={() => nextWallpaper.mutate()}
                >
                  {nextWallpaper.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  Change now
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative rounded-card border border-field p-6">
            <EmptyState
              title="No wallpaper yet"
              description="Pick a theme below or describe what you want. The app finds a real one on the web so you can preview and apply it."
            />
          </div>
        )}

        {permissionError && (
          <Callout color="orange">
            Infinite Wallpapers needs Automation permission to change your desktop. Open System
            Settings › Privacy & Security › Automation, enable “System Events” for this app, then
            try again.
          </Callout>
        )}

        {config && !data?.hasSerperKey && (
          <Callout
            color="blue"
            actions={
              <Button variant="muted" size="small" onClick={() => void wallpaperApi.openSettings()}>
                Open Settings
              </Button>
            }
          >
            Add a Serper API key in Settings to search the entire web. Without it, wallpapers come
            from Wallhaven only.
          </Callout>
        )}

        {/* Theme picker */}
        <Section
          title="Theme"
          description="Tap a theme to preview wallpapers."
          actions={
            <Button variant="muted" size="small" onClick={shuffleGrid}>
              <Shuffle className={`size-4 ${isShuffling ? "animate-spin" : ""}`} />
              Shuffle
            </Button>
          }
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {visiblePresets.map((preset) => (
              <ThemeCard
                key={preset.id}
                preset={preset}
                selected={activeThemeId === preset.id}
                loading={stagePreset.isPending && stagePreset.variables?.id === preset.id}
                disabled={isBusy}
                onSelect={() => stagePreset.mutate(preset)}
              />
            ))}
          </div>
        </Section>

        {/* Custom description */}
        <Section
          title="Describe your own"
          description="Type anything — franchises, games, or a specific scene."
        >
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. cozy autumn forest at golden hour, cinematic and moody"
          />
          <div className="flex items-center justify-between gap-3">
            <Text variant="mini" color="tertiary" className="min-w-0">
              Searched as typed. Images are always real, never AI-generated.
            </Text>
            <Button
              variant="filled"
              size="small"
              className="shrink-0"
              disabled={!description.trim() || isBusy}
              onClick={() => stageCustom.mutate(description)}
            >
              {stageCustom.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Wand2 className="size-4" />
              )}
              Preview wallpaper
            </Button>
          </div>
        </Section>

        {/* Frequency */}
        <Section title="Change frequency">
          <SegmentedControl
            value={config?.frequency ?? "daily"}
            onValueChange={(value: string) => setFrequency.mutate(value as Frequency)}
            aria-label="How often to change the wallpaper"
          >
            <SegmentedControlItem value="hourly">Hourly</SegmentedControlItem>
            <SegmentedControlItem value="daily">Daily</SegmentedControlItem>
            <SegmentedControlItem value="weekly">Weekly</SegmentedControlItem>
            <SegmentedControlItem value="manual">Manual</SegmentedControlItem>
          </SegmentedControl>
        </Section>

        {/* Mature content */}
        <div className="flex items-center justify-between gap-3 rounded-card border border-field px-3 py-2.5">
          <div className="min-w-0">
            <Text variant="small-strong">Include mature content</Text>
            <Text variant="mini" color="tertiary">
              Adds People and swimwear-level results. No explicit content.
            </Text>
          </div>
          <Switch
            checked={config?.matureContent ?? true}
            onCheckedChange={(value) => setMature.mutate(value)}
            aria-label="Include mature content"
          />
        </div>

        {/* History */}
        {config && config.history.length > 0 && (
          <Section title="Recent">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {config.history.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => {
                    cancelPreview();
                    applyHistory.mutate(record.id);
                  }}
                  disabled={isBusy}
                  title={record.themeLabel}
                  className="shrink-0 overflow-hidden rounded-control border border-field transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  <img
                    src={wallpaperUrl(record.file)}
                    alt={record.themeLabel}
                    className="h-16 w-28 object-cover"
                  />
                </button>
              ))}
            </div>
          </Section>
        )}
      </div>
    </ScrollArea>
  );
}
