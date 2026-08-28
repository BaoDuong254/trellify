const RELOAD_FLAG = "chunk-reload-attempted";
const CACHE_BUST_PARAM = "v";

const stripCacheBustParam = (): void => {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(CACHE_BUST_PARAM)) return;

  url.searchParams.delete(CACHE_BUST_PARAM);
  window.history.replaceState(window.history.state, "", url.toString());
};

export const reloadOnStalePreload = (): void => {
  stripCacheBustParam();

  window.addEventListener("vite:preloadError", (event) => {
    try {
      if (sessionStorage.getItem(RELOAD_FLAG)) return;
      sessionStorage.setItem(RELOAD_FLAG, "1");
    } catch {
      return;
    }

    event.preventDefault();

    const url = new URL(window.location.href);
    url.searchParams.set(CACHE_BUST_PARAM, Date.now().toString(36));
    window.location.replace(url.toString());
  });
};
