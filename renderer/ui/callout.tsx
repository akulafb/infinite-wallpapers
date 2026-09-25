import type { ReactNode } from "react";

import { cn } from "./cn";

const colors = {
  blue: "border-blue-500/25 bg-blue-500/10",
  orange: "border-orange-500/30 bg-orange-500/10",
} as const;

export function Callout({
  color,
  actions,
  children,
}: {
  color: keyof typeof colors;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-card border px-3 py-2.5 text-[13px] leading-[18px]",
        colors[color],
      )}
    >
      <div className="min-w-0">{children}</div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <p className="text-[15px] font-semibold">{title}</p>
      {description && <p className="max-w-md text-[13px] text-secondary">{description}</p>}
    </div>
  );
}
