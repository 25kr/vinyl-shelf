import { useState } from "react";

// Keep the existing browser keys so current collections still load.
export default function useShelfFlags(prefix, albums) {
  const [stored, setStored] = useState(() => {
    let error = false;
    const flags = Object.fromEntries(albums.map(({ id }) => {
      try {
        const value = localStorage.getItem(`${prefix}-${id}`);
        if (value !== null && value !== "true" && value !== "false") error = true;
        return [id, value === "true"];
      } catch { error = true; return [id, false]; }
    }));
    return { flags, error };
  });
  function toggle(id) {
    const next = !stored.flags[id];
    let error = stored.error;
    try { localStorage.setItem(`${prefix}-${id}`, String(next)); }
    catch { error = true; }
    setStored(current => ({ flags: { ...current.flags, [id]: next }, error }));
  }
  return [stored.flags, toggle, stored.error];
}
