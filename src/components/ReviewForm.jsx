import { dateValue, trackId } from "../lib/diary";

export default function ReviewForm({ albums, albumId, setAlbumId, target, setTarget, tracks, multipleDiscs, date, setDate, rating, setRating, note, setNote, repeat, setRepeat, editingId, onSubmit }) {
  return (
        <form className="diary-form" onSubmit={onSubmit}>
          <label htmlFor="diary-album">Album</label><select id="diary-album" value={albumId} onChange={event => { setAlbumId(event.target.value); setTarget("album"); }}>{albums.map(album => <option key={album.id} value={album.id}>{album.title} · {album.artist}</option>)}</select>
          <div className="diary-form-row"><div><label htmlFor="diary-target">Album or track</label><select id="diary-target" value={target} onChange={event => setTarget(event.target.value)}><option value="album">The full album</option>{tracks.map(track => <option key={trackId(track)} value={trackId(track)}>{multipleDiscs ? `Disc ${track.disc} · ` : ""}{track.number}. {track.title}</option>)}</select></div><div><label htmlFor="diary-date">Listening date</label><input id="diary-date" type="date" required max={dateValue()} value={date} onChange={event => setDate(event.target.value)} /></div></div>
          <fieldset className="diary-rating"><legend>Your rating</legend><div className="rating-options">{[1, 2, 3, 4, 5].map(value => <label key={value} className={`star-option${value <= rating ? " is-selected" : ""}`}><input type="radio" name="diary-rating" value={value} required checked={rating === value} onChange={() => setRating(value)} aria-label={`${value} ${value === 1 ? "star" : "stars"}`} /><span aria-hidden="true">★</span></label>)}</div></fieldset>
          <label htmlFor="diary-note">Your review <span className="optional-label">Optional</span></label><textarea id="diary-note" rows="4" maxLength="500" aria-describedby="diary-note-count" value={note} onChange={event => setNote(event.target.value)} placeholder="What stayed with you? Or the story of how you found it…" />
          <p id="diary-note-count" className="review-counter">{note.length}/500 characters</p>
          <label className="diary-repeat" htmlFor="diary-repeat"><input id="diary-repeat" type="checkbox" checked={repeat} onChange={event => setRepeat(event.target.checked)} /><span>I’ve listened to this before</span></label>
          <div className="diary-dialog-actions"><span>Saved on this device</span><button type="submit" className="diary-create-button">{editingId ? "Save review" : "Upload review"}</button></div>
        </form>
  );
}
