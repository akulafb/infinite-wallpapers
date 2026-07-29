// Selectable theme tile used in the picker grid. No design-system "selectable
// card" primitive exists, so this is custom markup using semantic tokens.

import { Check, Loader2 } from "lucide-react";
import { Text } from "@glaze/core/components";
import { cn } from "@glaze/core/utils";

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
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      disabled={disabled}
      className={cn(
        "group relative flex flex-col items-start gap-2.5 rounded-card border p-3 text-left transition-colors",
        selected ? "border-accent bg-accent/10" : "border-field hover:bg-foreground-5",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-control",
          selected ? "bg-accent text-accent-contrast" : "bg-foreground-10 text-secondary",
        )}
      >
        {loading ? <Loader2 className="size-5 animate-spin" /> : <Icon className="size-5" />}
      </span>
      <Text variant="small-strong" truncate className="w-full">
        {preset.label}
      </Text>
      {selected && !loading && <Check className="absolute right-2 top-2 size-4 text-accent" />}
    </button>
  );
}
