import { useEffect, useRef } from "react";

export default function LoginDialog({ onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  return (
    <dialog ref={dialog} className="login-dialog" aria-labelledby="login-title" aria-describedby="login-description" onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="login-content">
        <button className="dialog-close" onClick={onClose} aria-label="Close login">×</button>
        <span className="brand-record login-record" aria-hidden="true" />
        <p className="eyebrow">A LITTLE SOMETHING TO LOOK FORWARD TO</p>
        <h2 id="login-title">Your shelf,<br /><em>wherever you are.</em></h2>
        <p id="login-description">Accounts are coming soon. For now, your collection, wishlist and stories stay saved in this browser.</p>
        <p className="login-note">Login preview · Sign-in isn’t available yet.</p>
        <button className="collection-button" onClick={onClose}>Keep exploring ↗</button>
      </div>
    </dialog>
  );
}
