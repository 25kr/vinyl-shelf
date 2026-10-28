import { useEffect, useRef, useState } from "react";

export default function LoginDialog({ onClose, auth }) {
  const dialog = useRef(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement;
    element.showModal();
    element.querySelector("h2")?.focus({ preventScroll: true });
    return () => { element.close(); if (opener?.isConnected) opener.focus({ preventScroll: true }); };
  }, []);
  async function submit(event) {
    event.preventDefault();
    if (auth.busy) return;
    setError("");
    try { await auth.login(username.trim(), password); setPassword(""); onClose(); }
    catch (failure) { setPassword(""); setError(failure.message); }
  }
  async function logout() {
    setError("");
    try { await auth.logout(); onClose(); }
    catch (failure) { setError(failure.message); }
  }
  return (
    <dialog ref={dialog} className="login-dialog" aria-labelledby="login-title" aria-describedby="login-description" onClose={onClose} onClick={event => { if (event.target === event.currentTarget && !auth.busy) onClose(); }} onCancel={event => { if (auth.busy) event.preventDefault(); }}>
      <div className="login-content">
        <button className="dialog-close" type="button" onClick={onClose} aria-label="Close login" disabled={auth.busy}>×</button>
        <span className="brand-record login-record" aria-hidden="true" />
        <h2 id="login-title" tabIndex="-1">{auth.user ? "Your account" : "Welcome back."}</h2>
        <p id="login-description">{!auth.enabled ? "This public demo saves collections and reviews in your browser. Account sign-in is not available here yet." : auth.user ? `Signed in as ${auth.user.username}. Reviews are saved to your account. Collections and wishlists are still saved on this device.` : "Log in with your username and password. New accounts are not open for registration yet."}</p>
        {auth.user?.isStaff && <a className="primary-link admin-link" href="/admin/" target="_blank" rel="noreferrer">Open admin ↗</a>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        {!auth.enabled ? <button className="collection-button" onClick={onClose}>Keep exploring ↗</button> : auth.user ? <button className="collection-button" type="button" onClick={logout} disabled={auth.busy}>{auth.busy ? "Logging out…" : "Log out"}</button> :
          <form className="login-form" onSubmit={submit} aria-busy={auth.busy}>
            <label htmlFor="login-username">Username</label><input id="login-username" name="username" autoComplete="username" required maxLength="150" value={username} onChange={event => setUsername(event.target.value)} disabled={auth.busy} autoCapitalize="none" spellCheck="false" />
            <label htmlFor="login-password">Password</label><input id="login-password" name="password" type="password" autoComplete="current-password" required maxLength="1024" value={password} onChange={event => setPassword(event.target.value)} disabled={auth.busy} />
            <button className="collection-button" type="submit" disabled={auth.busy || auth.loading}>{auth.busy ? "Logging in…" : auth.loading ? "Checking session…" : "Log in"}</button>
          </form>}
      </div>
    </dialog>
  );
}
