import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import "../styles/AuthPages.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === "retailer") {
        navigate("/retailer/products");
      } else {
        navigate("/");
      }
    }
  }, [user, navigate]);

  useEffect(() => {
    // Initialize Google Sign-In
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleGoogleSignIn
      });
    }
  }, []);

  const handleGoogleSignIn = async (response) => {
    try {
      const endpoint = role === "retailer" ? "http://localhost:5050/api/retailer/google" : "http://localhost:5050/api/auth/google";
      const res = await axios.post(endpoint, { 
        token: response.credential,
        role: role
      });
      login(res.data.user, res.data.token);
      if (res.data.user.role === "retailer") {
        navigate("/retailer/products");
      } else {
        navigate("/");
      }
    } catch (err) {
      console.error("Google sign-in failed:", err);
      alert("Google sign-in failed!");
    }
  };

  const handleGoogleClick = () => {
    if (window.google) {
      window.google.accounts.id.prompt();
    } else {
      alert("Google Sign-In not loaded. Please try again.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = role === "retailer" ? "http://localhost:5050/api/retailer/login" : "http://localhost:5050/api/auth/login";
      const res = await axios.post(endpoint, { email, password });
      login(res.data.user, res.data.token);
      if ((res.data.user?.role || role) === "retailer") {
        navigate("/retailer/products");
      } else {
        navigate("/");
      }
    } catch (err) {
      alert("Login failed!");
    }
  };

  return (
    <>
      <Navbar />
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

            <button type="submit" className="auth-button-primary">
              Login to dashboard
            </button>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <button type="button" className="auth-button-google" onClick={handleGoogleClick}>
              <span className="google-icon">G</span>
              Sign in with Google
            </button>

            <div className="auth-links">
              <p>
                Don't have an account yet?{" "}
                <Link to="/register" className="auth-link-text">Create a new one</Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default Login;
