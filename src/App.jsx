import { useEffect, useState } from "react";
import RecordCard from "./components/RecordCard";
import AlbumPage from "./components/AlbumPage";
import albums from "./data/albums";
import tracklists from "./data/tracklists.json";

function readFlags(prefix) {
  const saved = {};
  for (const album of albums) {
    try {
      saved[album.id] = localStorage.getItem(`${prefix}-${album.id}`) === "true";
    } catch {
      saved[album.id] = false;
    }
  }
  return saved;
}

function readStories() {
  try {
    const saved = JSON.parse(localStorage.getItem("vinyl-shelf-stories") || "{}");
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return {};
    return Object.fromEntries(Object.entries(saved).filter(([, value]) => typeof value === "string"));
  } catch {
    return {};
  }
}

function readAlbumId() {
  if (!window.location.hash.startsWith("#/album/")) return "";
  try {
    return decodeURIComponent(window.location.hash.slice(8));
  } catch {
    return "unknown";
  }
}

const artists = [...new Set(albums.map((album) => album.artist))];

export default function App() {
  const [collection, setCollection] = useState(() => readFlags("collection"));
  const [wishlist, setWishlist] = useState(() => readFlags("wishlist"));
  const [stories, setStories] = useState(readStories);
  const [albumId, setAlbumId] = useState(readAlbumId);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [artist, setArtist] = useState("all");
  const [sort, setSort] = useState("catalogue");
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    function handleNavigation() {
      setAlbumId(readAlbumId());
      window.scrollTo(0, 0);
    }
    window.addEventListener("hashchange", handleNavigation);
    return () => window.removeEventListener("hashchange", handleNavigation);
  }, []);

  useEffect(() => {
    try {
      for (const album of albums) {
        localStorage.setItem(`collection-${album.id}`, String(collection[album.id]));
        localStorage.setItem(`wishlist-${album.id}`, String(wishlist[album.id]));
      }
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }, [collection, wishlist]);

  const selectedAlbum = albums.find((album) => album.id === albumId);

  useEffect(() => {
    document.title = selectedAlbum
      ? `${selectedAlbum.title} by ${selectedAlbum.artist} | Vinyl Shelf`
      : "Vinyl Shelf";
  }, [selectedAlbum]);

  function toggleCollection(id) {
    setCollection((current) => ({ ...current, [id]: !current[id] }));
  }

  function toggleWishlist(id) {
    setWishlist((current) => ({ ...current, [id]: !current[id] }));
  }

  function saveStory(id, text) {
    const next = { ...stories, [id]: text };
    try {
      localStorage.setItem("vinyl-shelf-stories", JSON.stringify(next));
      setStories(next);
      return true;
    } catch {
      return false;
    }
  }

  function resetFilters() {
    setSearch("");
    setFilter("all");
    setArtist("all");
  }

  const saveWarning = saveError && (
    <p className="save-warning" role="alert">
      Your browser could not save these changes. They may reset after refreshing.
    </p>
  );

  if (albumId) {
    if (!selectedAlbum) {
      return <main><h1>Record not found</h1><a className="back-link" href="#/">Back to shelf</a></main>;
    }
    return (
      <AlbumPage
        key={selectedAlbum.id}
        album={selectedAlbum}
        tracks={tracklists[selectedAlbum.id] || []}
        isCollected={collection[selectedAlbum.id]}
        isWishlisted={wishlist[selectedAlbum.id]}
        onToggleCollection={() => toggleCollection(selectedAlbum.id)}
        onToggleWishlist={() => toggleWishlist(selectedAlbum.id)}
        story={stories[selectedAlbum.id] || ""}
        onSaveStory={(text) => saveStory(selectedAlbum.id, text)}
        saveWarning={saveWarning}
      />
    );
  }

  const query = search.trim().toLowerCase();
  const visibleAlbums = albums.filter((album) => {
    const matchesSearch = `${album.title} ${album.artist}`.toLowerCase().includes(query);
    const matchesArtist = artist === "all" || album.artist === artist;
    const matchesFilter = filter === "all"
      || (filter === "collected" && collection[album.id])
      || (filter === "wishlist" && wishlist[album.id]);
    return matchesSearch && matchesArtist && matchesFilter;
  });

  if (sort === "newest") visibleAlbums.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
  if (sort === "oldest") visibleAlbums.sort((a, b) => a.year - b.year || a.title.localeCompare(b.title));
  if (sort === "title") visibleAlbums.sort((a, b) => a.title.localeCompare(b.title));

  return (
    <main>
      <header className="shelf-header">
        <div>
          <p className="eyebrow">YOUR MUSIC. YOUR SHELF.</p>
          <h1>My Vinyl Shelf</h1>
          <p className="shelf-description">A home for my record collection.</p>
        </div>
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
        <div className="select-field">
          <label htmlFor="artist-filter">Artist</label>
          <select id="artist-filter" value={artist} onChange={(event) => setArtist(event.target.value)}>
            <option value="all">All artists</option>
            {artists.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        <div className="select-field">
          <label htmlFor="record-sort">Sort by</label>
          <select id="record-sort" value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="catalogue">Shelf order</option>
            <option value="newest">Newest year</option>
            <option value="oldest">Oldest year</option>
            <option value="title">Album A-Z</option>
          </select>
        </div>
      </section>

      <div className="shelf-tabs">
        <div className="filter-buttons" role="group" aria-label="Filter records">
          <button aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All records</button>
          <button aria-pressed={filter === "collected"} onClick={() => setFilter("collected")}>My collection</button>
          <button aria-pressed={filter === "wishlist"} onClick={() => setFilter("wishlist")}>Wishlist</button>
        </div>
        {(search || artist !== "all" || filter !== "all") && (
          <button className="text-button" onClick={resetFilters}>Clear filters</button>
        )}
      </div>

      {saveWarning}
      <p className="results-count" role="status">Showing {visibleAlbums.length} of {albums.length} records</p>
      <div className="record-grid">
        {visibleAlbums.map((album) => (
          <RecordCard
            key={album.id}
            {...album}
            isCollected={collection[album.id]}
            isWishlisted={wishlist[album.id]}
            hasStory={Boolean(stories[album.id]?.trim())}
            onToggle={() => toggleCollection(album.id)}
            onToggleWishlist={() => toggleWishlist(album.id)}
          />
        ))}
      </div>

      {visibleAlbums.length === 0 && (
        <div className="empty-shelf">
          <h2>{query || artist !== "all" ? "No matching records" : filter === "wishlist" ? "Your next finds belong here" : "Your collection starts here"}</h2>
          <p>Try different filters, or browse all records to find something for your shelf.</p>
          <button onClick={resetFilters}>Show all records</button>
        </div>
      )}
    </main>
  );
}
