// Form controls: text inputs, switch, segmented control, radio group, fields.

import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { RadioGroup as RadioPrimitive, Switch as SwitchPrimitive, ToggleGroup } from "radix-ui";

import { cn } from "./cn";

const fieldClass =
  "w-full rounded-control border border-field bg-field px-2.5 text-[13px] text-foreground outline-none placeholder:text-tertiary focus:border-accent focus:ring-2 focus:ring-accent/30";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClass, "h-8", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldClass, "min-h-20 resize-none py-2", className)} {...props} />;
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="flex items-center gap-1.5 text-[13px]">{children}</label>;
}

export function Switch(props: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  "aria-label"?: string;
}) {
  return (
    <SwitchPrimitive.Root
      {...props}
      className="relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full bg-foreground-15 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/60 data-[state=checked]:bg-accent"
    >
      <SwitchPrimitive.Thumb className="block size-[18px] translate-x-[2px] rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px]" />
    </SwitchPrimitive.Root>
  );
}

export function SegmentedControl({
  value,
  onValueChange,
  size = "medium",
  children,
  "aria-label": ariaLabel,
}: {
  value: string;
  onValueChange: (value: string) => void;
  size?: "small" | "medium";
  children: ReactNode;
  "aria-label"?: string;
}) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      // Radix lets a single toggle group deselect; a segmented control can't.
      onValueChange={(next) => next && onValueChange(next)}
      aria-label={ariaLabel}
      data-size={size}
      className={cn(
        "group/segmented inline-flex rounded-control bg-foreground-5 p-0.5",
        size === "medium" && "w-full",
      )}
    >
      {children}
    </ToggleGroup.Root>
  );
}

export function SegmentedControlItem({ value, children }: { value: string; children: ReactNode }) {
  return (
    <ToggleGroup.Item
      value={value}
      className="flex-1 rounded-[6px] px-3 text-[12px] font-medium text-secondary transition-colors outline-none group-data-[size=medium]/segmented:h-7 group-data-[size=small]/segmented:h-6 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent/60 data-[state=on]:bg-surface-raised data-[state=on]:text-foreground data-[state=on]:shadow-sm"
    >
      {children}
    </ToggleGroup.Item>
  );
}

export function RadioGroup({
  value,
  onValueChange,
  children,
}: {
  value: string;
  onValueChange: (value: string) => void;
  orientation?: "horizontal" | "vertical";
  children: ReactNode;
}) {
  return (
    <RadioPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      orientation="horizontal"
      className="flex items-center gap-4"
    >
      {children}
    </RadioPrimitive.Root>
  );
}

export function RadioGroupItem({ value }: { value: string }) {
  return (
    <RadioPrimitive.Item
      value={value}
      className="flex size-4 items-center justify-center rounded-full border border-field bg-field outline-none focus-visible:ring-2 focus-visible:ring-accent/60 data-[state=checked]:border-accent data-[state=checked]:bg-accent"
    >
      <RadioPrimitive.Indicator className="size-1.5 rounded-full bg-white" />
    </RadioPrimitive.Item>
  );
}

export function FieldSet({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5 px-1">
        <legend className="text-[13px] font-semibold">{title}</legend>
        {description && <p className="text-[11px] text-tertiary">{description}</p>}
      </div>
      {children}
    </fieldset>
  );
}

export function FieldGroup({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y divide-field rounded-card border border-field bg-surface px-3">
      {children}
    </div>
  );
}

export function Field({
  orientation,
  label,
  description,
  children,
}: {
  orientation: "horizontal" | "vertical";
  label: string;
  description?: string;
  children: ReactNode;
}) {
  const text = (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[13px]">{label}</span>
      {description && <span className="text-[11px] text-tertiary">{description}</span>}
    </div>
  );
  return orientation === "horizontal" ? (
    <div className="flex items-center justify-between gap-4 py-2.5">
      {text}
      <div className="shrink-0">{children}</div>
    </div>
  ) : (
    <div className="flex flex-col gap-2 py-2.5">
      {text}
      {children}
    </div>
  );
}
