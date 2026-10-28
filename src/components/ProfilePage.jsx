import { useEffect, useState } from "react";
import { authRequest } from "../lib/auth";
import ReviewCard from "./ReviewCard";
import ProfileEditor from "./ProfileEditor";
import { trackId } from "../lib/diary";

export default function ProfilePage({ userId, auth, onLogin, albums, tracklists }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [picture, setPicture] = useState(null);
  const [remove, setRemove] = useState(false);
  const [notice, setNotice] = useState("");
  const own = String(auth.user?.id) === String(userId);
  useEffect(() => {
    if (!auth.enabled || !auth.user) return;
    let active = true;
    authRequest(`profiles/${userId}`).then(result => {
      if (active) { setData(result); setBio(result.profile.bio); }
    }).catch(failure => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [userId, auth.user?.id, auth.enabled]);
  async function loadMore() {
    setBusy(true); setError("");
    try {
      const next = await authRequest(`profiles/${userId}?page=${data.nextPage}`);
      setData(current => ({ ...next, results: [...current.results, ...next.results] }));
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const session = await authRequest("session");
      const form = new FormData();
      form.append("bio", bio); form.append("removeAvatar", String(remove));
      if (picture && !remove) form.append("avatar", picture);
      const result = await authRequest("profile", { method: "POST", headers: { "X-CSRFToken": session.csrfToken }, body: form });
      setData(current => ({ ...current, profile: result.profile, results: current.results.map(entry => ({ ...entry, author: { ...entry.author, avatarUrl: result.profile.avatarUrl } })) }));
      setPicture(null); setRemove(false); setEditing(false); setNotice("Profile saved.");
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <main id="main-content" tabIndex="-1" className="profile-page diary-feed-page">
    <a className="back-link" href="#/diary">← Back to diary</a>
    {!auth.enabled || (!auth.loading && !auth.user) ? <section className="profile-empty"><h1>Meet the listeners.</h1><p>Log in to view member profiles.</p><button className="collection-button" onClick={onLogin}>Log in</button></section> : <>
      {error && !editing && <p className="auth-error" role="alert">{error}</p>}
      {!data && !error && <p role="status">Loading profile…</p>}
      {data && <>
        <header className="profile-heading">
          <div className="profile-picture">{data.profile.avatarUrl ? <img src={data.profile.avatarUrl} alt={`${data.profile.username}’s profile picture`} width="112" height="112" /> : <span aria-hidden="true">{data.profile.username[0].toUpperCase()}</span>}</div>
          <div className="profile-intro"><h1>{data.profile.username}</h1>{data.profile.bio && <p>{data.profile.bio}</p>}<span>{data.count} {data.count === 1 ? "review" : "reviews"}</span></div>
          {own && !editing && <button className="collection-button" onClick={() => { setEditing(value => !value); setError(""); setPicture(null); setRemove(false); setBio(data.profile.bio); }} disabled={busy}>{editing ? "Cancel" : "Edit profile"}</button>}
        </header>
        {notice && <p role="status">{notice}</p>}
        {own && editing && <ProfileEditor profile={data.profile} bio={bio} setBio={setBio} picture={picture} setPicture={setPicture} remove={remove} setRemove={setRemove} busy={busy} error={error} setError={setError} onSave={save} onCancel={() => { setEditing(false); setPicture(null); setRemove(false); setError(""); }} />}
        <section className="profile-reviews" aria-labelledby="profile-reviews-title"><div className="profile-review-heading"><h2 id="profile-reviews-title">Reviews</h2>{own && <a className="primary-link" href="#/diary/review">Write a review ↗</a>}</div>
          {!data.results.length && <p>No reviews yet.{own ? " Your next listen could be the first." : ""}</p>}
          {data.results.map(entry => { const album = albums.find(item => item.id === entry.albumId); if (!album) return null; const track = (tracklists[entry.albumId] || []).find(item => trackId(item) === entry.target); return <ReviewCard key={entry.id} entry={entry} album={album} track={track} />; })}
          {data.nextPage && <button className="collection-button" disabled={busy} onClick={loadMore}>{busy ? "Loading…" : "More reviews"}</button>}
        </section>
      </>}
    </>}
  </main>;
}
