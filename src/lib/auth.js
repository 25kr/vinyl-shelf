const enabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_BACKEND === "true";
export const authEnabled = enabled;

export async function authRequest(endpoint, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`/api/auth/${endpoint}/`, {
      ...options, credentials: "same-origin", mode: "same-origin", cache: "no-store", signal: controller.signal,
      headers: { Accept: "application/json", ...options.headers },
    });
    const type = response.headers.get("content-type") || "";
    if (!type.includes("application/json")) throw new Error("Sign-in is unavailable right now. Please try again.");
    const data = await response.json();
    if (!response.ok) {
      const failure = new Error(data.error || "Account service is unavailable right now. Please try again.");
      failure.fields = data.fields || {};
      throw failure;
    }
    return data;
  } catch (error) {
    if (error.name === "AbortError" || error instanceof TypeError) {
      throw new Error("Could not reach the sign-in service. Please try again.");
    }
    throw error;
  } finally { clearTimeout(timeout); }
}

export async function authMutation(endpoint, data = {}) {
  // Refresh before each write; Django rotates CSRF tokens after logging in.
  const session = await authRequest("session");
  return authRequest(endpoint, {
    method: "POST", headers: { "Content-Type": "application/json", "X-CSRFToken": session.csrfToken },
    body: JSON.stringify(data),
  });
}
