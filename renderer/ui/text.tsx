import type { ElementType, ReactNode } from "react";

import { cn } from "./cn";

const variants = {
  default: "text-[13px] leading-[18px]",
  strong: "text-[15px] leading-5 font-semibold",
  "small-strong": "text-[13px] leading-[18px] font-semibold",
  mini: "text-[11px] leading-[15px]",
} as const;

const colors = {
  primary: "text-foreground",
  secondary: "text-secondary",
  tertiary: "text-tertiary",
} as const;

interface TextProps {
  variant?: keyof typeof variants;
  color?: keyof typeof colors;
  as?: ElementType;
  truncate?: boolean;
  className?: string;
  children?: ReactNode;
}

export function Text({
  variant = "default",
  color = "primary",
  as: Component = "p",
  truncate,
  className,
  children,
}: TextProps) {
  return (
    <Component className={cn(variants[variant], colors[color], truncate && "truncate", className)}>
      {children}
    </Component>
  );
}
