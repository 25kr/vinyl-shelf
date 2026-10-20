import { useState } from "react";
import { getPressing } from "../data/pressings";
import ReviewSection from "./ReviewSection";

function formatDuration(milliseconds) {
  if (!Number.isFinite(milliseconds)) return "—";
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function AlbumPage({ backPage = "home", album, tracks, isCollected, isWishlisted, isSaved, onToggleSaved, onToggleCollection, onToggleWishlist, saveWarning }) {
  const pressing = getPressing(album.id);
  const [reviewTarget, setReviewTarget] = useState("album");
  const discGroups = Object.entries(Object.groupBy(tracks, track => track.disc || 1));
  const duration = Math.round(tracks.reduce((total, track) => total + (track.durationMs || 0), 0) / 60000);


  return (
    <main className="album-page" id="main-content" tabIndex="-1">
      <a className="back-link" href={backPage === "home" ? "#/" : `#/${backPage}`}>&larr; Back to {({ home: "shelf", explore: "Explore", collection: "collection", wishlist: "wishlist" })[backPage]}</a>
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
            {pressing.source && <a className="pressing-source" href={pressing.source} target="_blank" rel="noreferrer">{pressing.verified ? "View this edition" : "View vinyl release"} ↗</a>}
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
            <button className="wishlist-button" onClick={() => { setReviewTarget("album"); document.getElementById("review-target")?.focus(); }}>Write a review ↓</button>
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
            {discGroups.map(([disc, discTracks]) => <tbody key={disc}>
              {discGroups.length > 1 && <tr className="disc-heading"><th colSpan="3" scope="rowgroup">Disc {disc}</th></tr>}
              {discTracks.map((track) => (
                <tr key={`${track.disc}-${track.number}`}>
                  <td>{track.number}</td>
                  <td><button className="track-review-button" aria-label={`Review ${track.title}`} onClick={() => {
                    setReviewTarget(`${track.disc}-${track.number}`);
                    document.getElementById("review-target")?.focus();
                  }}>{track.title}<span aria-hidden="true">Review ↗</span></button></td>
                  <td>{formatDuration(track.durationMs)}</td>
                </tr>
              ))}
            </tbody>)}
          </table>
          <a className="source-link" href={album.source} target="_blank" rel="noreferrer">Album and track information from Apple Music ↗</a>
        </section>
        <ReviewSection album={album} tracks={tracks} target={reviewTarget} onTargetChange={setReviewTarget} />
      </div>
    </main>
  );
}

