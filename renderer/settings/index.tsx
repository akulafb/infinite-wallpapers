import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { SettingsView } from "./settings-view";
import { syncAppearance } from "../lib/appearance";
import { Toaster } from "../ui";
import "../styles.css";

syncAppearance();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SettingsView />
      <Toaster />
    </QueryClientProvider>
  </React.StrictMode>,
);
