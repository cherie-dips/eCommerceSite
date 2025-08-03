import { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import "../styles/AuthPages.css";
import authImage from "../assets/auth-image.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5050/api/auth/login", {
        email,
        password,
      });
      login(res.data.user, res.data.token);
      navigate("/");
    } catch (err) {
      alert("Login failed!");
    }
  };

  return (
    <div className="auth-page-content">
      <div className="auth-page-container">
        {/* Purple Branding Left Side */}
        <div className="auth-branding"
          style={{
          backgroundImage: `linear-gradient(135deg, rgba(36,36,36,0.6), rgba(40,40,41,0.6)), url(${authImage})`,
              backgroundPosition: "center center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "cover",
          }}
        >
          <h1 className="auth-branding-title">Flagzen</h1>
          <p className="auth-branding-text">
            Welcome back! We're glad to see you again.
          </p>
          <div className="auth-members">
            {/* Place members or graphics here if desired */}
            <p>9.5k members</p>
          </div>
        </div>

        {/* Form White Right Side */}
        <div className="auth-form-container">
          <form onSubmit={handleSubmit} className="form-card">
            <h2 className="form-title">Sign In</h2>
            <p className="form-subtext">Please log in to continue</p>

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
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button type="submit" className="form-button">Sign In</button>

            <p className="auth-footer-text">
              Don't have an account?{" "}
              <Link to="/register" className="auth-link">
                Register
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
