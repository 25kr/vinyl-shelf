import { useEffect, useRef, useState } from "react";
import PhotoCropper from "./PhotoCropper";

const Camera = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M8 6 9.5 3.5h5L16 6h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" /><circle cx="12" cy="12.5" r="4" /></svg>;

export default function ProfileEditor({ profile, bio, setBio, picture, setPicture, remove, setRemove, busy, error, setError, onSave, onCancel }) {
  const input = useRef(null);
  const heading = useRef(null);
  const [preview, setPreview] = useState(null);
  const [candidate, setCandidate] = useState(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    if (!picture) { setPreview(null); return; }
    const url = URL.createObjectURL(picture);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [picture]);
  const photo = remove ? null : preview || profile.avatarUrl;
  function choose(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Choose a JPG, PNG or WebP picture."); return; }
    if (file.size > 2 * 1024 * 1024) { setError("Choose a picture smaller than 2 MB."); return; }
    setError(""); setCandidate(file);
  }
  function clearPhoto() {
    setPicture(null); setRemove(Boolean(profile.avatarUrl)); setError("");
  }
  return <form className="profile-edit profile-studio" onSubmit={event => { if (candidate) event.preventDefault(); else onSave(event); }} aria-busy={busy} aria-labelledby="profile-edit-title">
    <div className="profile-studio-top"><span className="profile-studio-kicker">YOUR CORNER OF THE SHELF</span><button type="button" className="profile-studio-close" onClick={onCancel} disabled={busy} aria-label="Cancel editing">×</button></div>
    <h2 id="profile-edit-title" ref={heading} tabIndex="-1">Make it yours.</h2>
    <p className="profile-studio-description">A face for the name. A little about your taste.</p>
    <div className="profile-photo-row">
      <button type="button" className="profile-photo-picker" onClick={() => input.current?.click()} disabled={busy} aria-label="Change profile photo">
        <span className="profile-photo-preview">{photo ? <img src={photo} alt="Profile photo preview" onError={() => { setPicture(null); setError("This picture couldn’t be opened. Try another one."); }} /> : <span aria-hidden="true">{profile.username[0].toUpperCase()}</span>}</span>
        <span className="profile-camera-badge"><Camera /></span>
      </button>
      <div className="profile-photo-copy"><strong>Profile photo</strong><button type="button" className="profile-photo-change" onClick={() => input.current?.click()} disabled={busy}>{photo ? "Change photo" : "Add a photo"}</button><p id="profile-photo-help">JPG, PNG or WebP · Max 2 MB<br />Up to 12 megapixels · Cropped to a square</p>{photo && <button type="button" className="profile-photo-remove" onClick={clearPhoto} disabled={busy}>Remove photo</button>}</div>
      <input ref={input} id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={busy} onChange={choose} aria-label="Upload profile photo" aria-describedby="profile-photo-help" />
    </div>
    {candidate && <PhotoCropper file={candidate} onCancel={() => setCandidate(null)} onConfirm={file => { setPicture(file); setRemove(false); setCandidate(null); setError(""); }} onError={message => { setCandidate(null); setError(message); }} />}
    {picture && <p className="profile-photo-status" role="status">New photo ready. Save to update your profile.</p>}
    {remove && <p className="profile-photo-status" role="status">Photo will be removed when you save.</p>}
    <div className="profile-bio-label"><label htmlFor="profile-bio">Bio</label><span>Optional</span></div>
    <div className="profile-bio-field"><textarea id="profile-bio" maxLength="240" rows="3" value={bio} disabled={busy} onChange={event => setBio(event.target.value)} placeholder="Your favourite sounds, your current rotation, your story…" aria-describedby="profile-bio-count" /><span id="profile-bio-count">{bio.length}/240</span></div>
    {error && <p className="auth-error" role="alert">{error}</p>}
    <footer className="profile-edit-actions"><span>Looking good, {profile.username}.</span><div><button type="button" className="profile-cancel-button" onClick={onCancel} disabled={busy}>Cancel</button><button type="submit" className="collection-button" disabled={busy || Boolean(candidate)}>{busy ? "Saving…" : "Save changes"}</button></div></footer>
  </form>;
}
