function wait(seconds, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException("Search cancelled", "AbortError")); return; }
    const cancel = () => { clearTimeout(timer); signal?.removeEventListener("abort", cancel); reject(new DOMException("Search cancelled", "AbortError")); };
    const timer = setTimeout(() => { signal?.removeEventListener("abort", cancel); resolve(); }, seconds * 1000);
    signal?.addEventListener("abort", cancel, { once: true });
  });
}

export async function searchCatalogue(query, page, signal, onRetry = () => {}) {
  // Retry once, after the server's full delay. Never spin or bypass provider pacing.
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(`/api/catalogue/search/?${new URLSearchParams({ q: query, page: String(page) })}`, {
      credentials: "same-origin", mode: "same-origin", cache: "no-store", headers: { Accept: "application/json" }, signal,
    });
    if (!(response.headers.get("content-type") || "").includes("application/json")) throw new Error("Album search is unavailable. Please try again shortly.");
    const data = await response.json();
    if (!response.ok) {
      const failure = new Error(data.error || "Couldn’t search for albums. Please try again.");
      failure.status = response.status;
      const delay = Number(response.headers.get("Retry-After"));
      failure.retryAfter = Number.isFinite(delay) ? Math.max(0, Math.min(60, delay)) : 0;
      if (attempt === 0 && response.status === 503 && failure.retryAfter > 0 && data.code !== "cache_unavailable") {
        onRetry(failure.retryAfter); await wait(failure.retryAfter, signal); onRetry(0); continue;
      }
      throw failure;
    }
    if (!Array.isArray(data.results) || !Number.isInteger(data.count)) throw new Error("The search response couldn’t be read. Please try again.");
    return data;
  }
}
