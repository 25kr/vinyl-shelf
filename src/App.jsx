import { useEffect, useState } from "react";
import RecordCard from "./components/RecordCard";

const albums = [
  {
    id: "2hollis-star",
    title: "star",
    artist: "2hollis",
    cover: "/images/star.jpg",
    accent: "#e5e5e5",
  },
  {
    id: "2hollis-white_tiger",
    title: "White Tiger",
    artist: "2hollis",
    cover: "/images/white_tiger.jpg",
    accent: "#dfd7b9",
  },
];

function readCollection() {
  const saved = {};

  for (const album of albums) {
    try {
      saved[album.id] = localStorage.getItem(`collection-${album.id}`) === "true";
    } catch {
      saved[album.id] = false;
    }
  }

  return saved;
}

export default function App() {
  const [collection, setCollection] = useState(readCollection);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    try {
      for (const album of albums) {
        localStorage.setItem(`collection-${album.id}`, String(collection[album.id]));
      }
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }, [collection]);

  function toggleCollection(id) {
    setCollection((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }

  const collectedCount = albums.filter((album) => collection[album.id]).length;
  const query = search.trim().toLowerCase();
  const visibleAlbums = albums.filter((album) => {
    const matchesSearch = `${album.title} ${album.artist}`.toLowerCase().includes(query);
    const matchesFilter = filter === "all" || collection[album.id];
    return matchesSearch && matchesFilter;
  });

  return (
    <main>
      <header className="shelf-header">
        <div>
          <p className="eyebrow">YOUR MUSIC. YOUR SHELF.</p>
          <h1>My Vinyl Shelf</h1>
          <p className="shelf-description">A home for my record collection.</p>
        </div>
        <p className="collection-summary" role="status">
          <strong>{collectedCount}</strong>
          <span>{collectedCount === 1 ? "record collected" : "records collected"}</span>
        </p>
      </header>

      <section className="shelf-controls" aria-label="Find records">
        <div className="search-field">
          <label htmlFor="record-search">Search your shelf</label>
          <input
            id="record-search"
            type="search"
            placeholder="Album or artist..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="filter-buttons" role="group" aria-label="Filter records">
          <button aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
            All records
          </button>
          <button aria-pressed={filter === "collected"} onClick={() => setFilter("collected")}>
            My collection
          </button>
        </div>
      </section>

      {saveError && (
        <p className="save-warning" role="alert">
          Your browser could not save these changes. They may reset after refreshing.
        </p>
      )}

      <p className="results-count" role="status">
        Showing {visibleAlbums.length} of {albums.length} records
      </p>

      <div className="record-grid">
        {visibleAlbums.map((album) => (
          <RecordCard
            key={album.id}
            {...album}
            isCollected={collection[album.id]}
            onToggle={() => toggleCollection(album.id)}
          />
        ))}
      </div>

      {visibleAlbums.length === 0 && (
        <div className="empty-shelf">
          <h2>{query ? "No matching records" : "Your collection starts here"}</h2>
          <p>
            {query
              ? "Try another album or artist, or clear your search."
              : "Choose All records and add an album to your collection."}
          </p>
          <button onClick={() => { setSearch(""); setFilter("all"); }}>
            Show all records
          </button>
        </div>
      )}
    </main>
  );
}
