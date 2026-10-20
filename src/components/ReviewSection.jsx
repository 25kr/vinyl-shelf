import { useState } from "react";

function trackKey(track) {
  return `${track.disc}-${track.number}`;
}

function loadReviews(albumId, tracks) {
  try {
    const saved = JSON.parse(localStorage.getItem(`vinyl-shelf-reviews:${albumId}`) || "[]");
    const targets = new Set(["album", ...tracks.map(trackKey)]);
    if (!Array.isArray(saved)) throw new Error("Invalid reviews");
    const reviews = saved.filter((review) => review && typeof review.id === "string"
      && targets.has(review.target) && Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5
      && typeof review.text === "string" && typeof review.story === "string"
      && typeof review.createdAt === "string" && Number.isFinite(Date.parse(review.createdAt)));
    return { reviews, error: reviews.length !== saved.length ? "Some saved reviews could not be loaded. Your original browser data has not been changed." : "" };
  } catch {
    return { reviews: [], error: "Your saved reviews could not be loaded. Your original browser data has not been changed." };
  }
}

export default function ReviewSection({ album, tracks, target, onTargetChange }) {
  const [stored, setStored] = useState(() => loadReviews(album.id, tracks));
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [story, setStory] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [view, setView] = useState("all");
  const targets = [{ id: "album", title: `${album.title} · Full album` }, ...tracks.map((track) => ({ id: trackKey(track), title: `${track.number}. ${track.title}` }))];
  const visible = stored.reviews.filter((review) => view === "all" || (view === "album" ? review.target === "album" : review.target !== "album"));

  // Save first, then update the screen. A failed save keeps the draft intact.
  function persist(reviews) {
    try {
      localStorage.setItem(`vinyl-shelf-reviews:${album.id}`, JSON.stringify(reviews));
      setStored({ reviews, error: "" }); setError("");
      return true;
    } catch {
      setError("Could not save your changes. Keep a copy of your review and try again. Your draft is still here.");
      return false;
    }
  }

  function resetDraft() {
    setRating(0); setText(""); setStory(""); setEditingId(null);
  }

  function handleSubmit(event) {
    event.preventDefault(); setStatus("");
    if (!rating || !text.trim()) { setError("Choose a star rating and write a few words before saving."); return; }
    const previous = stored.reviews.find((review) => review.id === editingId);
    const now = new Date().toISOString();
    const review = {
      id: previous?.id || crypto.randomUUID(), target, rating,
      text: text.trim(), story: story.trim(), createdAt: previous?.createdAt || now, updatedAt: now,
    };
    const next = editingId ? stored.reviews.map((item) => item.id === editingId ? review : item) : [review, ...stored.reviews];
    if (persist(next)) {
      resetDraft(); setView("all");
      setStatus(editingId ? "Changes saved in this browser." : "Review saved in this browser.");
    }
  }

  function editReview(review) {
    onTargetChange(review.target); setRating(review.rating); setText(review.text); setStory(review.story);
    setEditingId(review.id); setDeletingId(null); setStatus(""); setError("");
    document.getElementById("review-text")?.focus();
  }

  function deleteReview(id) {
    setStatus("");
    if (persist(stored.reviews.filter((review) => review.id !== id))) {
      if (editingId === id) resetDraft();
      setDeletingId(null); setStatus("Review deleted from this browser.");
    }
  }

  return (
    <section className="reviews-section" id="reviews" aria-labelledby="reviews-heading">
      <header className="reviews-heading">
        <p className="eyebrow">AFTER THE NEEDLE DROPS</p>
        <h2 id="reviews-heading">Reviews</h2>
        <p>What stayed with you? Review the album or give a track its own moment.</p>
        <span className="review-privacy">Private preview · Saved only in this browser</span>
      </header>
      {(error || stored.error) && <p className="save-warning" role="alert">{error || stored.error}</p>}
      <p className="review-status" role="status">{status}</p>
      <form id="review-form" className="review-form" onSubmit={handleSubmit}>
        <h3>{editingId ? "Edit your review" : "Write a review"}</h3>
        <label htmlFor="review-target">What are you reviewing?</label>
        <select id="review-target" value={target} onChange={(event) => onTargetChange(event.target.value)}>
          {targets.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
        <fieldset className="star-rating">
          <legend>Your rating</legend>
          <div className="rating-options">{[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className={value <= rating ? "star-option is-selected" : "star-option"}>
              <input type="radio" name="review-rating" value={value} checked={rating === value} onChange={() => setRating(value)} required aria-label={`${value} ${value === 1 ? "star" : "stars"}`} />
              <span aria-hidden="true">★</span>
            </label>
          ))}<span className="rating-value" aria-hidden="true">{rating ? `${rating} / 5` : "Choose a rating"}</span></div>
        </fieldset>
        <label htmlFor="review-text">Your review</label>
        <textarea id="review-text" rows="5" maxLength="3000" required value={text} onChange={(event) => setText(event.target.value)} placeholder="A favourite moment, a lyric, the way it made you feel…" />
        <p className="review-counter">{text.length} / 3000</p>
        <label htmlFor="review-discovery">How did you find it? <span className="optional-label">Optional</span></label>
        <textarea id="review-discovery" rows="3" maxLength="1500" value={story} onChange={(event) => setStory(event.target.value)} placeholder="A friend’s recommendation, a record shop, a late-night discovery…" />
        <div className="review-form-actions">
          <button type="submit" className="collection-button">{editingId ? "Save changes" : "Save review"}</button>
          {editingId && <button type="button" className="text-button" onClick={() => { resetDraft(); setStatus(""); setError(""); }}>Cancel editing</button>}
        </div>
      </form>
      <div className="review-feed-heading"><h3>Your reviews</h3><span>{stored.reviews.length}</span></div>
      <div className="filter-buttons review-filters" role="group" aria-label="Filter reviews">
        {[["all", "All reviews"], ["album", "Album reviews"], ["tracks", "Track reviews"]].map(([value, label]) => <button key={value} type="button" aria-pressed={view === value} onClick={() => setView(value)}>{label}</button>)}
      </div>
      {!visible.length && <p className="reviews-empty">{stored.reviews.length ? "No reviews in this category yet." : "Your first review starts here. Pick the album or a track above."}</p>}
      <div className="review-feed">{visible.map((review) => (
        <article key={review.id} className="review-entry" aria-label={`Your review of ${targets.find((item) => item.id === review.target)?.title}`}>
          <div className="review-byline"><span className="review-avatar" aria-hidden="true">Y</span><strong>You</strong><time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</time></div>
          <p className="review-subject">{review.target === "album" ? "ALBUM" : "TRACK"} · {targets.find((item) => item.id === review.target)?.title}</p>
          <p className="review-stars" aria-label={`${review.rating} out of 5 stars`}><span aria-hidden="true">{"★".repeat(review.rating)}<span className="unfilled-stars">{"★".repeat(5 - review.rating)}</span></span></p>
          <p className="review-body">{review.text}</p>
          {review.story && <div className="review-discovery"><h4>The discovery</h4><p>{review.story}</p></div>}
          <div className="review-entry-actions">
            <button type="button" className="text-button" onClick={() => editReview(review)}>Edit review</button>
            <button type="button" className="text-button" onClick={() => setDeletingId(review.id)}>Delete review</button>
          </div>
          {deletingId === review.id && <div className="review-delete-confirm"><p>Delete this review?</p><button type="button" className="delete-button" onClick={() => deleteReview(review.id)}>Delete</button><button type="button" className="text-button" onClick={() => setDeletingId(null)}>Keep review</button></div>}
        </article>
      ))}</div>
    </section>
  );
}
