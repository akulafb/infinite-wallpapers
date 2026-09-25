import { Outlet } from "@tanstack/react-router";

export function RootView() {
  return (
    <div className="h-full">
      <Outlet />
    </div>
  );
}
