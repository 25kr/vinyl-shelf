export default function RecordCard({ title, artist, cover, accent, isCollected, onToggle }) {
  return (
    <article className="record-card" style={{ "--album-accent": accent }}>
      <div className="record-artwork">
        <img className="record-cover" src={cover} alt={`${title} album cover by ${artist}`} />
      </div>
      <h2>{title}</h2>
      <p>{artist}</p>
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
    </article>
  );
}
