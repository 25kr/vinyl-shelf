export default function RecordCard({ title, artist, cover, year, type, isCollected, onToggle }) {
  return (
    <article className="record-card">
      <div className="record-artwork">
        <img
          className="record-cover"
          src={cover}
          alt={`${title} album cover by ${artist}`}
          loading="lazy"
          width="600"
          height="600"
        />
      </div>
      <div className="record-details">
        <h2>{title}</h2>
        <p>{artist}</p>
        <p className="record-meta">{year} &middot; {type}</p>
      </div>
      <div className="record-actions">
        <span className="collection-badge">
          {isCollected ? "In my collection" : "Not collected yet"}
        </span>
        <button
          className="collection-button"
          onClick={onToggle}
          aria-pressed={isCollected}
          aria-label={`${isCollected ? "Remove" : "Add"} ${title} ${isCollected ? "from" : "to"} collection`}
        >
          {isCollected ? "Remove from collection" : "Add to collection"}
        </button>
      </div>
    </article>
  );
}
