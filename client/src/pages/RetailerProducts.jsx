import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import "../styles/Product.css";

export default function RetailerProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { token, user } = useAuth();

  useEffect(() => {
    const fetchRetailerProducts = async () => {
      try {
        setLoading(true);
        const response = await axios.get("http://localhost:5050/api/retailer-products", {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setProducts(response.data);
      } catch (err) {
        setError("Failed to fetch products: " + (err.response?.data?.error || err.message));
      } finally {
        setLoading(false);
      }
    };

    if (token && user?.role === 'retailer') {
      fetchRetailerProducts();
    } else if (!token || !user) {
      setLoading(false);
      setError("Please log in as a retailer to view your products");
    } else if (user?.role !== 'retailer') {
      setLoading(false);
      setError("Access denied. Retailer account required.");
    }
  }, [token, user]);

  if (loading) {
    return (
      <div className="page-content products-page">
        <h1 className="products-heading">Retailer: Manage Products</h1>
        <p>Loading your products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content products-page">
        <h1 className="products-heading">Retailer: Manage Products</h1>
        <p style={{ color: 'red' }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="page-content products-page">
      <h1 className="products-heading">Retailer: Manage Products</h1>
      
      {products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>You haven't uploaded any products yet.</p>
          <Link to="/retailer/upload" style={{ 
            background: '#007bff', 
            color: 'white', 
            padding: '10px 20px', 
            textDecoration: 'none', 
            borderRadius: '4px' 
          }}>
            Upload Your First Product
          </Link>
        </div>
      ) : (
        <div className="products-grid">
          {products.map((product) => (
            <div key={product._id} className="product-card">
              <Link to={`/products/${product._id}`} className="pc-img-link">
                <div className="pc-imgwrap">
                  <img src={product.image} alt={product.name} className="pc-img" />
                </div>
              </Link>
              <h3 className="pc-name">
                <Link to={`/products/${product._id}`}>{product.name}</Link>
              </h3>
              <p className="pc-price">₹{product.price}</p>
              <p className="pc-date" style={{ fontSize: '12px', color: '#666' }}>
                Added: {new Date(product.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


