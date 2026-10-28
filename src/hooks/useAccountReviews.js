import { useEffect, useState } from "react";
import { reviewRequest } from "../lib/reviews";

export default function useAccountReviews(auth) {
  const [entries, setEntries] = useState([]);
  const [count, setCount] = useState(0);
  const [nextPage, setNextPage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  async function expired(failure) {
    if (failure.status === 401) { setEntries([]); await auth.refresh(); }
  }
  useEffect(() => {
    if (!auth.enabled || !auth.user) return;
    let active = true;
    setLoading(true); setError("");
    reviewRequest().then(data => {
      if (active) { setEntries(data.results); setCount(data.count); setNextPage(data.nextPage); }
    }).catch(failure => {
      if (active) { setError(failure.message); if (failure.status === 401) { setEntries([]); auth.refresh().catch(() => {}); } }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [auth.enabled, auth.user?.id, revision]);
  async function save(entry, editingId) {
    try {
      const saved = await reviewRequest(editingId ? `${editingId}/` : "", editingId ? "PATCH" : "POST", entry);
      setEntries(current => [saved, ...current.filter(item => item.id !== saved.id)].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      if (!editingId && !entries.some(item => item.id === saved.id)) setCount(value => value + 1);
      return saved;
    } catch (failure) { await expired(failure); throw failure; }
  }
  async function remove(id) {
    try { await reviewRequest(`${id}/`, "DELETE"); setEntries(current => current.filter(item => item.id !== id)); setCount(value => Math.max(0, value - 1)); }
    catch (failure) { await expired(failure); throw failure; }
  }
  async function loadMore() {
    if (!nextPage || loading) return;
    setLoading(true); setError("");
    try {
      const data = await reviewRequest(`?page=${nextPage}`);
      setEntries(current => [...new Map([...current, ...data.results].map(item => [item.id, item])).values()]);
      setCount(data.count); setNextPage(data.nextPage);
    } catch (failure) { setError(failure.message); await expired(failure); }
    finally { setLoading(false); }
  }
  return { entries, count, nextPage, loading, error, save, remove, loadMore, retry: () => setRevision(value => value + 1) };
}
