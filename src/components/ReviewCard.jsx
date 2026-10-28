import DiaryStars from "./DiaryStars";

export default function ReviewCard({ entry, album, track, arriving, arrivalRef, confirmingDelete, onEdit, onAskDelete, onDelete, onKeep, canManage = false }) {
  const authorName = entry.demo ? entry.name : entry.author?.username || "On this device";
  const albumUrl = `#/album/${encodeURIComponent(album.id)}`;
  return (
    <article ref={arriving ? arrivalRef : undefined} tabIndex={arriving ? -1 : undefined} className={`diary-entry review-feed-card${arriving ? " review-arriving" : ""}`} aria-label={`Listen: ${track?.title || album.title}, ${entry.date}`}>
      <div className="feed-reviewer">
        <span className="feed-avatar" aria-hidden="true">{authorName[0].toUpperCase()}</span>
        <div><strong>{authorName}{entry.demo && <span className="demo-review-badge">Demo review</span>}</strong><span>{track ? "Track" : "Album"}{entry.repeat ? " · Repeat listen" : ""}</span></div>
        <time title="Entry added" dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</time>
      </div>
      <div className="feed-album">
        <a className="diary-cover-link" href={albumUrl} aria-label={`Open ${album.title}`}><img src={album.cover} width="64" height="64" alt="" loading="lazy" /></a>
        <div><h2><a href={albumUrl}>{track?.title || album.title}</a></h2><p>{album.artist}{track ? ` · ${album.title}` : ""}</p></div>
      </div>
      <DiaryStars value={entry.rating} />
      {entry.note && <p className="diary-entry-note">{entry.note}</p>}
      <footer className="feed-card-footer">
        <span>{entry.demo ? "Sample listening entry · " : "Listened "}{new Date(`${entry.date}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
        {!entry.demo && canManage && <div className="diary-entry-actions"><button type="button" onClick={onEdit}>Edit entry</button><button type="button" onClick={onAskDelete}>Delete entry</button></div>}
      </footer>
      {canManage && confirmingDelete && <div className="review-delete-confirm" role="group" aria-label="Confirm deletion"><p>Delete this diary entry?</p><button type="button" className="delete-button" onClick={onDelete}>Delete</button><button type="button" className="text-button" onClick={onKeep}>Keep entry</button></div>}
    </article>
  );
}
