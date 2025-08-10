import React, { useState } from "react";
import { useCart } from "../context/CartContext";
import { Link, useNavigate } from "react-router-dom"; 
import "../index.css";
import "../styles/cartPage.css";

export default function CartPage() {
  const { cartItems, increaseQuantity, decreaseQuantity } = useCart();
  const [discountCode, setDiscountCode] = useState("");
  const [appliedCode, setAppliedCode] = useState(null);

  // Modal visibility state
  const [showAddressModal, setShowAddressModal] = useState(false);
  // Address inputs state
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  // Stored saved address
  const [savedAddress, setSavedAddress] = useState(null);
  
  const navigate = useNavigate(); // <-- set up navigation

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

  const handleSaveAddress = () => {
    if (!address.trim() || !pincode.trim()) {
      alert("Please enter both address and pincode.");
      return;
    }
    setSavedAddress({ address: address.trim(), pincode: pincode.trim() });
    setShowAddressModal(false);
  };

  const handleCancelAddress = () => {
    setShowAddressModal(false);
  };

  const handleCheckout = () => {
    // Here you could also validate address, cart, etc!
    navigate("/checkout");
  };

  return (
    <div className="page-content">
      <h2 className="cart-heading">Checkout</h2>
      <div className="cart-container">
        <div className="cart-left">
          {/* Address Section */}
          <div className="address-section">
            {savedAddress ? (
              <div className="saved-address-card">
                <h4>Saved Address</h4>
                <p>{savedAddress.address}</p>
                <p>Pincode: {savedAddress.pincode}</p>
                <button
                  className="add-address-btn"
                  onClick={() => setShowAddressModal(true)}
                >
                  Edit Address
                </button>
              </div>
            ) : (
              <>
                <p>No address saved</p>
                <button
                  className="add-address-btn"
                  onClick={() => setShowAddressModal(true)}
                >
                  Add new location
                </button>
              </>
            )}
          </div>

          {/* Address Modal */}
          {showAddressModal && (
            <div className="modal-overlay">
              <div className="modal-card">
                <h3>Enter Your Address</h3>
                <label>Address</label>
                <textarea
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter your full address"
                />
                <label>Pincode</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="Enter pincode"
                />
                <div className="modal-buttons">
                  <button className="save-btn" onClick={handleSaveAddress}>
                    Save
                  </button>
                  <button className="cancel-btn" onClick={handleCancelAddress}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Cart Section */}
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
                  <div className="cart-quantity">
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
            <button className="checkout-button full" onClick={handleCheckout}>
              Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}