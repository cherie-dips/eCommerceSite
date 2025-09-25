import { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const { login } = useAuth();
  const navigate = useNavigate();

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
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 20 }}>
      <h2 style={{ marginBottom: 8 }}>Sign In</h2>
      <p style={{ marginTop: 0, color: "#666" }}>Please log in to continue</p>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10 }}>
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <label>Login as</label>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="user">Customer</option>
          <option value="retailer">Retailer</option>
        </select>
        <button type="submit" style={{ background: "#7c0034", color: "#ffffff", border: "none", padding: "0.75rem 1rem", borderRadius: 8, fontWeight: 600 }}>Sign In</button>
        <p style={{ margin: 0 }}>
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </form>
    </div>
  );
};

export default Login;
