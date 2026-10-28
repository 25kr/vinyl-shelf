import { useRef, useState } from "react";
import { reviewRequest } from "../lib/reviews";

export default function CommentReplies({ reviewId, comment, onCounts }) {
  const [open, setOpen] = useState(false);
  const [writing, setWriting] = useState(false);
  const [data, setData] = useState(null);
  const [text, setText] = useState("");
  const [clientId, setClientId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(null);
  const input = useRef(null);
  async function fetchReplies(page = 1) {
    const result = await reviewRequest(`${reviewId}/comments/?parent=${comment.id}&page=${page}`);
    setData(current => ({ ...result, results: page > 1 ? [...new Map([...current.results, ...result.results].map(item => [item.id, item])).values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id) : result.results }));
  }
  async function show(write = false) {
    setBusy(true); setError(""); setOpen(true); if (write) setWriting(true);
    try { await fetchReplies(); }
    catch (failure) { setError(failure.message); } finally { setBusy(false); }
    if (write) input.current?.focus();
  }
  async function post(event) {
    event.preventDefault(); if (busy || !text.trim()) return;
    setBusy(true); setError("");
    try {
      const result = await reviewRequest(`${reviewId}/comments/`, "POST", { text: text.trim(), clientId, parentId: comment.id });
      onCounts(result.counts); setText(""); setClientId(crypto.randomUUID()); setWriting(false);
      // Keep the submitted reply visible even when a long thread spans several pages.
      setData(current => ({ count: (current?.count || 0) + (current?.results.some(item => item.id === result.comment.id) ? 0 : 1), nextPage: current?.nextPage || null, results: [...(current?.results || []).filter(item => item.id !== result.comment.id), result.comment] }));
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  async function remove(id) {
    setBusy(true); setError("");
    try { await reviewRequest(`${reviewId}/comments/${id}/`, "DELETE"); await fetchReplies(); onCounts(await reviewRequest(`${reviewId}/reactions/`)); setDeleting(null); }
    catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  const count = data?.count ?? comment.replyCount ?? 0;
  return <div className="comment-thread"><div className="comment-thread-actions">{!comment.deleted && <button type="button" disabled={busy} onClick={() => show(true)}>Reply</button>}{(count > 0 || open) && <button type="button" disabled={busy} aria-expanded={open} onClick={() => open ? setOpen(false) : show()}>{open ? "Hide replies" : `View replies (${count})`}</button>}</div>{error && <p className="auth-error" role="alert">{error}</p>}{open && <div className="comment-replies"><ul>{data?.results.map(reply => <li key={reply.id}><a className="feed-avatar" href={`#/profile/${reply.author.id}`} aria-label={`View ${reply.author.username}’s profile`}>{reply.author.avatarUrl ? <img src={reply.author.avatarUrl} width="28" height="28" alt="" /> : reply.author.username[0].toUpperCase()}</a><div><a className="comment-author" href={`#/profile/${reply.author.id}`}>{reply.author.username}</a><p>{reply.text}</p><time dateTime={reply.createdAt}>{new Date(reply.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</time>{reply.canDelete && <button type="button" className="comment-delete" disabled={busy} onClick={() => setDeleting(reply.id)}>Delete reply</button>}{deleting === reply.id && <div className="comment-delete-confirm"><span>Delete this reply?</span><button type="button" disabled={busy} onClick={() => remove(reply.id)}>Confirm delete</button><button type="button" disabled={busy} onClick={() => setDeleting(null)}>Keep</button></div>}</div></li>)}</ul>{data?.nextPage && <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { await fetchReplies(data.nextPage); } catch (failure) { setError(failure.message); } finally { setBusy(false); } }}>More replies</button>}{writing && !comment.deleted && <form className="comment-form reply-form" onSubmit={post}><label htmlFor={`reply-${comment.id}`}>Reply to {comment.author.username}</label><textarea ref={input} id={`reply-${comment.id}`} value={text} maxLength="1000" rows="2" disabled={busy} onChange={event => { setText(event.target.value); setClientId(crypto.randomUUID()); }} placeholder="Write a reply…" /><div><button type="button" className="text-button" disabled={busy} onClick={() => { setWriting(false); setText(""); setClientId(crypto.randomUUID()); }}>Cancel reply</button><button className="collection-button" disabled={busy || !text.trim()}>{busy ? "Saving…" : "Post reply"}</button></div></form>}</div>}</div>;
}
