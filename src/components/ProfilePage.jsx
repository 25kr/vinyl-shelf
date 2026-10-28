import { useEffect, useState } from "react";
import { authRequest, authMutation } from "../lib/auth";
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
  const [people, setPeople] = useState(null);
  const [peopleBusy, setPeopleBusy] = useState(false);
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
  async function toggleFollow() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const result = await authMutation(`profiles/${userId}/follow`, { following: !data.connections.isFollowing });
      setData(current => ({ ...current, connections: result.connections }));
      setPeople(null);
      setNotice(result.connections.isFollowing ? `Following ${data.profile.username}.` : `Unfollowed ${data.profile.username}.`);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function showPeople(kind, page = 1) {
    if (peopleBusy) return;
    setPeopleBusy(true); setError("");
    try {
      const result = await authRequest(`profiles/${userId}/${kind}?page=${page}`);
      setPeople(current => ({ ...result, kind, results: page > 1 && current?.kind === kind ? [...current.results, ...result.results] : result.results }));
    } catch (failure) { setError(failure.message); }
    finally { setPeopleBusy(false); }
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
          <div className="profile-intro"><h1>{data.profile.username}</h1>{data.profile.bio && <p>{data.profile.bio}</p>}<div className="profile-stats"><span><strong>{data.count}</strong> {data.count === 1 ? "review" : "reviews"}</span><button type="button" disabled={peopleBusy} onClick={() => showPeople("followers")}><strong>{data.connections?.followers ?? 0}</strong> followers</button><button type="button" disabled={peopleBusy} onClick={() => showPeople("following")}><strong>{data.connections?.following ?? 0}</strong> following</button></div></div>
          {!own && <button className={`collection-button profile-follow${data.connections?.isFollowing ? " is-following" : ""}`} aria-pressed={Boolean(data.connections?.isFollowing)} disabled={busy || !data.connections} onClick={toggleFollow}>{busy ? "Updating…" : data.connections?.isFollowing ? "Following · Unfollow" : "Follow"}</button>}
          {own && !editing && <button className="collection-button" onClick={() => { setEditing(value => !value); setError(""); setPicture(null); setRemove(false); setBio(data.profile.bio); }} disabled={busy}>{editing ? "Cancel" : "Edit profile"}</button>}
        </header>
        {notice && <p role="status">{notice}</p>}
        {peopleBusy && <p role="status">Loading listeners…</p>}
        {people && <section className="profile-people" aria-labelledby="profile-people-title"><header><h2 id="profile-people-title">{people.kind === "followers" ? "Followers" : "Following"} <span>{people.count}</span></h2><button type="button" className="profile-studio-close" aria-label="Close listeners" disabled={peopleBusy} onClick={() => setPeople(null)}>×</button></header>{!people.results.length && <p>{people.kind === "followers" ? "No followers yet." : "Not following anyone yet."}</p>}<ul>{people.results.map(person => <li key={person.id}><a href={`#/profile/${person.id}`}><span className="feed-avatar">{person.avatarUrl ? <img src={person.avatarUrl} width="40" height="40" alt="" /> : person.username[0].toUpperCase()}</span><span><strong>{person.username}</strong>{person.bio && <small>{person.bio}</small>}</span><span aria-hidden="true">↗</span></a></li>)}</ul>{people.nextPage && <button className="profile-cancel-button" disabled={peopleBusy} onClick={() => showPeople(people.kind, people.nextPage)}>Show more</button>}</section>}
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
