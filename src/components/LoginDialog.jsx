import { useEffect, useRef, useState } from "react";

export default function LoginDialog({ onClose, auth }) {
  const dialog = useRef(null);
  const [signup, setSignup] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [fields, setFields] = useState({});
  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement;
    element.showModal();
    element.querySelector("h2")?.focus({ preventScroll: true });
    return () => { element.close(); if (opener?.isConnected) opener.focus({ preventScroll: true }); };
  }, []);
  function switchForm() {
    setSignup(value => !value); setPassword(""); setConfirmation(""); setError(""); setFields({});
    dialog.current?.querySelector("h2")?.focus({ preventScroll: true });
  }
  async function submit(event) {
    event.preventDefault();
    if (auth.busy) return;
    setError(""); setFields({});
    if (signup && password !== confirmation) { setError("Your passwords don’t match."); return; }
    try {
      if (signup) await auth.signup({ username: username.trim(), email: email.trim(), inviteCode: inviteCode.trim(), password1: password, password2: confirmation });
      else await auth.login(username.trim(), password);
      setPassword(""); setConfirmation(""); onClose();
    } catch (failure) {
      setPassword(""); setConfirmation(""); setError(failure.message); setFields(failure.fields || {});
    }
  }
  async function logout() {
    setError("");
    try { await auth.logout(); onClose(); }
    catch (failure) { setError(failure.message); }
  }
  function fieldError(name) {
    if (!fields[name]?.length) return null;
    return <span id={`auth-error-${name}`} className="auth-field-error">{fields[name].map(item => item.message).join(" ")}</span>;
  }
  const errorProps = name => fields[name]?.length ? { "aria-invalid": true, "aria-describedby": `auth-error-${name}` } : {};
  return (
    <dialog ref={dialog} className="login-dialog" aria-labelledby="login-title" aria-describedby="login-description" onClose={onClose} onClick={event => { if (event.target === event.currentTarget && !auth.busy) onClose(); }} onCancel={event => { if (auth.busy) event.preventDefault(); }}>
      <div className="login-content">
        <button className="dialog-close" type="button" onClick={onClose} aria-label="Close login" disabled={auth.busy}>×</button>
        <span className="brand-record login-record" aria-hidden="true" />
        <h2 id="login-title" tabIndex="-1">{auth.user ? "Your account" : signup ? "Join the shelf." : "Welcome back."}</h2>
        <p id="login-description">{!auth.enabled ? "This public demo saves collections and reviews in your browser. Account sign-in is not available here yet." : auth.user ? `Signed in as ${auth.user.username}. Reviews are saved to your account. Collections and wishlists are still saved on this device.` : signup ? "Have an invite? Create your account to join the private beta." : "Log in with your username and password."}</p>
        {auth.user?.isStaff && <a className="primary-link admin-link" href="/admin/" target="_blank" rel="noreferrer">Open admin ↗</a>}
        {error && <div className="auth-error" role="alert"><p>{error}</p>{Object.entries(fields).map(([name, messages]) => <p key={name}>{name === "__all__" ? "" : `${({ password1: "Password", password2: "Confirm password", username: "Username", email: "Email" })[name] || name}: `}{messages.map(item => item.message).join(" ")}</p>)}</div>}
        {!auth.enabled ? <button className="collection-button" onClick={onClose}>Keep exploring ↗</button> : auth.user ? <button className="collection-button" type="button" onClick={logout} disabled={auth.busy}>{auth.busy ? "Logging out…" : "Log out"}</button> : <>
          <form className="login-form" onSubmit={submit} aria-busy={auth.busy}>
            <label htmlFor="login-username">Username</label><input id="login-username" name="username" autoComplete="username" required maxLength="150" value={username} onChange={event => setUsername(event.target.value)} disabled={auth.busy} autoCapitalize="none" spellCheck="false" {...errorProps("username")} />{fieldError("username")}
            {signup && <><label htmlFor="signup-email">Email</label><input id="signup-email" name="email" type="email" autoComplete="email" required maxLength="254" value={email} onChange={event => setEmail(event.target.value)} disabled={auth.busy} autoCapitalize="none" {...errorProps("email")} />{fieldError("email")}</>}
            <label htmlFor="login-password">Password</label><input id="login-password" name={signup ? "password1" : "password"} type="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={signup ? 8 : undefined} maxLength="1024" value={password} onChange={event => setPassword(event.target.value)} disabled={auth.busy} {...errorProps("password1")} />{fieldError("password1")}
            {signup && <>
              <p className="auth-password-hint">Use at least 8 characters. Avoid common passwords or anything too similar to your username.</p>
              <label htmlFor="signup-confirmation">Confirm password</label><input id="signup-confirmation" name="password2" type="password" autoComplete="new-password" required maxLength="1024" value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={auth.busy} {...errorProps("password2")} />{fieldError("password2")}
              <label htmlFor="signup-invite">Invite code</label><input id="signup-invite" name="inviteCode" autoComplete="off" required maxLength="128" value={inviteCode} onChange={event => setInviteCode(event.target.value)} disabled={auth.busy} autoCapitalize="none" spellCheck="false" />
            </>}
            <button className="collection-button" type="submit" disabled={auth.busy || auth.loading}>{auth.busy ? signup ? "Creating account…" : "Logging in…" : auth.loading ? "Checking session…" : signup ? "Create account" : "Log in"}</button>
          </form>
          <button type="button" className="auth-switch text-button" onClick={switchForm} disabled={auth.busy}>{signup ? "Already a member? Log in" : "Have an invite? Sign up"}</button>
        </>}
      </div>
    </dialog>
  );
}
