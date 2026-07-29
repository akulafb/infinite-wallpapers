import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Loader2, Pause, Play, RefreshCw, Settings, Wand2 } from "lucide-react";
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
} from "@glaze/core/components";

import { isPermissionError, wallpaperApi, wallpaperUrl } from "../lib/wallpaper-api";
import type { Frequency } from "../lib/wallpaper-types";
import { PRESETS, type Preset } from "./presets";
import { ThemeCard } from "../components/theme-card";

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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <Text variant="strong" as="h2">
        {title}
      </Text>
      {children}
    </section>
  );
}

export function HomeView() {
  const qc = useQueryClient();
  const [description, setDescription] = useState("");
  const [permissionError, setPermissionError] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const { data, isLoading } = useQuery({ queryKey: ["config"], queryFn: wallpaperApi.getConfig });

  // Live-update countdown once per second.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Refetch when the backend changes the wallpaper or rotation state (also fires
  // for background / tray-driven changes).
  useEffect(() => {
    const off1 = wallpaperApi.onWallpaperChanged(() => qc.invalidateQueries({ queryKey: ["config"] }));
    const off2 = wallpaperApi.onRotationChanged(() => qc.invalidateQueries({ queryKey: ["config"] }));
    return () => {
      off1();
      off2();
    };
  }, [qc]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["config"] });
  const onApplyError = (error: unknown) => {
    if (isPermissionError(error)) setPermissionError(true);
    toast.error(error instanceof Error ? error.message : "Something went wrong applying the wallpaper.");
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
      const { aiBlocked } = await wallpaperApi.setCustom(desc);
      await wallpaperApi.next();
      return aiBlocked;
    },
    onSuccess: (aiBlocked) => {
      setPermissionError(false);
      setDescription("");
      invalidate();
      if (aiBlocked) toast.message("AI wasn't available, so your text was searched as-is.");
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
      title={config?.theme.label ?? "Wallpaper Cycle"}
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
                <Button variant="muted" size="small" disabled={isApplying} onClick={() => skipWallpaper.mutate()}>
                  {skipWallpaper.isPending ? <Loader2 className="size-4 animate-spin" /> : <Ban className="size-4" />}
                  Skip
                </Button>
                <Button variant="accent" size="small" disabled={isApplying} onClick={() => nextWallpaper.mutate()}>
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
              placement="inline"
              title="No wallpaper yet"
              description="Pick a theme below or describe what you want — Wallpaper Cycle will find a real one from the web and set it as your desktop."
            />
          </div>
        )}

        {permissionError && (
          <Callout color="orange">
            Wallpaper Cycle needs Automation permission to change your desktop. Open System Settings › Privacy &
            Security › Automation, enable “System Events” for this app, then try again.
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
            Add a Serper API key in Settings to search the entire web. Without it, wallpapers come from Wallhaven only.
          </Callout>
        )}

        {/* Theme picker */}
        <Section title="Theme">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {PRESETS.map((preset) => (
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
        <Section title="Describe your own">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. cozy autumn forest at golden hour, cinematic and moody"
          />
          <div className="flex items-center justify-between gap-3">
            <Text variant="mini" color="tertiary" className="min-w-0">
              {config?.aiAssist
                ? "AI turns your words into a better web search. Images are always real, never AI-generated."
                : "Searched exactly as typed."}
            </Text>
            <Button
              variant="filled"
              size="small"
              className="shrink-0"
              disabled={!description.trim() || isApplying}
              onClick={() => applyCustom.mutate(description)}
            >
              {applyCustom.isPending ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
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
                  <img src={wallpaperUrl(record.file)} alt={record.themeLabel} className="h-16 w-28 object-cover" />
                </button>
              ))}
            </div>
          </Section>
        )}
      </div>
    </ScrollArea>
  );
}
