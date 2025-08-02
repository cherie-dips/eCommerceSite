import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "../styles/AuthPages.css";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5050/api/auth/register", {
        username,
        email,
        password,
      });
      alert("Registration successful! Please login.");
      navigate("/login");
    } catch (err) {
      console.error(err);
      alert("Registration failed!");
    }
  };

  return (
    <div className="auth-page-content">
      <div className="auth-page-container">
        {/* Purple Branding Left Side */}
        <div className="auth-branding">
          <h1 className="auth-branding-title">Flagzen</h1>
          <p className="auth-branding-text">
            Ready to take your startup to the next level? Join <strong>Flagzen</strong> today.
          </p>
          <div className="auth-members">
            {/* You can place member avatars here if needed */}
            <p>9.5k members</p>
          </div>
        </div>

        {/* Form White Right Side */}
        <div className="auth-form-container">
          <form onSubmit={handleRegister} className="form-card">
            <h2 className="form-title">Sign Up</h2>
            <p className="form-subtext">Get started with an account on Flagzen</p>

            <label>Username</label>
            <input
              type="text"
              placeholder="Your full name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <label>Email</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label>Password</label>
            <input
              type="password"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button type="submit" className="form-button">Sign Up</button>

            <p className="auth-footer-text">
              Already have an account?{" "}
              <Link to="/login" className="auth-link">
                Sign In
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
