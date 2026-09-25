// Keep the .dark class on <html> in sync with the effective appearance. The
// main process sets nativeTheme.themeSource, which drives prefers-color-scheme.

export function syncAppearance(): void {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  const apply = () => document.documentElement.classList.toggle("dark", query.matches);
  apply();
  query.addEventListener("change", apply);
}
