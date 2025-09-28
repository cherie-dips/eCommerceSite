import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import "../styles/AuthPages.css";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const endpoint = role === "retailer" ? "http://localhost:5050/api/retailer/register" : "http://localhost:5050/api/auth/register";
      await axios.post(endpoint, { username, email, password, role });
      alert("Registration successful! Please login.");
      navigate("/login");
    } catch (err) {
      console.error(err);
      alert("Registration failed!");
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
                  placeholder="Create a strong password"
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

            <button type="submit" className="auth-button-primary">
              Create new account
            </button>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <button type="button" className="auth-button-google">
              <span className="google-icon">G</span>
              Sign up with Google
            </button>

            <div className="auth-links">
              <p>
                Already have an account?{" "}
                <Link to="/login" className="auth-link-text">Sign In</Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
