import { useState, useEffect, useRef } from "react";

import useAccountReviews from "../hooks/useAccountReviews";
import ReviewCard from "./ReviewCard";
import ReviewForm from "./ReviewForm";
import DiaryStars from "./DiaryStars";
import { diaryStorageKey as storageKey, dateValue, validDate, trackId, readDiary, downloadDiaryBackup } from "../lib/diary";

export default function ListeningDiary({ albums, tracklists, writing, requestedAlbumId, auth, onLogin }) {
  const accountMode = auth.enabled;
  const remote = useAccountReviews(auth);
  const [saving, setSaving] = useState(false);
  const [clientId, setClientId] = useState(() => crypto.randomUUID());
  const [importing, setImporting] = useState(false);
  const [stored, setStored] = useState(() => readDiary(albums, tracklists));
  const [albumId, setAlbumId] = useState(() => albums.find(album => album.id === requestedAlbumId)?.id || albums[0]?.id || "");
  const [target, setTarget] = useState("album");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [rating, setRating] = useState(0);
  const [arrivingId, setArrivingId] = useState(null);
  const arrivalRef = useRef(null);
  const submitting = useRef(false);
  // Keep older album-page reviews visible without guessing a listening date.
  const [earlierReviews] = useState(() => albums.flatMap(album => {
    try {
      const reviews = JSON.parse(localStorage.getItem(`vinyl-shelf-reviews:${album.id}`) || "[]");
      return Array.isArray(reviews) ? reviews.filter(review => review && typeof review.id === "string" && typeof review.text === "string" && Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5).map(review => ({ ...review, album })) : [];
    } catch { return []; }
  }));
  const [repeat, setRepeat] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const selectedAlbum = albums.find((album) => album.id === albumId);
  const tracks = tracklists[albumId] || [];
  const multipleDiscs = new Set(tracks.map(track => track.disc)).size > 1;
  const sortedEntries = [...(accountMode ? auth.user ? remote.entries : [] : stored.entries)].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  useEffect(() => {
    if (writing) document.getElementById("diary-form-heading")?.focus({ preventScroll: true });
    else if (arrivingId) {
      arrivalRef.current?.focus({ preventScroll: true });
      arrivalRef.current?.scrollIntoView({ block: "center", behavior: "instant" });
      const timer = setTimeout(() => setArrivingId(null), 1200);
      return () => clearTimeout(timer);
    }
  }, [writing, arrivingId]);


  function save(entries) {
    if (stored.warning) { setError("Saving is paused to protect your existing diary. Download a backup from the diary page and recover your saved data first."); return false; }
    try {
      localStorage.setItem(storageKey, JSON.stringify(entries));
      setStored({ entries, warning: "", raw: JSON.stringify(entries) }); setError(""); return true;
    } catch { setError("Could not save your diary. Your entry is still in the form; keep a copy and try again."); return false; }
  }
  function resetForm() {
    setTarget("album"); setDate(""); setNote(""); setRating(0); setRepeat(false); setEditingId(null); setClientId(crypto.randomUUID()); setImporting(false);
  }
  function startListen() { resetForm(); setError(""); setStatus(""); window.location.hash = "#/diary/review"; }
  async function handleSubmit(event) {
    event.preventDefault(); setStatus(""); setError("");
    const formElement = event.currentTarget;
    if (submitting.current) return;
    if (accountMode && !auth.user) { onLogin(); return; }
    if (!selectedAlbum || (date && (!validDate(date) || date > dateValue()))) { setError("Choose an album. If you add a listening date, choose today or earlier."); return; }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) { setError("Choose a rating from 1 to 5 stars before logging your listen."); return; }
    if (target !== "album" && !tracks.some(track => trackId(track) === target)) { setError("Choose a track from this album."); return; }
    if (note.length > 500) { setError("Keep your review to 500 characters or fewer."); return; }
    submitting.current = true; setSaving(true);
    try {
      let entry;
      if (accountMode) {
        entry = await remote.save({ albumId, target, date, rating, note: note.trim(), repeat, clientId }, editingId);
      } else {
        const previous = stored.entries.find(item => item.id === editingId);
        entry = { id: previous?.id || clientId, albumId, target, date, rating, note: note.trim(), repeat, createdAt: previous?.createdAt || new Date().toISOString() };
        const next = editingId ? stored.entries.map(item => item.id === editingId ? entry : item) : [entry, ...stored.entries];
        if (!save(next)) return;
      }
      if (formElement.contains(document.activeElement)) document.activeElement?.blur();
      setArrivingId(entry.id); resetForm(); window.location.hash = "#/diary";
      setStatus(accountMode ? "Review saved to your account." : "Review saved on this device.");
    } catch (failure) { setError(failure.message); }
    finally { submitting.current = false; setSaving(false); }
  }
  function edit(entry) {
    if (accountMode && entry.author?.id !== auth.user?.id) return;
    setClientId(entry.clientId || entry.id); setImporting(false);
    setAlbumId(entry.albumId); setTarget(entry.target); setDate(entry.date || ""); setNote(entry.note); setRating(Number.isInteger(entry.rating) && entry.rating >= 1 && entry.rating <= 5 ? entry.rating : 0); setRepeat(entry.repeat);
    setEditingId(entry.id); setDeletingId(null); setStatus(""); setError("");
    window.location.hash = "#/diary/review";
  }
  async function remove(id) {
    if (submitting.current) return;
    submitting.current = true; setError("");
    try {
      if (accountMode) await remote.remove(id);
      else if (!save(stored.entries.filter(entry => entry.id !== id))) return;
      if (editingId === id) resetForm();
      setDeletingId(null); setStatus("Diary entry deleted.");
    } catch (failure) { setError(failure.message); }
    finally { submitting.current = false; }
  }
  function importEntry(entry) {
    setAlbumId(entry.albumId); setTarget(entry.target); setDate(entry.date || "");
    setNote(entry.note); setRating(entry.rating || 0); setRepeat(entry.repeat);
    setClientId(entry.id); setEditingId(null); setImporting(true); setError("");
    window.location.hash = "#/diary/review";
  }

  return (
    <main id="main-content" className="diary-page diary-feed-page" tabIndex="-1">
      {!writing && <>
      <header className="diary-page-bar">
        <div className="diary-title"><h1>Diary</h1><span>{accountMode ? auth.user ? remote.count : 0 : stored.entries.length} reviews</span></div>
        <button type="button" className="diary-create-button" onClick={startListen}><span aria-hidden="true">＋</span> Write a review</button>
      </header>
      <p className="diary-preview-note">{accountMode ? auth.user ? "Reviews from signed-in members." : "Log in to view and write member reviews." : "Your reviews are saved only on this device."}</p>
      <p className="diary-feedback" role="status">{status}</p>
      {(!accountMode || auth.user) && stored.warning && <div className="save-warning" role="alert"><p>{accountMode ? "Older browser data could not be read. Account reviews still work; download a browser backup before recovering the archive." : stored.warning}</p>{stored.raw !== null && <button className="text-button" type="button" onClick={() => downloadDiaryBackup(stored.raw)}>Download diary backup</button>}</div>}
      {error && <p className="save-warning" role="alert">{error}</p>}
      {accountMode && !auth.user && <div className="diary-account-prompt"><button className="diary-create-button" type="button" disabled={auth.loading} onClick={onLogin}>{auth.loading ? "Checking account…" : "Log in to your diary"}</button></div>}
      {accountMode && auth.user && remote.error && <div className="save-warning" role="alert"><p>{remote.error}</p><button className="text-button" onClick={remote.retry}>Try loading reviews again</button></div>}
      {accountMode && auth.user && remote.loading && <p role="status">Loading reviews…</p>}
      <section className="diary-review-feed" aria-label="Listening reviews">
          {!sortedEntries.length && (!accountMode || (auth.user && !remote.loading && !remote.error)) && <p className="diary-preview-note">No reviews yet. Write a review to start the diary.</p>}
          {sortedEntries.map(entry => {
            const album = albums.find(item => item.id === entry.albumId);
            const track = (tracklists[entry.albumId] || []).find(item => trackId(item) === entry.target);
            return <ReviewCard key={entry.id} entry={entry} album={album} track={track} canManage={!accountMode || entry.author?.id === auth.user?.id} arriving={entry.id === arrivingId} arrivalRef={arrivalRef} confirmingDelete={deletingId === entry.id} onEdit={() => edit(entry)} onAskDelete={() => setDeletingId(entry.id)} onDelete={() => remove(entry.id)} onKeep={() => setDeletingId(null)} />;
          })}
          {accountMode && auth.user && remote.nextPage && <button className="diary-create-button" disabled={remote.loading} onClick={remote.loadMore}>Load more reviews</button>}
          {accountMode && auth.user && stored.entries.length > 0 && <details className="diary-browser-archive"><summary>Reviews saved on this browser ({stored.entries.length})</summary><p>These older entries have no confirmed account owner. Open one to import it as {auth.user.username}. The original browser copy will be kept.</p>{stored.entries.map(entry => <div key={entry.id}><ReviewCard entry={entry} album={albums.find(album => album.id === entry.albumId)} track={(tracklists[entry.albumId] || []).find(track => trackId(track) === entry.target)} canManage={false} /><button type="button" className="text-button" disabled={Boolean(stored.warning)} onClick={() => importEntry(entry)}>Import review as {auth.user.username}…</button></div>)}</details>}
          {(!accountMode || auth.user) && earlierReviews.length > 0 && <section className="diary-archive" aria-label="Earlier reviews"><h2>Earlier reviews</h2><p>Kept from your album pages. These don’t have a listening date.</p>{earlierReviews.map(review => <article className="review-feed-card diary-archived-review" key={`${review.album.id}-${review.id}`}><div className="feed-album"><a className="diary-cover-link" href={`#/album/${encodeURIComponent(review.album.id)}`}><img src={review.album.cover} alt="" width="64" height="64" loading="lazy" /></a><div><h3><a href={`#/album/${encodeURIComponent(review.album.id)}`}>{review.album.title}</a></h3><p>{review.album.artist}{review.target !== "album" ? ` · ${(tracklists[review.album.id] || []).find(track => trackId(track) === review.target)?.title || "Track review"}` : ""}</p></div></div><DiaryStars value={review.rating} /><p className="diary-entry-note">{review.text}</p>{typeof review.story === "string" && review.story && <p className="diary-entry-note">{review.story}</p>}</article>)}</section>}
      </section>
      </>}
      {writing && <section className="diary-composer-page" aria-labelledby="diary-form-heading">
        <a className="back-link" href="#/diary">← Back to diary</a>
        <header className="diary-dialog-heading"><img src={selectedAlbum?.cover} alt="" width="44" height="44" /><h1 id="diary-form-heading" tabIndex="-1">{editingId ? "Edit your review" : importing ? "Import browser review" : "Write a review"}</h1></header>
        {error && <p className="save-warning" role="alert">{error}</p>}
        {accountMode && !auth.user ? <div className="diary-account-prompt"><p>Log in before writing a review.</p><button type="button" className="diary-create-button" disabled={auth.loading} onClick={onLogin}>Log in</button></div> : <><p className="diary-preview-note">{importing ? `You are importing this browser review as ${auth.user.username}. Check its rating and listening date before uploading. The browser copy stays unchanged.` : accountMode ? `Posting as ${auth.user.username}` : "Saved on this device"}</p>
        <ReviewForm saving={saving} storageLabel={accountMode ? "Saved to your account" : "Saved on this device"} {...{ albums, albumId, setAlbumId, target, setTarget, tracks, multipleDiscs, date, setDate, rating, setRating, note, setNote, repeat, setRepeat, editingId }} onSubmit={handleSubmit} /></>}
      </section>}
    </main>
  );
}
