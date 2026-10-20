import { useState } from "react";
import { getPressing } from "../data/pressings";

function formatDuration(milliseconds) {
  if (!Number.isFinite(milliseconds)) return "—";
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function AlbumPage({ album, tracks, isCollected, isWishlisted, isSaved, onToggleSaved, onToggleCollection, onToggleWishlist, story, onSaveStory, saveWarning }) {
  const [draft, setDraft] = useState(story);
  const [storyStatus, setStoryStatus] = useState("");
  const pressing = getPressing(album.id);
  const duration = Math.round(tracks.reduce((total, track) => total + (track.durationMs || 0), 0) / 60000);

  function handleSave(event) {
    event.preventDefault();
    const saved = onSaveStory(draft);
    setStoryStatus(saved ? "Saved on this browser." : "Could not save. Please keep a copy of your story and try again.");
  }

  return (
    <main className="album-page" id="main-content" tabIndex="-1">
      <a className="back-link" href="#/">&larr; Back to shelf</a>
      <header className="album-hero">
        <div className="album-cover-frame">
          <img className="album-page-cover" src={album.cover} alt={`${album.title} album cover by ${album.artist}`} width="600" height="600" />
        </div>
        <div className="album-intro">
          <p className="eyebrow">{album.type} / {album.year}</p>
          <h1>{album.title}</h1>
          <p className="album-artist">{album.artist}</p>
          <p className="album-runtime">{tracks.length} tracks &middot; {duration} min</p>
          <div className="genre-tags" role="group" aria-label="Album genres">{(album.genres || []).map((genre) => <span key={genre}>{genre}</span>)}</div>
          <div className={`pressing-info vinyl-${pressing.colour}`}>
            <p className="pressing-name"><span className="pressing-swatch" aria-hidden="true" />{pressing.label}</p>
            <p className="pressing-note">{pressing.note}</p>
            {pressing.source && <a className="pressing-source" href={pressing.source} target="_blank" rel="noreferrer">{pressing.verified ? "View this edition" : "View artist's vinyl listing"} ↗</a>}
          </div>
          {pressing.available && <span className="collection-badge">{isCollected ? "In my collection" : "Not collected yet"}</span>}
          <div className="album-buttons">
            {pressing.available ? <>
            <button className="collection-button" aria-pressed={isCollected} onClick={onToggleCollection}>
              {isCollected ? "Remove from collection" : "Add to collection"}
            </button>
            <button className="wishlist-button" aria-pressed={isWishlisted} onClick={onToggleWishlist}>
              {isWishlisted ? "On my wishlist" : "Add to wishlist"}
            </button>
            </> : <button className="collection-button" aria-pressed={Boolean(isSaved)} onClick={onToggleSaved}>{isSaved ? "Remove saved album" : "Save album"}</button>}
          </div>
        </div>
      </header>
      {saveWarning}
      <div className="album-content">
        <section className="track-section" aria-labelledby="tracklist-heading">
          <h2 id="tracklist-heading">Track list</h2>
          <table className="track-table">
            <caption className="visually-hidden">Tracks on {album.title} by {album.artist}</caption>
            <thead><tr><th scope="col">#</th><th scope="col">Title</th><th scope="col">Time</th></tr></thead>
            <tbody>
              {tracks.map((track) => (
                <tr key={`${track.disc}-${track.number}`}>
                  <td>{track.number}</td>
                  <td>{track.title}</td>
                  <td>{formatDuration(track.durationMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <a className="source-link" href={album.source} target="_blank" rel="noreferrer">Album and track information from Apple Music ↗</a>
        </section>
        <section className="story-section" aria-labelledby="story-heading">
          <p className="eyebrow">MORE THAN A RECORD</p>
          <h2 id="story-heading">The story behind it</h2>
          <p>Where did you find it? What makes it yours?</p>
          <form onSubmit={handleSave}>
            <label className="visually-hidden" htmlFor="record-story">Your story about {album.title}</label>
            <textarea
              id="record-story"
              rows="7"
              maxLength="2000"
              placeholder="A gift, a late-night discovery, a favourite record shop..."
              value={draft}
              onChange={(event) => { setDraft(event.target.value); setStoryStatus(""); }}
            />
            <div className="story-footer">
              <span>{draft.length} / 2000</span>
              <button className="collection-button" type="submit">Save story</button>
            </div>
            <p className="story-status" role="status">{storyStatus || (draft !== story ? "Unsaved changes" : "Your story is saved only on this browser.")}</p>
          </form>
        </section>
      </div>
    </main>
  );
}

