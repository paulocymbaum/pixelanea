const OPEN_QUERY_PARAM = "open";

/** Bundle path passed by the desktop shell on first launch (`?open=…`). */
export function readStartupOpenPath(): string | null {
  const value = new URLSearchParams(window.location.search).get(OPEN_QUERY_PARAM);
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Remove the startup open query param so refresh does not reopen the bundle. */
export function clearStartupOpenPathFromUrl(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(OPEN_QUERY_PARAM)) {
    return;
  }
  url.searchParams.delete(OPEN_QUERY_PARAM);
  const search = url.searchParams.toString();
  const next = search.length > 0 ? `${url.pathname}?${search}${url.hash}` : `${url.pathname}${url.hash}`;
  window.history.replaceState(null, "", next);
}

export type PixelaneaShellWindow = Window & {
  __pixelaneaOpenProject?: (path: string) => void;
};
