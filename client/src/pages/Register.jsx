import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { errorMessage } from "../utils/api";
import GoogleSignInButton from "../components/GoogleSignInButton";
import { useToast } from "../context/ToastContext";
import "../styles/AuthPages.css";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const from = location.state?.from;

  const handleGoogleSignIn = async (response) => {
    try {
      const endpoint = role === "retailer" ? "/retailer/google" : "/auth/google";
      const res = await api.post(endpoint, { token: response.credential });

      const { user: userData, token } = res.data;
      login(userData, token);
      toast.success(`Welcome, ${userData.username}!`);
    } catch (err) {
      console.error("Google sign-up failed:", err);
      setError(errorMessage(err, "Google sign-up failed. Please try again."));
    }
  };

  // Redirect if already logged in
  useEffect(() => {
    if (!user) return;
    if (from) navigate(from, { replace: true });
    else navigate(user.role === "retailer" ? "/retailer/products" : "/", { replace: true });
  }, [user, navigate, from]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const endpoint = role === "retailer" ? "/retailer/register" : "/auth/register";
      await api.post(endpoint, { username, email, password });
      // Log straight in, so the user doesn't have to type everything again
      const res = await api.post("/auth/login", { email, password });
      login(res.data.user, res.data.token);
      toast.success(
        role === "retailer"
          ? "Account created! We've emailed you a confirmation link. The Flagzen team will approve your seller account soon."
          : "Account created! We've emailed you a link to confirm your email."
      );
    } catch (err) {
      console.error(err);
      setError(errorMessage(err, "Registration failed. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="auth-page-container-new">
        <div className="auth-form-wrapper">
          <div className="auth-logo">
            <h1>FLAGZEN</h1>
          </div>

          <form onSubmit={handleRegister} className="auth-form-new">
            <div className="form-group">
              <label className="form-label">Username</label>
              <div className="input-wrapper">
                <span className="input-icon">👤</span>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Your full name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email address</label>
              <div className="input-wrapper">
                <span className="input-icon">✉</span>
                <input
                  type="email"
                  className="form-input"
                  placeholder="your@email.address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  type="password"
                  className="form-input"
                  placeholder="At least 6 characters"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Sign up as</label>
              <select
                className="form-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="user">Customer</option>
                <option value="retailer">Retailer</option>
              </select>
            </div>

            {role === "retailer" && (
              <div className="notice notice-info small">Seller accounts are checked by the Flagzen team before you can list products.</div>
            )}
            {error && <div className="form-error" role="alert">{error}</div>}
            <button type="submit" className="auth-button-primary" disabled={busy}>
              {busy ? "Creating account..." : "Create new account"}
            </button>

            <div className="auth-divider">
              <span>or</span>
            </div>

            {/* Google Sign-In Button */}
            <GoogleSignInButton onCredential={handleGoogleSignIn} />

            <div className="auth-links">
              <p>
                Already have an account?{" "}
                <Link to="/login" state={{ from }} className="auth-link-text">
                  Sign In
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
