import React from "react";
import { Link } from "react-router-dom";
import smartwatch from "../assets/smartwatch.avif";
import speaker from "../assets/bluetooth-speaker.webp";
import headphones from "../assets/Wireless-Headphones.webp";

// Mock product data (temporary until backend is connected)
const products = [
  {
    _id: "1",
    name: "Wireless Headphones",
    image: headphones,
    price: 2999,
  },
  {
    _id: "2",
    name: "Smartwatch Pro",
    image: smartwatch,
    price: 4999,
  },
  {
    _id: "3",
    name: "Bluetooth Speaker",
    image: speaker,
    price: 1999,
  },
];

export default function Products() {
  return (
    <div className="page-content">
      <h1>All Products</h1>
      <div className="products">
        {products.map((product) => (
          <div key={product._id} className="product-card">
            <img src={product.image} alt={product.name} />
            <h3>
              <Link to={`/products/${product._id}`}>{product.name}</Link>
            </h3>
            <p>₹{product.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}