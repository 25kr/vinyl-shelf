import { useEffect, useRef, useState } from "react";
import PhotoCropper from "./PhotoCropper";

export default function BannerPicker({ currentUrl, file, removed, onChange, onRemove, onPending, busy, onError }) {
  const input = useRef(null);
  const [candidate, setCandidate] = useState(null);
  const [preview, setPreview] = useState(null);
  useEffect(() => { if (!file) { setPreview(null); return; } const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  function close() { setCandidate(null); onPending(false); }
  const url = removed ? null : preview || currentUrl;
  return <div className="banner-picker"><div className="profile-bio-label"><strong>Profile banner</strong><span>Make your space your own</span></div><button type="button" className="banner-upload" disabled={busy} onClick={() => input.current.click()}>{url ? <img src={url} alt="Banner preview" /> : <span className="banner-placeholder">Your music. Your backdrop.</span>}<span className="banner-upload-action">{url ? "Change banner" : "+ Add banner"}</span></button><input ref={input} hidden type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload profile banner" disabled={busy} onChange={event => { const chosen = event.target.files?.[0]; event.target.value = ""; if (!chosen) return; if (!["image/jpeg", "image/png", "image/webp"].includes(chosen.type) || chosen.size > 2 * 1024 * 1024) { onError("Choose a JPG, PNG or WebP banner smaller than 2 MB."); return; } setCandidate(chosen); onPending(true); }} /><div className="banner-picker-help"><span>3:1 banner · Up to 2 MB</span>{url && <button className="profile-photo-remove" type="button" disabled={busy} onClick={onRemove}>Remove banner</button>}</div>{removed && <p className="profile-photo-status">Banner will be removed when you save.</p>}{candidate && <PhotoCropper file={candidate} aspect={3} onConfirm={result => { onChange(result); close(); }} onCancel={close} onError={message => { onError(message); close(); }} />}</div>;
}
