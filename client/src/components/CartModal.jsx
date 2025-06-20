// client/src/components/CartModal.jsx

import React from "react";
import { useCart } from "../context/CartContext";
import "../index.css"; 

export default function CartModal() {
  const { cartItems, removeFromCart, toggleCart } = useCart();

  const total = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <div className="cart-modal-backdrop" onClick={toggleCart}>
      <div className="cart-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Your Cart</h2>
        {cartItems.length === 0 ? (
          <p>Your cart is empty.</p>
        ) : (
          <ul>
            {cartItems.map((item) => (
              <li key={item._id}>
                <div className="cart-item">
                  <img src={item.image} alt={item.name} width="50" />
                  <div>
                    <strong>{item.name}</strong><br />
                    ₹{item.price} × {item.quantity} = ₹{item.price * item.quantity}
                  </div>
                  <button onClick={() => removeFromCart(item._id)}>❌</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <hr />
        <h3>Total: ₹{total}</h3>
        <button className="checkout-button">Checkout</button>
      </div>
    </div>
  );
}