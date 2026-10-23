import { useState, useEffect, useRef } from "react";

const storageKey = "vinyl-shelf-listening-diary";
function dateValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && dateValue(date) === value;
}
function trackId(track) { return `${track.disc}-${track.number}`; }
function readDiary(albums, tracklists) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (!Array.isArray(saved)) throw new Error("Invalid diary");
    const entries = saved.filter((entry) => entry && typeof entry.id === "string"
      && albums.some((album) => album.id === entry.albumId)
      && (entry.target === "album" || (tracklists[entry.albumId] || []).some((track) => trackId(track) === entry.target))
      && validDate(entry.date) && typeof entry.note === "string" && typeof entry.repeat === "boolean"
      && typeof entry.createdAt === "string" && Number.isFinite(Date.parse(entry.createdAt)));
    return { entries, warning: entries.length !== saved.length ? "Some diary entries could not be loaded. Your original saved data has not been changed." : "" };
  } catch { return { entries: [], warning: "Your diary could not be loaded. Your original saved data has not been changed." }; }
}

export default function ListeningDiary({ albums, tracklists, writing }) {
  const [stored, setStored] = useState(() => readDiary(albums, tracklists));
  const [albumId, setAlbumId] = useState(albums[0]?.id || "");
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
  ].filter(item => albums.some(album => album.id === item.albumId)).map((item, index) => ({ ...item, id: `demo-${index}`, demo: true, target: "album", repeat: false, date: dateValue(), createdAt: new Date(new Date().setHours(0, 0, 0, 0) - (index + 1) * 86400000).toISOString() }));
  const sortedEntries = [...stored.entries, ...demos].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  useEffect(() => {
    if (writing) document.getElementById("diary-album")?.focus();
    else if (arrivingId) {
      arrivalRef.current?.focus({ preventScroll: true });
      arrivalRef.current?.scrollIntoView({ block: "center", behavior: "instant" });
      const timer = setTimeout(() => setArrivingId(null), 1200);
      return () => clearTimeout(timer);
    }
  }, [writing, arrivingId]);


  function save(entries) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(entries));
      setStored({ entries, warning: "" }); setError(""); return true;
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
    const previous = stored.entries.find((entry) => entry.id === editingId);
    const entry = { id: previous?.id || crypto.randomUUID(), albumId, target, date, rating, note: note.trim(), repeat, createdAt: previous?.createdAt || new Date().toISOString() };
    const next = editingId ? stored.entries.map((item) => item.id === editingId ? entry : item) : [entry, ...stored.entries];
    submitting.current = true;
    if (save(next)) { setArrivingId(entry.id); resetForm(); window.location.hash = "#/diary"; setStatus(editingId ? "Review updated." : "Your review has landed. Saved on this device."); }
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
      {stored.warning && <p className="save-warning" role="alert">{stored.warning}</p>}
      <section className="diary-review-feed" aria-label="Listening reviews">
          {sortedEntries.map(entry => {
            const album = albums.find(item => item.id === entry.albumId);
            const track = (tracklists[entry.albumId] || []).find(item => trackId(item) === entry.target);
            return <article ref={entry.id === arrivingId ? arrivalRef : undefined} tabIndex={entry.id === arrivingId ? -1 : undefined} className={`diary-entry review-feed-card${entry.id === arrivingId ? " review-arriving" : ""}`} key={entry.id} aria-label={`Listen: ${track?.title || album.title}, ${entry.date}`}>
              <div className="feed-reviewer"><span className="feed-avatar" aria-hidden="true">{entry.demo ? entry.name[0] : "Y"}</span><div><strong>{entry.demo ? entry.name : "Your review"}{entry.demo && <span className="demo-review-badge">Demo review</span>}</strong><span>{track ? "Track" : "Album"}{entry.repeat ? " · Repeat listen" : ""}</span></div><time title="Entry added" dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</time></div>
              <div className="feed-album"><a className="diary-cover-link" href={`#/album/${encodeURIComponent(album.id)}`} aria-label={`Open ${album.title}`}><img src={album.cover} width="64" height="64" alt="" loading="lazy" /></a><div><h2><a href={`#/album/${encodeURIComponent(album.id)}`}>{track?.title || album.title}</a></h2><p>{album.artist}{track ? ` · ${album.title}` : ""}</p></div></div>
              <DiaryStars value={entry.rating} />
              {entry.note && <p className="diary-entry-note">{entry.note}</p>}
              <footer className="feed-card-footer"><span>{entry.demo ? "Sample listening entry · " : "Listened "}{new Date(`${entry.date}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>{!entry.demo && <div className="diary-entry-actions"><button type="button" onClick={() => edit(entry)}>Edit entry</button><button type="button" onClick={() => setDeletingId(entry.id)}>Delete entry</button></div>}</footer>
              {deletingId === entry.id && <div className="review-delete-confirm"><p>Delete this diary entry?</p><button type="button" className="delete-button" onClick={() => remove(entry.id)}>Delete</button><button type="button" className="text-button" onClick={() => setDeletingId(null)}>Keep entry</button></div>}
            </article>;
          })}
          {earlierReviews.length > 0 && <section className="diary-archive" aria-label="Earlier reviews"><h2>Earlier reviews</h2><p>Kept from your album pages. These don’t have a listening date.</p>{earlierReviews.map(review => <article className="review-feed-card diary-archived-review" key={`${review.album.id}-${review.id}`}><div className="feed-album"><a className="diary-cover-link" href={`#/album/${encodeURIComponent(review.album.id)}`}><img src={review.album.cover} alt="" width="64" height="64" loading="lazy" /></a><div><h3><a href={`#/album/${encodeURIComponent(review.album.id)}`}>{review.album.title}</a></h3><p>{review.album.artist}{review.target !== "album" ? ` · ${(tracklists[review.album.id] || []).find(track => trackId(track) === review.target)?.title || "Track review"}` : ""}</p></div></div><DiaryStars value={review.rating} /><p className="diary-entry-note">{review.text}</p>{typeof review.story === "string" && review.story && <p className="diary-entry-note">{review.story}</p>}</article>)}</section>}
      </section>
      </>}
      {writing && <section className="diary-composer-page" aria-labelledby="diary-form-heading">
        <a className="back-link" href="#/diary">← Back to diary</a>
        <header className="diary-dialog-heading"><img src={selectedAlbum?.cover} alt="" width="44" height="44" /><h1 id="diary-form-heading">{editingId ? "Edit your review" : "Write a review"}</h1></header>
        {error && <p className="save-warning" role="alert">{error}</p>}
        <form className="diary-form" onSubmit={handleSubmit}>
          <label htmlFor="diary-album">Album</label><select id="diary-album" autoFocus value={albumId} onChange={event => { setAlbumId(event.target.value); setTarget("album"); }}>{albums.map(album => <option key={album.id} value={album.id}>{album.title} · {album.artist}</option>)}</select>
          <div className="diary-form-row"><div><label htmlFor="diary-target">Album or track</label><select id="diary-target" value={target} onChange={event => setTarget(event.target.value)}><option value="album">The full album</option>{tracks.map(track => <option key={trackId(track)} value={trackId(track)}>{multipleDiscs ? `Disc ${track.disc} · ` : ""}{track.number}. {track.title}</option>)}</select></div><div><label htmlFor="diary-date">Listening date</label><input id="diary-date" type="date" required max={dateValue()} value={date} onChange={event => setDate(event.target.value)} /></div></div>
          <fieldset className="diary-rating"><legend>Your rating</legend><div className="rating-options">{[1, 2, 3, 4, 5].map(value => <label key={value} className={`star-option${value <= rating ? " is-selected" : ""}`}><input type="radio" name="diary-rating" value={value} required checked={rating === value} onChange={() => setRating(value)} aria-label={`${value} ${value === 1 ? "star" : "stars"}`} /><span aria-hidden="true">★</span></label>)}</div></fieldset>
          <label htmlFor="diary-note">Your review <span className="optional-label">Optional</span></label><textarea id="diary-note" rows="4" maxLength="500" value={note} onChange={event => setNote(event.target.value)} placeholder="What stayed with you? Or the story of how you found it…" />
          <label className="diary-repeat" htmlFor="diary-repeat"><input id="diary-repeat" type="checkbox" checked={repeat} onChange={event => setRepeat(event.target.checked)} /><span>I’ve listened to this before</span></label>
          <div className="diary-dialog-actions"><span>Saved on this device</span><button type="submit" className="diary-create-button">{editingId ? "Save review" : "Upload review"}</button></div>
        </form>
      </section>}
    </main>
  );
}

function DiaryStars({ value }) {
  const valid = Number.isInteger(value) && value >= 1 && value <= 5;
  return <div className="diary-entry-rating feed-rating" role="img" aria-label={valid ? `${value} out of 5 stars` : "Not rated"}>{valid ? [1, 2, 3, 4, 5].map(star => <span key={star} className={star <= value ? "rating-tile is-filled" : "rating-tile"} aria-hidden="true">★</span>) : <span className="feed-unrated">Not rated</span>}</div>;
}
