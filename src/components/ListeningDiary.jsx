import { useState, useEffect, useRef } from "react";

import ReviewCard from "./ReviewCard";
import ReviewForm from "./ReviewForm";
import DiaryStars from "./DiaryStars";
import { diaryStorageKey as storageKey, dateValue, validDate, trackId, readDiary, downloadDiaryBackup } from "../lib/diary";

export default function ListeningDiary({ albums, tracklists, writing, requestedAlbumId }) {
  const [stored, setStored] = useState(() => readDiary(albums, tracklists));
  const [albumId, setAlbumId] = useState(() => albums.find(album => album.id === requestedAlbumId)?.id || albums[0]?.id || "");
  const [target, setTarget] = useState("album");
  const [date, setDate] = useState(dateValue);
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
  // Demo entries stay separate from the listener's saved reviews.
  const demos = [
    { name: "Maya", albumId: "2hollis-star", rating: 5, note: "Put this on for one song and ended up staying for the whole record. The production feels huge with headphones on." },
    { name: "Eli", albumId: "2hollis-boy", rating: 4, note: "A late-night walk kind of album. I keep finding little sounds I missed the first time." },
    { name: "Noor", albumId: "2hollis-white_tiger", rating: 5, note: "A friend sent me this and it has been on repeat ever since. Love how it moves between softer moments and all that energy." },
  ].filter(item => albums.some(album => album.id === item.albumId)).map((item, index) => ({ ...item, id: `demo-${index}`, demo: true, target: "album", repeat: false, date: dateValue(new Date(new Date().setDate(new Date().getDate() - index - 1))), createdAt: new Date(new Date().setHours(0, 0, 0, 0) - (index + 1) * 86400000).toISOString() }));
  const sortedEntries = [...stored.entries, ...demos].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
    setTarget("album"); setDate(dateValue()); setNote(""); setRating(0); setRepeat(false); setEditingId(null);
  }
  function startListen() { resetForm(); setError(""); setStatus(""); window.location.hash = "#/diary/review"; }
  function handleSubmit(event) {
    event.preventDefault(); setStatus("");
    if (submitting.current) return;
    if (!selectedAlbum || !validDate(date) || date > dateValue()) { setError("Choose an album and a valid listening date, today or earlier."); return; }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) { setError("Choose a rating from 1 to 5 stars before logging your listen."); return; }
    if (target !== "album" && !tracks.some(track => trackId(track) === target)) { setError("Choose a track from this album."); return; }
    if (note.length > 500) { setError("Keep your review to 500 characters or fewer."); return; }
    const previous = stored.entries.find((entry) => entry.id === editingId);
    const entry = { id: previous?.id || crypto.randomUUID(), albumId, target, date, rating, note: note.trim(), repeat, createdAt: previous?.createdAt || new Date().toISOString() };
    const next = editingId ? stored.entries.map((item) => item.id === editingId ? entry : item) : [entry, ...stored.entries];
    submitting.current = true;
    if (save(next)) { if (event.currentTarget.contains(document.activeElement)) document.activeElement?.blur(); setArrivingId(entry.id); resetForm(); window.location.hash = "#/diary"; setStatus(editingId ? "Review updated." : "Your review has landed. Saved on this device."); }
    submitting.current = false;
  }
  function edit(entry) {
    setAlbumId(entry.albumId); setTarget(entry.target); setDate(entry.date); setNote(entry.note); setRating(Number.isInteger(entry.rating) && entry.rating >= 1 && entry.rating <= 5 ? entry.rating : 0); setRepeat(entry.repeat);
    setEditingId(entry.id); setDeletingId(null); setStatus(""); setError("");
    window.location.hash = "#/diary/review";
  }
  function remove(id) {
    if (save(stored.entries.filter((entry) => entry.id !== id))) {
      if (editingId === id) resetForm();
      setDeletingId(null); setStatus("Diary entry deleted.");
    }
  }

  return (
    <main id="main-content" className="diary-page diary-feed-page" tabIndex="-1">
      {!writing && <>
      <header className="diary-page-bar">
        <div className="diary-title"><h1>Diary</h1><span>{stored.entries.length} {stored.entries.length === 1 ? "listen" : "listens"}</span></div>
        <button type="button" className="diary-create-button" onClick={startListen}><span aria-hidden="true">＋</span> Write a review</button>
      </header>
      <p className="diary-preview-note">A shared feed preview · Sample reviews are labelled. Your reviews are saved on this device.</p>
      <p className="diary-feedback" role="status">{status}</p>
      {stored.warning && <div className="save-warning" role="alert"><p>{stored.warning}</p>{stored.raw !== null && <button className="text-button" type="button" onClick={() => downloadDiaryBackup(stored.raw)}>Download diary backup</button>}</div>}
      {error && <p className="save-warning" role="alert">{error}</p>}
      <section className="diary-review-feed" aria-label="Listening reviews">
          {sortedEntries.map(entry => {
            const album = albums.find(item => item.id === entry.albumId);
            const track = (tracklists[entry.albumId] || []).find(item => trackId(item) === entry.target);
            return <ReviewCard key={entry.id} entry={entry} album={album} track={track} arriving={entry.id === arrivingId} arrivalRef={arrivalRef} confirmingDelete={deletingId === entry.id} onEdit={() => edit(entry)} onAskDelete={() => setDeletingId(entry.id)} onDelete={() => remove(entry.id)} onKeep={() => setDeletingId(null)} />;
          })}
          {earlierReviews.length > 0 && <section className="diary-archive" aria-label="Earlier reviews"><h2>Earlier reviews</h2><p>Kept from your album pages. These don’t have a listening date.</p>{earlierReviews.map(review => <article className="review-feed-card diary-archived-review" key={`${review.album.id}-${review.id}`}><div className="feed-album"><a className="diary-cover-link" href={`#/album/${encodeURIComponent(review.album.id)}`}><img src={review.album.cover} alt="" width="64" height="64" loading="lazy" /></a><div><h3><a href={`#/album/${encodeURIComponent(review.album.id)}`}>{review.album.title}</a></h3><p>{review.album.artist}{review.target !== "album" ? ` · ${(tracklists[review.album.id] || []).find(track => trackId(track) === review.target)?.title || "Track review"}` : ""}</p></div></div><DiaryStars value={review.rating} /><p className="diary-entry-note">{review.text}</p>{typeof review.story === "string" && review.story && <p className="diary-entry-note">{review.story}</p>}</article>)}</section>}
      </section>
      </>}
      {writing && <section className="diary-composer-page" aria-labelledby="diary-form-heading">
        <a className="back-link" href="#/diary">← Back to diary</a>
        <header className="diary-dialog-heading"><img src={selectedAlbum?.cover} alt="" width="44" height="44" /><h1 id="diary-form-heading" tabIndex="-1">{editingId ? "Edit your review" : "Write a review"}</h1></header>
        {error && <p className="save-warning" role="alert">{error}</p>}
        <ReviewForm {...{ albums, albumId, setAlbumId, target, setTarget, tracks, multipleDiscs, date, setDate, rating, setRating, note, setNote, repeat, setRepeat, editingId }} onSubmit={handleSubmit} />
      </section>}
    </main>
  );
}
