import { useEffect, useState } from "react";
import CommentReplies from "./CommentReplies";
import { reviewRequest } from "../lib/reviews";

export default function ReviewSocial({ reviewId }) {
  const [counts, setCounts] = useState(null);
  const [comments, setComments] = useState(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [clientId, setClientId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(null);
  useEffect(() => {
    let active = true;
    reviewRequest(`${reviewId}/reactions/`).then(result => { if (active) setCounts(result); }).catch(failure => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [reviewId]);
  async function react(value) {
    if (busy || !counts) return;
    setBusy(true); setError("");
    try { setCounts(await reviewRequest(`${reviewId}/reactions/`, "POST", { value: counts.myReaction === value ? 0 : value })); }
    catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  async function load(page = 1) {
    setBusy(true); setError("");
    try { const result = await reviewRequest(`${reviewId}/comments/?page=${page}`); setComments(current => ({ ...result, results: page === 1 ? result.results : [...current.results, ...result.results] })); setOpen(true); }
    catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  async function post(event) {
    event.preventDefault(); if (busy || !text.trim()) return;
    setBusy(true); setError("");
    try {
      const result = await reviewRequest(`${reviewId}/comments/`, "POST", { text: text.trim(), clientId });
      setCounts(result.counts); setText(""); setClientId(crypto.randomUUID());
      const latest = await reviewRequest(`${reviewId}/comments/`);
      setComments(latest);
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  async function remove(id) {
    setBusy(true); setError("");
    try { await reviewRequest(`${reviewId}/comments/${id}/`, "DELETE"); setDeleting(null); setComments(await reviewRequest(`${reviewId}/comments/`)); setCounts(await reviewRequest(`${reviewId}/reactions/`)); }
    catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <div className="review-social"><div className="review-reaction-bar" aria-label="Review reactions"><button type="button" aria-label="Like review" aria-pressed={counts?.myReaction === 1} disabled={busy || !counts} onClick={() => react(1)}><span aria-hidden="true">👍</span> {counts?.likes ?? "–"}</button><button type="button" aria-label="Dislike review" aria-pressed={counts?.myReaction === -1} disabled={busy || !counts} onClick={() => react(-1)}><span aria-hidden="true">👎</span> {counts?.dislikes ?? "–"}</button><button type="button" aria-expanded={open} disabled={busy} onClick={() => open ? setOpen(false) : load()}>Comments {counts?.comments ?? ""}</button></div>{error && <p className="auth-error" role="alert">{error}</p>}{open && <section className="review-comments" aria-label="Comments"><h3>Comments</h3>{comments?.results.length === 0 && <p className="comment-empty">Start the conversation.</p>}<ul>{comments?.results.map(comment => <li key={comment.id}><a className="feed-avatar" href={`#/profile/${comment.author.id}`} aria-label={`View ${comment.author.username}’s profile`}>{comment.author.avatarUrl ? <img src={comment.author.avatarUrl} alt="" width="36" height="36" /> : comment.author.username[0].toUpperCase()}</a><div><a className="comment-author" href={`#/profile/${comment.author.id}`}>{comment.author.username}</a><p>{comment.text}</p><time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</time>{comment.canDelete && <button type="button" className="comment-delete" disabled={busy} onClick={() => setDeleting(comment.id)}>Delete</button>}{deleting === comment.id && <div className="comment-delete-confirm"><span>Delete this comment?</span><button type="button" disabled={busy} onClick={() => remove(comment.id)}>Delete comment</button><button type="button" disabled={busy} onClick={() => setDeleting(null)}>Keep</button></div>}<CommentReplies reviewId={reviewId} comment={comment} onCounts={setCounts} /></div></li>)}</ul>{comments?.nextPage && <button type="button" className="text-button" disabled={busy} onClick={() => load(comments.nextPage)}>More comments</button>}<form className="comment-form" onSubmit={post}><label htmlFor={`comment-${reviewId}`}>Add a comment</label><textarea id={`comment-${reviewId}`} rows="2" value={text} maxLength="1000" disabled={busy} onChange={event => { setText(event.target.value); setClientId(crypto.randomUUID()); }} placeholder="What do you think?" /><div><span>{text.length}/1000</span><button className="collection-button" disabled={busy || !text.trim()}>{busy ? "Saving…" : "Post comment"}</button></div></form></section>}</div>;
}
