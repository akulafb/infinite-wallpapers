import type { ReactNode } from "react";

import { cn } from "./cn";

const colors = {
  default: "bg-black/55 text-white backdrop-blur-md",
  primary: "bg-accent text-accent-contrast",
  green: "bg-green-500/15 text-green-700 dark:text-green-400",
  orange: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
} as const;

export function Badge({
  color = "default",
  children,
}: {
  color?: keyof typeof colors;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium tabular-nums",
        colors[color],
      )}
    >
      {children}
    </span>
  );
}
