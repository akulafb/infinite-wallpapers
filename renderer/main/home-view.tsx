import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Loader2, Pause, Play, RefreshCw, Settings, Shuffle, Wand2 } from "lucide-react";
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
import type { Frequency } from "../lib/wallpaper-types";
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

  const selectPreset = useMutation({
    mutationFn: async (preset: Preset) => {
      await wallpaperApi.setPreset({
        id: preset.id,
        label: preset.label,
        query: preset.query,
        kind: "preset",
        category: preset.category,
      });
      return wallpaperApi.next();
    },
    onSuccess: () => {
      setPermissionError(false);
      invalidate();
    },
    onError: onApplyError,
  });

  const applyCustom = useMutation({
    mutationFn: async (desc: string) => {
      await wallpaperApi.setCustom(desc);
      return wallpaperApi.next();
    },
    onSuccess: () => {
      setPermissionError(false);
      setDescription("");
      invalidate();
    },
    onError: onApplyError,
  });

  const nextWallpaper = useMutation({
    mutationFn: () => wallpaperApi.next(),
    onSuccess: () => {
      setPermissionError(false);
      invalidate();
    },
    onError: onApplyError,
  });

  const skipWallpaper = useMutation({
    mutationFn: () => wallpaperApi.skip(),
    onSuccess: () => {
      setPermissionError(false);
      invalidate();
    },
    onError: onApplyError,
  });

  const applyHistory = useMutation({
    mutationFn: (id: string) => wallpaperApi.applyFromHistory(id),
    onSuccess: () => {
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
  const isApplying =
    selectPreset.isPending ||
    applyCustom.isPending ||
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

  return (
    <ScrollArea
      className="h-full"
      title={config?.theme.label ?? "Infinite Wallpapers"}
      subtitle={statusText}
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
        {/* Current wallpaper */}
        {isLoading || !config ? (
          <div className="aspect-video w-full animate-pulse rounded-card bg-foreground-5" />
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
                  disabled={isApplying}
                  onClick={() => skipWallpaper.mutate()}
                >
                  {skipWallpaper.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Ban className="size-4" />
                  )}
                  Skip
                </Button>
                <Button
                  variant="accent"
                  size="small"
                  disabled={isApplying}
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
              description="Pick a theme below or describe what you want — Infinite Wallpapers will find a real one from the web and set it as your desktop."
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
          description="Tap a theme to switch your wallpaper instantly."
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
                selected={config?.theme.id === preset.id}
                loading={selectPreset.isPending && selectPreset.variables?.id === preset.id}
                disabled={isApplying}
                onSelect={() => selectPreset.mutate(preset)}
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
              disabled={!description.trim() || isApplying}
              onClick={() => applyCustom.mutate(description)}
            >
              {applyCustom.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Wand2 className="size-4" />
              )}
              Use description
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
                  onClick={() => applyHistory.mutate(record.id)}
                  disabled={isApplying}
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
