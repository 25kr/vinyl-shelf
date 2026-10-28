import { useEffect, useRef, useState } from "react";

// Positions are fractions of the displayed crop square, so touch and mouse agree.
export default function PhotoCropper({ file, onCancel, onConfirm, onError, aspect = 1 }) {
  const [source, setSource] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const stage = useRef(null);
  const drag = useRef(null);
  const image = useRef(null);
  const title = useRef(null);
  const callbacks = useRef({ onError });
  callbacks.current = { onError };
  useEffect(() => {
    title.current?.focus({ preventScroll: true });
    const url = URL.createObjectURL(file);
    const photo = new Image();
    let active = true;
    photo.onload = () => {
      if (!active) return;
      if (photo.naturalWidth * photo.naturalHeight > 12_000_000) { callbacks.current.onError("Choose a picture up to 12 megapixels."); return; }
      image.current = photo;
      setSource({ url, width: photo.naturalWidth, height: photo.naturalHeight });
    };
    photo.onerror = () => { if (active) callbacks.current.onError("This picture couldn’t be opened. Try another one."); };
    photo.src = url;
    return () => { active = false; photo.onload = null; photo.onerror = null; URL.revokeObjectURL(url); };
  }, [file]);
  const baseWidth = source ? Math.max(1, source.width / source.height / aspect) : 1;
  const baseHeight = source ? Math.max(1, source.height / source.width * aspect) : 1;
  const width = baseWidth * zoom;
  const height = baseHeight * zoom;
  function clamp(value, limit) { return Math.max(-limit, Math.min(limit, value)); }
  function bounded(next, scale = zoom) {
    return { x: clamp(next.x, (baseWidth * scale - 1) / 2), y: clamp(next.y, (baseHeight * scale - 1) / 2) };
  }
  async function confirm() {
    if (!source || saving) return;
    setSaving(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = aspect === 1 ? 512 : 1200; canvas.height = Math.round(canvas.width / aspect);
      const context = canvas.getContext("2d");
      context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image.current, (0.5 - width / 2 + position.x) * canvas.width, (0.5 - height / 2 + position.y) * canvas.height, width * canvas.width, height * canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!blob) throw new Error("Image conversion failed");
      onConfirm(new File([blob], "profile-photo.jpg", { type: "image/jpeg" }));
    } catch { onError("Couldn’t prepare this photo. Please choose another one."); }
    finally { setSaving(false); }
  }
  return <section className="photo-cropper" aria-labelledby="crop-title">
    <div className="photo-crop-heading"><h3 id="crop-title" ref={title} tabIndex="-1">{aspect === 1 ? "Position your photo" : "Position your banner"}</h3><p id="crop-help">Drag to move. Zoom to get it just right.</p></div>
    {!source ? <p role="status">Opening photo…</p> : <>
      <div ref={stage} className={`photo-crop-stage${aspect !== 1 ? " banner-crop-stage" : ""}`} style={{ aspectRatio: aspect }} tabIndex="0" role="group" aria-label="Photo position" aria-describedby="crop-help crop-keyboard"
        onPointerDown={event => { if (saving) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, start: position }; }}
        onPointerMove={event => { const start = drag.current; if (!start || start.id !== event.pointerId) return; const bounds = stage.current.getBoundingClientRect(); const size = bounds.width; setPosition(bounded({ x: start.start.x + (event.clientX - start.x) / size, y: start.start.y + (event.clientY - start.y) / bounds.height })); }}
        onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}
        onKeyDown={event => { const movement = { ArrowLeft: [-0.025, 0], ArrowRight: [0.025, 0], ArrowUp: [0, -0.025], ArrowDown: [0, 0.025] }[event.key]; if (!movement || saving) return; event.preventDefault(); setPosition(current => bounded({ x: current.x + movement[0], y: current.y + movement[1] })); }}>
        <img src={source.url} alt="Photo crop preview" draggable="false" style={{ width: `${width * 100}%`, height: `${height * 100}%`, left: `${(0.5 - width / 2 + position.x) * 100}%`, top: `${(0.5 - height / 2 + position.y) * 100}%` }} />
        <span className="photo-crop-mask" aria-hidden="true" />
      </div>
      <p id="crop-keyboard" className="crop-keyboard-hint">You can also use arrow keys to move the photo.</p>
      <label className="photo-zoom-label" htmlFor="photo-zoom">Zoom <span>{zoom.toFixed(1)}×</span></label>
      <input id="photo-zoom" type="range" min="1" max="3" step="0.01" value={zoom} disabled={saving} onChange={event => { const next = Number(event.target.value); setZoom(next); setPosition(current => bounded(current, next)); }} />
    </>}
    <div className="photo-crop-actions"><button type="button" className="profile-cancel-button" disabled={saving} onClick={onCancel}>Cancel photo</button><button type="button" className="collection-button" disabled={!source || saving} onClick={confirm}>{saving ? "Preparing…" : "Use photo"}</button></div>
  </section>;
}
