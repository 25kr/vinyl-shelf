import { useEffect, useRef, useState } from "react";
import { searchCatalogue } from "../lib/catalogue";

export default function CatalogueSearch({ auth, onLogin, state, setState, albums }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [attempt, setAttempt] = useState(null);
  const controller = useRef(null);
  const sequence = useRef(0);
  const heading = useRef(null);
  const result = state.userId === auth.user?.id ? state.result : null;
  useEffect(() => {
    sequence.current += 1; controller.current?.abort(); setBusy(false); setError(""); setAttempt(null); setRetryAt(0);
    return () => { sequence.current += 1; controller.current?.abort(); };
  }, [auth.user?.id]);
  useEffect(() => {
    const update = () => setSeconds(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    update(); const timer = setInterval(update, 1000); return () => clearInterval(timer);
  }, [retryAt]);
  async function search(query, page = 1, append = false) {
    if (!auth.enabled || !auth.user || auth.loading || busy || Date.now() < retryAt) return;
    const clean = query.trim().replace(/\s+/g, " ");
    if (clean.length < 2 || clean.length > 120) { setError("Enter an album or artist name with 2 to 120 characters."); return; }
    controller.current?.abort(); const current = ++sequence.current;
    const request = new AbortController(); controller.current = request;
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; request.abort(); }, 12000);
    setBusy(true); setError(""); setAttempt({ query: clean, page, append });
    try {
      const data = await searchCatalogue(clean, page, request.signal);
      if (sequence.current !== current) return;
      setState(previous => ({ ...previous, userId: auth.user.id, result: { ...data, results: append && previous.result?.query === data.query ? [...new Map([...previous.result.results, ...data.results].map(item => [item.id, item])).values()] : data.results } }));
      if (!append) requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
    } catch (failure) {
      if (sequence.current !== current || (request.signal.aborted && !timedOut)) return;
      setError(timedOut ? "Search took too long. Try again in a moment." : failure instanceof TypeError ? "Couldn’t connect. Check your connection and try again." : failure.message);
      if (failure.status === 401) auth.refresh().catch(() => {});
      if (failure.retryAfter) { setRetryAt(Date.now() + failure.retryAfter * 1000); setSeconds(failure.retryAfter); }
    } finally { clearTimeout(timer); if (sequence.current === current) setBusy(false); }
  }
  function clear() {
    sequence.current += 1; controller.current?.abort(); setBusy(false); setError(""); setAttempt(null);
    setState({ input: "", result: null, userId: auth.user?.id });
  }
  return <section className="catalogue-search" aria-label="Search the music catalogue">
    <form className="catalogue-search-form" onSubmit={event => { event.preventDefault(); search(state.input); }}>
      <label htmlFor="catalogue-query">Find an album or artist</label><div><input id="catalogue-query" type="search" value={state.input} maxLength="120" placeholder="Try 2hollis star, Lana Del Rey…" autoComplete="off" onChange={event => setState(previous => ({ ...previous, input: event.target.value }))} /><button className="collection-button" disabled={busy || auth.loading || !auth.enabled || !auth.user || seconds > 0}>{busy ? "Searching…" : seconds > 0 ? `Wait ${seconds}s` : "Search music"}</button></div>
    </form>
    {!auth.enabled ? <p className="catalogue-status">Online search is available on the <a href="https://vinyl-shelf-beta.onrender.com/#/explore">live beta</a>. You can still browse the shelf here.</p> : auth.loading ? <p role="status">Checking your account…</p> : !auth.user ? <div className="catalogue-signin"><p>Log in to search beyond the shelf.</p><button type="button" className="profile-cancel-button" onClick={onLogin}>Log in to search</button></div> : <>
      {busy && <p className="catalogue-status" role="status">Looking for {attempt?.query}…</p>}
      {error && <div className="catalogue-error" role="alert"><p>{error}</p>{attempt && <button type="button" className="profile-cancel-button" disabled={busy || seconds > 0} onClick={() => search(attempt.query, attempt.page, attempt.append)}>{seconds > 0 ? `Try again in ${seconds}s` : "Try again"}</button>}</div>}
      {result && <><div className="catalogue-results-heading"><h2 ref={heading} tabIndex="-1">Results for “{result.query}”</h2><button type="button" className="text-button" onClick={clear}>Clear search</button></div><p className="catalogue-status">{result.count.toLocaleString()} {result.count === 1 ? "match" : "matches"} · Albums and EPs</p>
        {!result.results.length ? <div className="catalogue-empty"><h3>No albums found.</h3><p>Try the album title, artist name, or a different spelling.</p></div> : <ul className="catalogue-results">{result.results.map(item => {
          const local = albums.find(album => album.title.toLocaleLowerCase() === item.title.toLocaleLowerCase() && album.artist.toLocaleLowerCase() === item.artist.toLocaleLowerCase());
          const external = /^https:\/\/musicbrainz\.org\/release-group\/[a-f0-9-]+$/.test(item.sourceUrl || "") ? item.sourceUrl : "https://musicbrainz.org/";
          return <li key={item.id}>{local ? <a className="catalogue-result-cover" href={`#/album/${encodeURIComponent(local.id)}`}><img src={local.cover} alt="" width="76" height="76" loading="lazy" /></a> : <span className="catalogue-result-placeholder" aria-hidden="true"><span className="brand-record" /></span>}<div className="catalogue-result-details"><span className="catalogue-result-meta">{[item.type, item.firstReleaseDate?.slice(0, 4)].filter(Boolean).join(" · ")}</span><h3>{local ? <a href={`#/album/${encodeURIComponent(local.id)}`}>{item.title}</a> : item.title}</h3><p>{item.artist || "Artist not listed"}</p>{item.disambiguation && <small>{item.disambiguation}</small>}</div><a className="catalogue-result-link" href={local ? `#/album/${encodeURIComponent(local.id)}` : external} {...(!local ? { target: "_blank", rel: "noreferrer" } : {})}>{local ? "Open album ↗" : "MusicBrainz ↗"}</a></li>;
        })}</ul>}
        {result.nextPage && <button className="profile-cancel-button catalogue-more" type="button" disabled={busy || seconds > 0} onClick={() => search(result.query, result.nextPage, true)}>Show more albums</button>}
      </>}
      {!result && !busy && !error && <p className="catalogue-status">Search albums and EPs beyond our current shelf.</p>}
      <p className="catalogue-attribution">Album information from <a href="https://musicbrainz.org/" target="_blank" rel="noreferrer">MusicBrainz</a>. Albums already on our shelf open here; other results open on MusicBrainz.</p>
    </>}
  </section>;
}
