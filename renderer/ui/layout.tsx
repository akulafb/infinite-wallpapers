// Window chrome: a draggable header bar (clearing the macOS traffic lights)
// above a scrolling content area.

import type { ReactNode } from "react";
import { Toaster as SonnerToaster } from "sonner";

import { cn } from "./cn";

export { toast } from "sonner";

export function Toaster() {
  return <SonnerToaster position="bottom-center" theme="system" richColors />;
}

export function ScrollArea({
  className,
  title,
  subtitle,
  actions,
  toolbar,
  children,
}: {
  className?: string;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  const header =
    toolbar ??
    (title !== undefined && (
      <header className="drag-region flex h-13 shrink-0 items-center gap-3 pr-3 pl-20">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] leading-4 font-semibold">{title}</p>
          {subtitle && (
            <p className="truncate text-[11px] leading-4 text-tertiary tabular-nums">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
    ));
  return (
    <div className={cn("flex h-full flex-col", className)}>
      {header}
      <div className="min-h-0 flex-1 overflow-y-auto pt-2">{children}</div>
    </div>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <header className="drag-region flex h-13 shrink-0 items-center justify-center px-20">
      {children}
    </header>
  );
}

export function ToolbarContent({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-2">{children}</div>;
}

export function ToolbarTitle({ children }: { children: ReactNode }) {
  return <p className="text-[13px] font-semibold">{children}</p>;
}

export function ErrorBoundaryView({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <div className="drag-region fixed top-0 right-0 left-0 h-13" />
      <p className="text-[15px] font-semibold">Something went wrong</p>
      <p className="max-w-md text-[13px] text-secondary">{message}</p>
    </div>
  );
}
