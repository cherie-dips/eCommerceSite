import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link, useLocation } from "react-router-dom";
import api, { errorMessage } from "../utils/api";
import GoogleSignInButton from "../components/GoogleSignInButton";
import { useToast } from "../context/ToastContext";
import "../styles/AuthPages.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  // Page the user was trying to open before being sent here
  const from = location.state?.from;

  const goAfterLogin = (loggedIn) => {
    if (from) navigate(from, { replace: true });
    else if (loggedIn?.role === "retailer") navigate("/retailer/products", { replace: true });
    else if (loggedIn?.role === "admin") navigate("/admin", { replace: true });
    else navigate("/", { replace: true });
  };

  // Redirect if already logged in
  useEffect(() => {
    if (user) goAfterLogin(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleGoogleSignIn = async (response) => {
    try {
      const endpoint = role === "retailer" ? "/retailer/google" : "/auth/google";
      const res = await api.post(endpoint, { token: response.credential });
      login(res.data.user, res.data.token);
      toast.success(`Welcome, ${res.data.user.username}!`);
    } catch (err) {
      console.error("Google sign-in failed:", err);
      setError(errorMessage(err, "Google sign-in failed. Please try again."));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const endpoint = role === "retailer" ? "/retailer/login" : "/auth/login";
      const res = await api.post(endpoint, { email, password });
      login(res.data.user, res.data.token);
      toast.success(`Welcome back, ${res.data.user.username}!`);
    } catch (err) {
      setError(
        err.response?.status === 401
          ? "Wrong email or password."
          : errorMessage(err, "Login failed. Please try again.")
      );
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
          
          <form onSubmit={handleSubmit} className="auth-form-new">
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
                  placeholder="Your secret password"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Login as</label>
              <select 
                className="form-select"
                value={role} 
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="user">Customer</option>
                <option value="retailer">Retailer</option>
              </select>
            </div>

            {error && <div className="form-error" role="alert">{error}</div>}
            {from && !error && <div className="notice notice-info small">Please log in to continue.</div>}

            <button type="submit" className="auth-button-primary" disabled={busy}>
              {busy ? "Logging in..." : "Log in"}
            </button>
            <div style={{ textAlign: "right", marginTop: "0.5rem" }}>
              <Link to="/forgot-password" className="auth-link-text small">Forgot password?</Link>
            </div>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <GoogleSignInButton onCredential={handleGoogleSignIn} />

            <div className="auth-links">
              <p>
                Don't have an account yet?{" "}
                <Link to="/register" state={{ from }} className="auth-link-text">Create a new one</Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default Login;
