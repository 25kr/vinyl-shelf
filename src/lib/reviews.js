import { authRequest } from "./auth";

export async function reviewRequest(path = "", method = "GET", payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const headers = { Accept: "application/json" };
    if (method !== "GET") {
      const session = await authRequest("session");
      headers["X-CSRFToken"] = session.csrfToken;
      headers["Content-Type"] = "application/json";
    }
    const response = await fetch(`/api/reviews/${path}`, {
      method, headers, credentials: "same-origin", mode: "same-origin", cache: "no-store",
      signal: controller.signal, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    });
    if (!(response.headers.get("content-type") || "").includes("application/json")) throw new Error("Could not reach the reviews service. Please try again.");
    const data = await response.json();
    if (!response.ok) {
      const details = data.fields ? Object.values(data.fields).flat().map(item => item.message).join(" ") : "";
      const error = new Error(details || data.error || "Could not save your review. Please try again.");
      error.status = response.status;
      throw error;
    }
    return data;
  } catch (error) {
    if (error.name === "AbortError" || error instanceof TypeError) throw new Error("Could not reach the reviews service. Your form has been kept; please try again.");
    throw error;
  } finally { clearTimeout(timer); }
}
