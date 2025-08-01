import React, { useState } from "react";
import { useCart } from "../context/CartContext";
import { Link } from "react-router-dom";
import "../index.css";

export default function CartPage() {
  const { cartItems, increaseQuantity, decreaseQuantity } = useCart();
  const [discountCode, setDiscountCode] = useState("");
  const [appliedCode, setAppliedCode] = useState(null);

  const handleApplyCoupon = () => {
    if (discountCode === "SAVE10") {
      setAppliedCode("10% discount applied");
    } else {
      setAppliedCode("Invalid code");
    }
  };

  const total = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const discountedTotal =
    appliedCode === "10% discount applied"
      ? (total * 0.9).toFixed(2)
      : total.toFixed(2);

  return (
    <div className="page-content">
      <h2 className = "cart-heading">Checkout</h2>
      <div className="cart-container">
        <div className="cart-left">
          {/* Address */}
          <div className="address-section">
            <p>No address saved</p>
            <button className="add-address-btn">Add new location</button>
          </div>

          {/* Cart */}
          <div className="cart-section">
            <h3>Cart ({cartItems.length} items)</h3>
            {cartItems.length === 0 ? (
              <p>
                Your cart is empty. <Link to="/products">Browse products</Link>
              </p>
            ) : (
              cartItems.map((item) => (
                <div className="cart-item-card" key={item._id}>
                  <img src={item.image} alt={item.name} className="cart-img" />
                  <div className="cart-info">
                    <strong>{item.name}</strong>
                    <p>₹{item.price} per item</p>
                  </div>
                  <div className = "cart-quantity">
                    <div className="quantity-controls">
                      <button onClick={() => decreaseQuantity(item._id)}>-</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => increaseQuantity(item._id)}>+</button>
                    </div>
                    <div className="item-total">
                        ₹{(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="cart-right">
          <div className="summary-section">
            <h3>Summary</h3>

            <label className="discount-label">Discount Code</label>
            <div className="discount-input">
              <input
                type="text"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                placeholder="Enter code"
              />
              <button onClick={handleApplyCoupon}>Apply</button>
            </div>
            {appliedCode && <p className="discount-msg">{appliedCode}</p>}

            <div className="summary-line">
              <span>Subtotal</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
            <div className="summary-line">
              <span>Shipping</span>
              <span>Free</span>
            </div>
            <div className="summary-line total">
              <strong>Total</strong>
              <strong>₹{discountedTotal}</strong>
            </div>

            <button className="checkout-button full">Checkout</button>
          </div>
        </div>
      </div>
    </div>
  );
}