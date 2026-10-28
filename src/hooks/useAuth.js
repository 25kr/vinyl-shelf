import { useEffect, useState } from "react";
import { authEnabled, authMutation, authRequest } from "../lib/auth";

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(authEnabled);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!authEnabled) return;
    let active = true;
    authRequest("session").then(data => { if (active) setUser(data.user); })
      .catch(() => { /* The dialog offers retry when the local server is offline. */ })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function login(username, password) {
    setBusy(true);
    try { const data = await authMutation("login", { username, password }); setUser(data.user); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true);
    try { const data = await authMutation("logout"); setUser(data.user); }
    finally { setBusy(false); }
  }
  async function refresh() { const data = await authRequest("session"); setUser(data.user); return data; }
  return { enabled: authEnabled, user, loading, busy, login, logout, refresh };
}
