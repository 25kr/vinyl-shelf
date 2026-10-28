import { useEffect, useState } from "react";
import RecordCard from "./components/RecordCard";
import RecordSleeve from "./components/RecordSleeve";
import AlbumPage from "./components/AlbumPage";
import ProfilePage from "./components/ProfilePage";
import LoginDialog from "./components/LoginDialog";
import useAuth from "./hooks/useAuth";
import ListeningDiary from "./components/ListeningDiary";
import albums from "./data/albums";
import { getPressing } from "./data/pressings";
import tracklists from "./data/tracklists.json";
import useShelfFlags from "./hooks/useShelfFlags";

function readRoute() {
  const [hash, query = ""] = (window.location.hash || "#/").split("?");
  if (/^#\/profile\/\d+$/.test(hash)) return { page: "profile", id: hash.slice(10) };
  if (hash.startsWith("#/album/")) {
    try { return { page: "album", id: decodeURIComponent(hash.slice(8)) }; }
    catch { return { page: "album", id: "unknown" }; }
  }
  if (hash === "#/diary/review") return { page: "review", albumId: new URLSearchParams(query).get("album") };
  const page = hash.slice(2);
  return { page: ["explore", "collection", "wishlist", "diary"].includes(page) ? page : "home" };
}
const genres = [...new Set(albums.flatMap((album) => album.genres || []))].sort();

function normaliseSearch(text) {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

const pageTitles = { home: "The record wall", explore: "Explore", collection: "My collection", wishlist: "Wishlist" };

function pickFeaturedRecord() {
  const vinyls = albums.filter(album => getPressing(album.id).available);
  let previousId;
  try { previousId = sessionStorage.getItem("vinyl-shelf-featured-record"); } catch { /* Browser storage is optional. */ }
  const choices = vinyls.filter(album => album.id !== previousId);
  const pool = choices.length ? choices : vinyls;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function App() {
  // Choose once per page load, so normal interactions never change the feature.
  const [featuredRecord] = useState(pickFeaturedRecord);
  useEffect(() => {
    try { if (featuredRecord) sessionStorage.setItem("vinyl-shelf-featured-record", featuredRecord.id); } catch { /* Browser storage is optional. */ }
  }, [featuredRecord]);
  const [collection, toggleCollectionFlag, collectionError] = useShelfFlags("collection", albums);
  const [wishlist, toggleWishlistFlag, wishlistError] = useShelfFlags("wishlist", albums);
  const [savedAlbums, toggleSaved, savedError] = useShelfFlags("saved", albums);
  const [route, setRoute] = useState(readRoute);
  // Keep each shelf's preferences while opening albums or visiting another page.
  const [shelfPreferences, setShelfPreferences] = useState({});
  const [returnPage, setReturnPage] = useState(() => ["home", "explore", "collection", "wishlist"].includes(route.page) ? route.page : "home");
  const { search = "", filter = "all", genre = "all", sort = "catalogue" } = shelfPreferences[route.page] || {};
  function setPreference(name, value) {
    setShelfPreferences(current => ({ ...current, [route.page]: { ...current[route.page], [name]: value } }));
  }
  const setSearch = value => setPreference("search", value);
  const setFilter = value => setPreference("filter", value);
  const setGenre = value => setPreference("genre", value);
  const setSort = value => setPreference("sort", value);
  const saveError = collectionError || wishlistError || savedError;
  const [loginOpen, setLoginOpen] = useState(false);
  const auth = useAuth();

  useEffect(() => {
    function handleNavigation() {
      const nextRoute = readRoute();
      setRoute(nextRoute);
      if (["home", "explore", "collection", "wishlist"].includes(nextRoute.page)) setReturnPage(nextRoute.page);
      window.scrollTo(0, 0);
    }
    window.addEventListener("hashchange", handleNavigation);
    return () => window.removeEventListener("hashchange", handleNavigation);
  }, []);
  const selectedAlbum = route.page === "album" ? albums.find((album) => album.id === route.id) : undefined;
  useEffect(() => {
    document.title = selectedAlbum ? `${selectedAlbum.title} by ${selectedAlbum.artist} | Vinyl Shelf` : "Vinyl Shelf";
  }, [selectedAlbum]);
  function toggleCollection(id) {
    if (getPressing(id).available) toggleCollectionFlag(id);
  }
  function toggleWishlist(id) {
    if (getPressing(id).available) toggleWishlistFlag(id);
  }
  function resetFilters() { setSearch(""); setFilter("all"); setGenre("all"); setSort("catalogue"); }

  const saveWarning = saveError && <p className="save-warning" role="alert">Your browser could not save these changes. They may reset after refreshing.</p>;
  const searchWords = normaliseSearch(search).split(/\s+/).filter(Boolean);
  const visibleAlbums = albums.filter((album) => {
    const vinyl = getPressing(album.id).available;
    const matchesPage = route.page === "explore" || (route.page === "home" && vinyl)
      || (route.page === "collection" && vinyl && collection[album.id])
      || (route.page === "wishlist" && vinyl && wishlist[album.id]);
    const matchesFilter = filter === "all" || (filter === "vinyl" && vinyl);
    const albumGenres = album.genres || [];
    const matchesGenre = genre === "all" || albumGenres.includes(genre);
    const searchable = normaliseSearch(`${album.title} ${album.artist} ${album.artist.replace(/\$/g, "s").replace(/[^\p{L}\p{N}]/gu, "")} ${albumGenres.join(" ")} ${albumGenres.join(" ").replace(/[-/]/g, "")}`);
    return matchesPage && matchesFilter && matchesGenre && searchWords.every((word) => searchable.includes(word));
  });
  if (sort === "newest") visibleAlbums.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
  if (sort === "oldest") visibleAlbums.sort((a, b) => a.year - b.year || a.title.localeCompare(b.title));
  if (sort === "title") visibleAlbums.sort((a, b) => a.title.localeCompare(b.title));
  const pageTitle = pageTitles[route.page] || pageTitles.home;

  return (
    <>
      <div className="ambient-background" aria-hidden="true"><span /><span /><span /></div>
      <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); document.getElementById("main-content")?.focus(); }}>Skip to content</a>
      <header className="site-header"><div className="nav-inner">
        <a className="wordmark" href="#/" aria-label="Vinyl Shelf home"><span className="brand-record" aria-hidden="true" />shelf<span className="brand-dot">.</span></a>
        <nav aria-label="Main navigation">
          {[["home", "Home", "#/"], ["explore", "Explore", "#/explore"], ["collection", "My collection", "#/collection"], ["wishlist", "Wishlist", "#/wishlist"], ["diary", "Diary", "#/diary"]].map(([page, label, href]) => <a key={page} href={href} aria-current={(route.page === page || (page === "diary" && route.page === "review")) ? "page" : undefined}>{label}</a>)}
        </nav>
        <button className="login-button" onClick={() => setLoginOpen(true)} aria-label={auth.user ? `Account: ${auth.user.username}` : "Log in"}><span className="login-button-label">{auth.user ? auth.user.username : "Log in"}</span><span aria-hidden="true">↗</span></button>
      </div></header>
      {auth.user && <p className="auth-storage-notice" role="status">Signed in as {auth.user.username}. Reviews are saved to your account. Your collection and wishlist are still saved on this device.</p>}
      {route.page === "profile" ? <ProfilePage key={`${route.id}:${auth.user?.id || "guest"}`} userId={route.id} auth={auth} onLogin={() => setLoginOpen(true)} albums={albums} tracklists={tracklists} /> : ["diary", "review"].includes(route.page) ? <ListeningDiary key={auth.enabled ? auth.user?.id || "guest" : "demo"} auth={auth} onLogin={() => setLoginOpen(true)} albums={albums} tracklists={tracklists} writing={route.page === "review"} requestedAlbumId={route.albumId} /> : route.page === "album" ? (
        selectedAlbum ? <AlbumPage
          backPage={returnPage} key={selectedAlbum.id} album={selectedAlbum} tracks={tracklists[selectedAlbum.id] || []}
          isCollected={collection[selectedAlbum.id]} isWishlisted={wishlist[selectedAlbum.id]}
          isSaved={savedAlbums[selectedAlbum.id]} onToggleSaved={() => toggleSaved(selectedAlbum.id)}
          onToggleCollection={() => toggleCollection(selectedAlbum.id)} onToggleWishlist={() => toggleWishlist(selectedAlbum.id)}
          saveWarning={saveWarning}
        /> : <main id="main-content" tabIndex="-1"><h1>Record not found</h1><a className="back-link" href="#/">Back to shelf</a></main>
      ) : (
        <main id="main-content" className={`shelf-page page-${route.page}`} tabIndex="-1">
          {route.page === "home" && <section className="home-feature" aria-labelledby="home-feature-title">
            <div className="home-feature-copy"><span className="feature-kicker"><span className="live-dot" /> SIDE A / DISCOVER</span><h2 id="home-feature-title">Good records.<br />Great company.</h2><p>Find your next favourite. Make it part of your shelf.</p><a className="feature-link" href="#/explore">Explore records <span aria-hidden="true">↗</span></a></div>
            {featuredRecord && <a className="feature-record record-artwork" href={`#/album/${encodeURIComponent(featuredRecord.id)}`} aria-label={`Discover ${featuredRecord.title} by ${featuredRecord.artist}`}><RecordSleeve id={featuredRecord.id} title={featuredRecord.title} artist={featuredRecord.artist} cover={featuredRecord.cover} /></a>}
          </section>}
          <header className="shelf-header compact-page-bar"><h1>{pageTitle}</h1>{route.page === "home" && <a className="browse-link" href="#/explore">Explore all albums <span aria-hidden="true">↗</span></a>}</header>
          {route.page === "explore" && <section className="browse-controls" aria-label="Find albums">
            <div className="shelf-controls">
              <div className="search-field"><label htmlFor="record-search">Search albums</label><input id="record-search" type="search" placeholder="Album, artist or genre…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
              <div className="select-field"><label htmlFor="genre-filter">Genre</label><select id="genre-filter" value={genre} onChange={(event) => setGenre(event.target.value)}><option value="all">All genres</option>{genres.map((name) => <option key={name}>{name}</option>)}</select></div>
              <div className="select-field"><label htmlFor="record-sort">Sort by</label><select id="record-sort" value={sort} onChange={(event) => setSort(event.target.value)}><option value="catalogue">Shelf order</option><option value="newest">Newest year</option><option value="oldest">Oldest year</option><option value="title">Album A–Z</option></select></div>
            </div>
            <div className="shelf-tabs"><div className="filter-buttons" role="group" aria-label="Filter albums">{[["all", "All albums"], ["vinyl", "On vinyl"]].map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>{(search || genre !== "all" || filter !== "all" || sort !== "catalogue") && <button className="text-button" onClick={resetFilters}>Clear filters</button>}</div>
          </section>}
          {saveWarning}
          <section className="record-grid" aria-label={route.page === "explore" ? "Album gallery" : "Vinyl gallery"}>{visibleAlbums.map((album) => <RecordCard key={album.id} {...album} />)}</section>
          {!visibleAlbums.length && <div className="empty-shelf"><p className="eyebrow">ROOM FOR SOMETHING GOOD</p><h2>{route.page === "collection" ? "Your collection starts here." : route.page === "wishlist" ? "Dream a little. Dig a little." : "Nothing here just yet."}</h2><p>{route.page === "explore" ? "No albums match those filters. Try another search or clear your filters." : "Open an album to add a record to your shelf."}</p>{route.page === "explore" ? <button className="collection-button" onClick={resetFilters}>Show all albums</button> : <a className="primary-link" href="#/explore">Explore albums ↗</a>}</div>}
        </main>
      )}
      <footer className="site-footer"><a className="footer-brand" href="#/">shelf.</a><p>Keep what moves you.</p><span>For the love of the record.</span></footer>
      {loginOpen && <LoginDialog onClose={() => setLoginOpen(false)} auth={auth} />}
    </>
  );
}
