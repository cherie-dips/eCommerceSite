import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "../styles/Product.css";

export default function RetailerProducts() {
  const [products, setProducts] = useState([]);
  // Upload form moved to /retailer/upload

  useEffect(() => {
    axios.get("http://localhost:5050/api/products").then((res) => setProducts(res.data));
  }, []);

  const handleCreate = null;

  return (
    <div className="page-content products-page">
      <h1 className="products-heading">Retailer: Manage Products</h1>

      {/* Add product moved to Upload page; access via navbar icon */}

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
          </div>
        ))}
      </div>
    </div>
  );
}


