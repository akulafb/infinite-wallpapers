import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Field,
  FieldGroup,
  FieldSet,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  ScrollArea,
  SegmentedControl,
  SegmentedControlItem,
  Switch,
  Text,
  Toolbar,
  ToolbarContent,
  ToolbarTitle,
  toast,
} from "../ui";

import { wallpaperApi } from "../lib/wallpaper-api";
import type { ThemeSource } from "../lib/wallpaper-types";

type AutoStatus = "unknown" | "granted" | "needed";

export function SettingsView() {
  const qc = useQueryClient();
  const [keyInput, setKeyInput] = useState("");
  const [autoStatus, setAutoStatus] = useState<AutoStatus>("unknown");

  const { data } = useQuery({ queryKey: ["settings-config"], queryFn: wallpaperApi.getConfig });
  const config = data?.config;
  const invalidate = () => qc.invalidateQueries({ queryKey: ["settings-config"] });

  // Close settings window on Escape unless an input/popover is focused.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const el = document.activeElement;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement ||
        (el instanceof HTMLElement && el.isContentEditable)
      ) {
        return;
      }
      if (document.querySelector("[data-radix-popper-content-wrapper]")) return;
      event.preventDefault();
      void wallpaperApi.closeSettings();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Frequency and mature content are also editable in the main window, so mirror
  // pushes from the backend instead of rendering a stale copy.
  useEffect(
    () => wallpaperApi.onConfigChanged((next) => qc.setQueryData(["settings-config"], next)),
    [qc],
  );

  const setAppearance = useMutation({
    mutationFn: (source: ThemeSource) => wallpaperApi.setAppearance(source),
    onSuccess: invalidate,
    onError: (error) => toast.error(`Failed to set theme: ${error}`),
  });

  const saveKey = useMutation({
    mutationFn: () => wallpaperApi.setSerperKey(keyInput),
    onSuccess: () => {
      setKeyInput("");
      invalidate();
      toast.success("API key saved.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to save key."),
  });

  const updateSetting = useMutation({
    mutationFn: (patch: Parameters<typeof wallpaperApi.updateSettings>[0]) =>
      wallpaperApi.updateSettings(patch),
    onSuccess: invalidate,
  });

  const checkAutomation = useMutation({
    mutationFn: () => wallpaperApi.checkAutomation(),
    onSuccess: (granted) => setAutoStatus(granted ? "granted" : "needed"),
  });

  return (
    <ScrollArea
      toolbar={
        <Toolbar>
          <ToolbarContent>
            <ToolbarTitle>Settings</ToolbarTitle>
          </ToolbarContent>
        </Toolbar>
      }
    >
      <div className="mb-8 flex flex-col gap-8 px-4">
        <FieldSet title="Appearance">
          <FieldGroup>
            <Field orientation="horizontal" label="Theme">
              <RadioGroup
                value={config?.themeSource ?? "system"}
                onValueChange={(value) => setAppearance.mutate(value as ThemeSource)}
                orientation="horizontal"
              >
                <Label>
                  <RadioGroupItem value="system" /> Auto
                </Label>
                <Label>
                  <RadioGroupItem value="light" /> Light
                </Label>
                <Label>
                  <RadioGroupItem value="dark" /> Dark
                </Label>
              </RadioGroup>
            </Field>
          </FieldGroup>
        </FieldSet>

        <FieldSet
          title="Web search"
          description="A free Serper.dev API key unlocks whole-web image search."
        >
          <FieldGroup>
            <Field
              orientation="vertical"
              label="Serper API key"
              description={
                data?.hasSerperKey
                  ? "A key is saved and in use."
                  : "Get a free key at serper.dev, then paste it here."
              }
            >
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder={
                    data?.hasSerperKey ? "•••••••• (saved)" : "Paste your Serper API key"
                  }
                  className="flex-1"
                  autoComplete="off"
                />
                <Button
                  variant="filled"
                  size="medium"
                  className="shrink-0"
                  disabled={!keyInput.trim() || saveKey.isPending}
                  onClick={() => saveKey.mutate()}
                >
                  Save
                </Button>
              </div>
            </Field>
          </FieldGroup>
        </FieldSet>

        <FieldSet title="Search preferences">
          <FieldGroup>
            <Field
              orientation="horizontal"
              label="Include mature content"
              description="Adds People and swimwear-level results. No explicit content."
            >
              <Switch
                checked={config?.matureContent ?? true}
                onCheckedChange={(v) => updateSetting.mutate({ matureContent: v })}
                aria-label="Include mature content"
              />
            </Field>
            <Field orientation="horizontal" label="Minimum quality">
              <SegmentedControl
                value={String(config?.minWidth ?? 1920)}
                onValueChange={(v: string) => updateSetting.mutate({ minWidth: Number(v) })}
                aria-label="Minimum wallpaper quality"
                size="small"
              >
                <SegmentedControlItem value="1920">1080p</SegmentedControlItem>
                <SegmentedControlItem value="2560">1440p</SegmentedControlItem>
                <SegmentedControlItem value="3840">4K</SegmentedControlItem>
              </SegmentedControl>
            </Field>
          </FieldGroup>
        </FieldSet>

        <FieldSet
          title="Permissions"
          description="macOS asks for Automation access the first time the wallpaper changes."
        >
          <FieldGroup>
            <Field
              orientation="horizontal"
              label="Change the desktop wallpaper"
              description="System Settings › Privacy & Security › Automation"
            >
              <div className="flex items-center gap-2">
                {autoStatus === "granted" && <Badge color="green">Granted</Badge>}
                {autoStatus === "needed" && <Badge color="orange">Needed</Badge>}
                <Button
                  variant="muted"
                  size="small"
                  disabled={checkAutomation.isPending}
                  onClick={() => checkAutomation.mutate()}
                >
                  Check
                </Button>
              </div>
            </Field>
          </FieldGroup>
        </FieldSet>

        <Text variant="mini" color="tertiary">
          Infinite Wallpapers finds real photos from the web and never generates images. Sources are
          filtered to avoid watermarked stock previews, but results come from the open web.
        </Text>
      </div>
    </ScrollArea>
  );
}
