import React, { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Link, useNavigate } from "react-router-dom";
import api, { errorMessage } from "../utils/api";
import AddressForm, { formatAddress } from "../components/AddressForm";
import "../index.css";
import "../styles/cartPage.css";

export default function CartPage() {
  const {
    cartItems,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    address: selectedAddress,
    setAddress: setSelectedAddress,
    discountCode,
    discountRate,
    applyDiscount,
    subtotal,
    discountAmount,
    total,
    itemCount,
  } = useCart();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [discountInput, setDiscountInput] = useState(discountCode || "");
  const [discountMessage, setDiscountMessage] = useState(
    discountCode ? `${discountRate * 100}% discount applied` : null
  );
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  // Saved addresses for logged-in customers (the default one is picked automatically)
  useEffect(() => {
    if (!user) return;
    api
      .get("/users/me/addresses")
      .then((res) => {
        setSavedAddresses(res.data);
        if (!selectedAddress && res.data.length) {
          setSelectedAddress(res.data.find((a) => a.isDefault) || res.data[0]);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleApplyCoupon = () => {
    const rate = applyDiscount(discountInput);
    setDiscountMessage(rate ? `${rate * 100}% discount applied` : "Invalid code");
  };

  const handleSaveAddress = async (address) => {
    if (user) {
      try {
        const res = await api.post("/users/me/addresses", address);
        setSavedAddresses(res.data.addresses);
        setSelectedAddress(res.data.address);
        toast.success("Address saved to your account.");
      } catch (err) {
        toast.error(errorMessage(err, "The address could not be saved."));
        return;
      }
    } else {
      setSelectedAddress(address);
    }
    setShowForm(false);
    setCheckoutError("");
  };

  const handleCheckout = () => {
    if (!cartItems.length) return;
    if (!selectedAddress) {
      setCheckoutError("Please add a delivery address before checking out.");
      return;
    }
    navigate("/checkout");
  };

  const sameAddress = (a, b) => a && b && (a._id ? a._id === b._id : formatAddress(a) === formatAddress(b));

  return (
    <div className="page-content">
      <h2 className="cart-heading">Your Cart</h2>
      <div className="cart-container">
        <div className="cart-left">
          {/* Address Section */}
          <div className="address-section">
            <h4 style={{ marginTop: 0 }}>Delivery address</h4>
            {savedAddresses.length > 0 && !showForm && (
              <div className="address-options">
                {savedAddresses.map((a) => (
                  <label key={a._id} className={`address-option ${sameAddress(selectedAddress, a) ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="address"
                      checked={Boolean(sameAddress(selectedAddress, a))}
                      onChange={() => setSelectedAddress(a)}
                    />
                    <span>
                      <strong>{a.name || a.label}</strong> {a.phone && <span className="muted small">· {a.phone}</span>}
                      <br />
                      <span className="small">{formatAddress(a)}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
            {!user && selectedAddress && !showForm && (
              <div className="saved-address-card">
                <p><strong>{selectedAddress.name}</strong> · {selectedAddress.phone}</p>
                <p>{formatAddress(selectedAddress)}</p>
              </div>
            )}
            {showForm ? (
              <AddressForm
                initial={!user ? selectedAddress : undefined}
                onSave={handleSaveAddress}
                onCancel={() => setShowForm(false)}
                saveLabel="Use this address"
              />
            ) : (
              <>
                {!selectedAddress && savedAddresses.length === 0 && <p>No address saved</p>}
                <button className="add-address-btn" onClick={() => setShowForm(true)}>
                  {!user && selectedAddress ? "Edit Address" : "Add new address"}
                </button>
              </>
            )}
          </div>

          {/* Cart Section */}
          <div className="cart-section">
            <h3>Cart ({itemCount} item{itemCount === 1 ? "" : "s"})</h3>
            {cartItems.length === 0 ? (
              <p>
                Your cart is empty. <Link to="/products">Browse products</Link>
              </p>
            ) : (
              cartItems.map((item) => (
                <div className="cart-item-card" key={item.cartId}>
                  <Link to={item.designId ? `/products/${item._id}?design=${item.designId}` : `/products/${item._id}`}>
                    <img src={item.image} alt={item.name} className="cart-img" />
                  </Link>
                  <div className="cart-info">
                    <strong>{item.name}</strong>
                    {item.designId && <p><span className="badge badge-brand">Your design</span></p>}
                    <p>₹{item.price} per item</p>
                    <button
                      className="cart-remove"
                      onClick={() => removeFromCart(item.cartId)}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="cart-quantity">
                    <div className="quantity-controls">
                      <button onClick={() => decreaseQuantity(item.cartId)} aria-label="Fewer">-</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => increaseQuantity(item.cartId)} aria-label="More">+</button>
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
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                placeholder="Enter code"
              />
              <button onClick={handleApplyCoupon}>Apply</button>
            </div>
            {discountMessage && (
              <p className="discount-msg" style={discountMessage === "Invalid code" ? { color: "#dc2626" } : undefined}>
                {discountMessage}
              </p>
            )}
            <div className="summary-line">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="summary-line">
                <span>Discount ({discountCode})</span>
                <span>-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="summary-line">
              <span>Shipping</span>
              <span>Free</span>
            </div>
            <div className="summary-line total">
              <strong>Total</strong>
              <strong>₹{total.toFixed(2)}</strong>
            </div>
            <button
              className="checkout-button full"
              onClick={handleCheckout}
              disabled={!cartItems.length}
            >
              Checkout
            </button>
            {checkoutError && (
              <p className="discount-msg" style={{ color: "#dc2626", marginTop: "0.75rem" }}>
                {checkoutError}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
