export default function RecordCard({ id, title, artist, cover, year, type, isCollected, isWishlisted, hasStory, onToggle, onToggleWishlist }) {
  const albumUrl = `#/album/${encodeURIComponent(id)}`;

  return (
    <article className="record-card">
      <a className="record-artwork" href={albumUrl} aria-label={`View ${title} by ${artist} and its track list`}>
        <img className="record-cover" src={cover} alt={`${title} album cover by ${artist}`} loading="lazy" width="600" height="600" />
        <span className="cover-hint" aria-hidden="true">Explore record &rarr;</span>
      </a>
      <div className="record-details">
        <h2><a className="record-title-link" href={albumUrl}>{title}</a></h2>
        <p>{artist}</p>
        <p className="record-meta">{year} &middot; {type}{hasStory ? " · Story saved" : ""}</p>
      </div>
      <div className="record-actions">
        <span className="collection-badge">{isCollected ? "In my collection" : "Not collected yet"}</span>
        <button className="collection-button" onClick={onToggle} aria-pressed={isCollected} aria-label={`${isCollected ? "Remove" : "Add"} ${title} ${isCollected ? "from" : "to"} collection`}>
          {isCollected ? "Remove from collection" : "Add to collection"}
        </button>
        <button className="wishlist-button" onClick={onToggleWishlist} aria-pressed={isWishlisted} aria-label={`${isWishlisted ? "Remove" : "Add"} ${title} ${isWishlisted ? "from" : "to"} wishlist`}>
          <span aria-hidden="true">{isWishlisted ? "♥" : "♡"}</span> {isWishlisted ? "On my wishlist" : "Add to wishlist"}
        </button>
      </div>
    </article>
  );
}
