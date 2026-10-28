import ReviewSocial from "./ReviewSocial";
import { authEnabled } from "../lib/auth";
import DiaryStars from "./DiaryStars";

export default function ReviewCard({ entry, album, track, arriving, arrivalRef, confirmingDelete, onEdit, onAskDelete, onDelete, onKeep, canManage = false }) {
  const authorName = entry.author?.username || "On this device";
  const albumUrl = `#/album/${encodeURIComponent(album.id)}`;
  return (
    <article ref={arriving ? arrivalRef : undefined} tabIndex={arriving ? -1 : undefined} className={`diary-entry review-feed-card${arriving ? " review-arriving" : ""}`} aria-label={`Listen: ${track?.title || album.title}, ${entry.date || "no listening date"}`}>
      <div className="feed-reviewer">
        {entry.author?.id ? <a className="feed-avatar" href={`#/profile/${entry.author.id}`} aria-label={`View ${authorName}’s profile`}>{entry.author.avatarUrl ? <img src={entry.author.avatarUrl} alt="" width="40" height="40" loading="lazy" /> : authorName[0].toUpperCase()}</a> : <span className="feed-avatar" aria-hidden="true">{authorName[0].toUpperCase()}</span>}
        <div><strong>{entry.author?.id ? <a href={`#/profile/${entry.author.id}`}>{authorName}</a> : authorName}</strong><span>{track ? "Track" : "Album"}</span></div>
        <time title="Entry added" dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</time>
      </div>
      <div className="feed-album">
        <a className="diary-cover-link" href={albumUrl} aria-label={`Open ${album.title}`}><img src={album.cover} width="64" height="64" alt="" loading="lazy" /></a>
        <div><h2><a href={albumUrl}>{track?.title || album.title}</a></h2><p>{album.artist}{track ? ` · ${album.title}` : ""}</p></div>
      </div>
      <DiaryStars value={entry.rating} />
      {entry.note && <p className="diary-entry-note">{entry.note}</p>}
      <footer className="feed-card-footer">
        <span>{entry.date ? `Listened ${new Date(`${entry.date}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}` : "No listening date"}</span>
        {canManage && <div className="diary-entry-actions"><button type="button" onClick={onEdit}>Edit entry</button><button type="button" onClick={onAskDelete}>Delete entry</button></div>}
      </footer>
      {authEnabled && entry.author?.id && <ReviewSocial reviewId={entry.id} />}
      {canManage && confirmingDelete && <div className="review-delete-confirm" role="group" aria-label="Confirm deletion"><p>Delete this diary entry?</p><button type="button" className="delete-button" onClick={onDelete}>Delete</button><button type="button" className="text-button" onClick={onKeep}>Keep entry</button></div>}
    </article>
  );
}
