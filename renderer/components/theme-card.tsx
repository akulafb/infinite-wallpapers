// Selectable theme tile: a live sample image with the label overlaid. No
// design-system selectable-image-card exists, so this is custom markup using
// semantic tokens (white label text is intentional over the photo scrim).

import { useQuery } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import { cn } from "../ui/cn";

import { wallpaperApi } from "../lib/wallpaper-api";
import type { Preset } from "../main/presets";

interface ThemeCardProps {
  preset: Preset;
  selected: boolean;
  loading: boolean;
  disabled: boolean;
  onSelect: () => void;
}

export function ThemeCard({ preset, selected, loading, disabled, onSelect }: ThemeCardProps) {
  const Icon = preset.Icon;
  const { data: thumb } = useQuery({
    queryKey: ["theme-thumb", preset.id],
    queryFn: () => wallpaperApi.getThemeThumbnail(preset.id, preset.query, preset.category),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      disabled={disabled}
      className={cn(
        "group relative aspect-[4/3] overflow-hidden rounded-card border transition-all",
        selected ? "border-accent ring-2 ring-accent" : "border-field hover:brightness-105",
        disabled && !loading && "cursor-not-allowed opacity-70",
      )}
    >
      {thumb ? (
        <img
          src={thumb}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-foreground-5 text-secondary">
          <Icon className="size-6" />
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-2.5 pb-2 pt-7">
        <Icon className="size-3.5 shrink-0 text-white/80" />
        <span className="truncate text-small-strong text-white">{preset.label}</span>
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/45">
          <Loader2 className="size-6 animate-spin text-white" />
        </div>
      )}

      {selected && !loading && (
        <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-accent text-accent-contrast shadow">
          <Check className="size-3.5" />
        </span>
      )}
    </button>
  );
}
