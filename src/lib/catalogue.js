export async function searchCatalogue(query, page, signal) {
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
    throw failure;
  }
  if (!Array.isArray(data.results) || !Number.isInteger(data.count)) throw new Error("The search response couldn’t be read. Please try again.");
  return data;
}
