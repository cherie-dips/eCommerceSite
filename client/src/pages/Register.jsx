import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail]     = useState("");
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
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 20 }}>
      <h2 style={{ marginBottom: 8 }}>Sign Up</h2>
      <p style={{ marginTop: 0, color: "#666" }}>Create your account</p>
      <form onSubmit={handleRegister} style={{ display: "grid", gap: 10 }}>
        <label>Username</label>
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <label>Sign up as</label>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="user">Customer</option>
          <option value="retailer">Retailer</option>
        </select>
        <button type="submit" style={{ background: "#7c0034", color: "#ffffff", border: "none", padding: "0.75rem 1rem", borderRadius: 8, fontWeight: 600 }}>Sign Up</button>
        <p style={{ margin: 0 }}>
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </form>
    </div>
  );
}
