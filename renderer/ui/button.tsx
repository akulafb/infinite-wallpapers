import type { ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./cn";

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-default items-center justify-center gap-1.5 font-medium whitespace-nowrap transition-[background-color,opacity,filter] outline-none select-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        filled: "bg-accent text-accent-contrast hover:brightness-110 active:brightness-95",
        accent: "bg-accent/15 text-accent hover:bg-accent/20 active:bg-accent/25",
        muted: "bg-foreground-5 text-foreground hover:bg-foreground-10 active:bg-foreground-15",
        glass:
          "rounded-full border border-field bg-surface text-foreground shadow-sm backdrop-blur-md hover:bg-foreground-5",
      },
      size: {
        small: "h-7 rounded-control px-2.5 text-[12px] [&_svg:not([class*='size-'])]:size-3.5",
        medium: "h-8 rounded-control px-3 text-[13px] [&_svg:not([class*='size-'])]:size-4",
        large: "h-9 rounded-control px-3.5 text-[13px] [&_svg:not([class*='size-'])]:size-4",
      },
      iconOnly: { true: "px-0", false: "" },
    },
    compoundVariants: [
      { iconOnly: true, size: "small", className: "w-7" },
      { iconOnly: true, size: "medium", className: "w-8" },
      { iconOnly: true, size: "large", className: "w-9" },
    ],
    defaultVariants: { variant: "muted", size: "medium", iconOnly: false },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, iconOnly, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size, iconOnly }), className)}
      {...props}
    />
  );
}
