import { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

export default function UploadProduct() {
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const { token } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5050/api/products", 
        { name, image, price: Number(price) },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      setMessage("Product uploaded successfully!");
      setName(""); setImage(""); setPrice("");
    } catch (err) {
      setMessage("Failed to upload product: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: "60px auto", padding: 20 }}>
      <h2 style={{ marginBottom: 16 }}>Upload Product</h2>
      <p style={{ marginTop: 0, color: "#666" }}>Add a new product to your catalog</p>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10 }}>
        <label>Product Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required />
        <label>Image URL</label>
        <input value={image} onChange={(e) => setImage(e.target.value)} required />
        <label>Price</label>
        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required />
        <button type="submit">Upload</button>
        {message && <p style={{ margin: 0 }}>{message}</p>}
      </form>
    </div>
  );
}


