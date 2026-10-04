import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api, { errorMessage } from "../utils/api";
import { useToast } from "../context/ToastContext";
import "../styles/AuthPages.css";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const submit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const res = await api.post("/auth/reset-password", { token, password });
      toast.success(res.data.message);
      navigate("/login");
    } catch (err) {
      setError(errorMessage(err, "Your password could not be changed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page-container-new">
      <div className="auth-form-wrapper">
        <div className="auth-logo"><h1>FLAGZEN</h1></div>
        {!token ? (
          <div className="auth-form-new">
            <h2>This link is incomplete</h2>
            <p>Please open the full link from the email, or <Link to="/forgot-password">ask for a new one</Link>.</p>
          </div>
        ) : (
          <form className="auth-form-new" onSubmit={submit}>
            <h2>Choose a new password</h2>
            <div className="form-group">
              <label className="form-label">New password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input type="password" className="form-input" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="At least 6 characters" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Type it again</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input type="password" className="form-input" minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </div>
            </div>
            {error && <div className="form-error">{error} {/expired|invalid/i.test(error) && <Link to="/forgot-password">Get a new link</Link>}</div>}
            <button className="auth-button-primary" disabled={busy}>{busy ? "Saving..." : "Save new password"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
