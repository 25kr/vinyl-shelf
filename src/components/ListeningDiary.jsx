import { useState } from "react";

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

export default function ListeningDiary({ albums, tracklists }) {
  const [stored, setStored] = useState(() => readDiary(albums, tracklists));
  const [albumId, setAlbumId] = useState(albums[0]?.id || "");
  const [target, setTarget] = useState("album");
  const [date, setDate] = useState(dateValue);
  const [note, setNote] = useState("");
  const [repeat, setRepeat] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const selectedAlbum = albums.find((album) => album.id === albumId);
  const tracks = tracklists[albumId] || [];
  const sortedEntries = [...stored.entries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const months = Object.groupBy(sortedEntries, (entry) => entry.date.slice(0, 7));

  function save(entries) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(entries));
      setStored({ entries, warning: "" }); setError(""); return true;
    } catch { setError("Could not save your diary. Your entry is still in the form; keep a copy and try again."); return false; }
  }
  function resetForm() {
    setTarget("album"); setDate(dateValue()); setNote(""); setRepeat(false); setEditingId(null);
  }
  function handleSubmit(event) {
    event.preventDefault(); setStatus("");
    if (!selectedAlbum || !validDate(date) || date > dateValue()) { setError("Choose an album and a valid listening date, today or earlier."); return; }
    const previous = stored.entries.find((entry) => entry.id === editingId);
    const entry = { id: previous?.id || crypto.randomUUID(), albumId, target, date, note: note.trim(), repeat, createdAt: previous?.createdAt || new Date().toISOString() };
    const next = editingId ? stored.entries.map((item) => item.id === editingId ? entry : item) : [entry, ...stored.entries];
    if (save(next)) { resetForm(); setStatus(editingId ? "Diary entry updated." : "Listen added to your diary."); }
  }
  function edit(entry) {
    setAlbumId(entry.albumId); setTarget(entry.target); setDate(entry.date); setNote(entry.note); setRepeat(entry.repeat);
    setEditingId(entry.id); setDeletingId(null); setStatus(""); setError("");
    document.getElementById("diary-album")?.focus();
  }
  function remove(id) {
    if (save(stored.entries.filter((entry) => entry.id !== id))) {
      if (editingId === id) resetForm();
      setDeletingId(null); setStatus("Diary entry deleted.");
    }
  }

  return (
    <main id="main-content" className="diary-page" tabIndex="-1">
      <header className="shelf-header"><div><p className="eyebrow">ONE LISTEN AT A TIME</p><h1>Your listening diary.</h1><p className="shelf-description">A little record of what you played, and when.</p></div><span className="review-privacy">Private preview · Saved in this browser</span></header>
      <div className="diary-layout">
        <aside className="diary-composer" aria-labelledby="diary-form-heading">
          <div className="diary-composer-heading"><img src={selectedAlbum?.cover} alt="" width="60" height="60" /><div><p className="eyebrow">ON THE RECORD</p><h2 id="diary-form-heading">{editingId ? "Edit your listen" : "Log a listen"}</h2></div></div>
          {(error || stored.warning) && <p className="save-warning" role="alert">{error || stored.warning}</p>}
          <p className="review-status" role="status">{status}</p>
          <form className="diary-form" onSubmit={handleSubmit}>
            <label htmlFor="diary-album">Album</label><select id="diary-album" value={albumId} onChange={(event) => { setAlbumId(event.target.value); setTarget("album"); }}>{albums.map((album) => <option key={album.id} value={album.id}>{album.title} · {album.artist}</option>)}</select>
            <label htmlFor="diary-target">What did you listen to?</label><select id="diary-target" value={target} onChange={(event) => setTarget(event.target.value)}><option value="album">The full album</option>{tracks.map((track) => <option key={trackId(track)} value={trackId(track)}>{track.number}. {track.title}</option>)}</select>
            <label htmlFor="diary-date">Listening date</label><input id="diary-date" type="date" required max={dateValue()} value={date} onChange={(event) => setDate(event.target.value)} />
            <label className="diary-repeat" htmlFor="diary-repeat"><input id="diary-repeat" type="checkbox" checked={repeat} onChange={(event) => setRepeat(event.target.checked)} /><span>A repeat listen</span><span aria-hidden="true">↻</span></label>
            <label htmlFor="diary-note">A little note <span className="optional-label">Optional</span></label><textarea id="diary-note" rows="3" maxLength="500" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Rain outside. Headphones on. This one on repeat." />
            <div className="review-form-actions"><button type="submit" className="collection-button">{editingId ? "Save entry" : "Log listen"}</button>{editingId && <button type="button" className="text-button" onClick={() => { resetForm(); setError(""); setStatus(""); }}>Cancel editing</button>}</div>
          </form>
        </aside>
        <section className="diary-timeline" aria-labelledby="diary-timeline-heading"><div className="diary-timeline-heading"><h2 id="diary-timeline-heading">The listening log</h2><span>NEWEST FIRST</span></div>
          {!sortedEntries.length && <div className="diary-empty"><span className="brand-record" aria-hidden="true" /><p className="eyebrow">THE FIRST PAGE IS YOURS</p><h3>What’s on the turntable?</h3><p>Log your first album or track.<br />Your listening days will unfold here.</p></div>}
          {Object.entries(months).map(([month, entries]) => <section className="diary-month" key={month} aria-label={new Date(`${month}-01T12:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}>
            <h3>{new Date(`${month}-01T12:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</h3>
            {entries.map((entry) => {
              const album = albums.find((item) => item.id === entry.albumId);
              const track = (tracklists[entry.albumId] || []).find((item) => trackId(item) === entry.target);
              const listenedDate = new Date(`${entry.date}T12:00:00`);
              return <article key={entry.id} className="diary-entry" aria-label={`Listen: ${track?.title || album.title}, ${entry.date}`}>
                <time className="diary-day" dateTime={entry.date}><strong>{listenedDate.getDate()}</strong><span>{listenedDate.toLocaleDateString("en-GB", { weekday: "short" })}</span></time>
                <a href={`#/album/${encodeURIComponent(album.id)}`} className="diary-cover-link" aria-label={`Open ${album.title}`}><img src={album.cover} alt="" width="72" height="72" loading="lazy" /></a>
                <div className="diary-entry-content"><p className="diary-entry-type">{track ? "TRACK" : "ALBUM"}{entry.repeat && <span className="diary-repeat-badge">↻ Repeat listen</span>}</p><h4><a href={`#/album/${encodeURIComponent(album.id)}`}>{track?.title || album.title}</a></h4><p className="diary-entry-artist">{album.artist}{track ? ` · ${album.title}` : ""}</p>{entry.note && <p className="diary-entry-note">{entry.note}</p>}<div className="diary-entry-actions"><button type="button" className="text-button" onClick={() => edit(entry)}>Edit entry</button><button type="button" className="text-button" onClick={() => setDeletingId(entry.id)}>Delete entry</button></div>
                {deletingId === entry.id && <div className="review-delete-confirm"><p>Delete this diary entry?</p><button type="button" className="delete-button" onClick={() => remove(entry.id)}>Delete</button><button type="button" className="text-button" onClick={() => setDeletingId(null)}>Keep entry</button></div>}</div>
              </article>;
            })}
          </section>)}
        </section>
      </div>
    </main>
  );
}
