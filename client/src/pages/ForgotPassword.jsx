import { useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../utils/api";
import "../styles/AuthPages.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page-container-new">
      <div className="auth-form-wrapper">
        <div className="auth-logo"><h1>FLAGZEN</h1></div>
        {sent ? (
          <div className="auth-form-new">
            <h2>Check your email</h2>
            <p>If an account exists for <b>{email}</b>, we've sent a link to choose a new password. The link works for 1 hour.</p>
            <Link to="/login" className="auth-link-text">Back to login</Link>
          </div>
        ) : (
          <form className="auth-form-new" onSubmit={submit}>
            <h2>Forgot your password?</h2>
            <p className="muted">Enter your email and we'll send you a link to choose a new one.</p>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <div className="input-wrapper">
                <span className="input-icon">✉</span>
                <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="your@email.address" />
              </div>
            </div>
            {error && <div className="form-error">{error}</div>}
            <button className="auth-button-primary" disabled={busy}>{busy ? "Sending..." : "Send reset link"}</button>
            <div className="auth-links"><p><Link to="/login" className="auth-link-text">Back to login</Link></p></div>
          </form>
        )}
      </div>
    </div>
  );
}
