import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import gpay from "../assets/gpay.png";
import applepay from "../assets/apple-pay.png";
import paypal from "../assets/paypal.png";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import api, { errorMessage } from "../utils/api";
import { formatAddress } from "../components/AddressForm";
import "../styles/CheckoutPage.css";

// Loads Razorpay's payment window script once.
function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Checkout() {
  const { cartItems, clearCart, address, discountCode, subtotal, discountAmount, total } = useCart();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [paymentMode, setPaymentMode] = useState(null); // "razorpay" | "test"
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [placedOrderId, setPlacedOrderId] = useState(null);

  useEffect(() => {
    api.get("/health").then((res) => setPaymentMode(res.data.payments)).catch(() => setPaymentMode("test"));
  }, []);

  const finish = (orderId) => {
    clearCart();
    setPlacedOrderId(orderId);
    toast.success("Order placed! Thank you.");
  };

  const payWithRazorpay = async (orderId, payment) => {
    const loaded = await loadRazorpay();
    if (!loaded) {
      await api.post(`/orders/${orderId}/cancel`).catch(() => {});
      throw new Error("The payment window could not be opened. Check your internet connection and try again.");
    }
    await new Promise((resolve, reject) => {
      const rzp = new window.Razorpay({
        key: payment.keyId,
        order_id: payment.razorpayOrderId,
        amount: payment.amount,
        currency: payment.currency,
        name: "Flagzen",
        description: `Order ${orderId}`,
        prefill: payment.prefill,
        theme: { color: "#7c0034" },
        handler: async (response) => {
          try {
            await api.post(`/orders/${orderId}/verify-payment`, response);
            resolve();
          } catch (err) {
            reject(new Error(errorMessage(err, "We couldn't confirm your payment. If money was taken, it will be refunded.")));
          }
        },
        modal: {
          // Closed without paying: cancel the order so the stock is freed straight away
          ondismiss: async () => {
            await api.post(`/orders/${orderId}/cancel`).catch(() => {});
            reject(new Error("Payment cancelled. Your order was not placed."));
          },
        },
      });
      rzp.on("payment.failed", (resp) => {
        toast.error(resp?.error?.description || "The payment failed. You can try again in the payment window.");
      });
      rzp.open();
    });
  };

  const placeOrder = async () => {
    if (!user) {
      navigate("/login", { state: { from: "/checkout" } });
      return;
    }
    if (!cartItems.length) {
      setError("Your cart is empty.");
      return;
    }
    if (!address) {
      setError("Please add a delivery address in your cart first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await api.post("/orders", {
        items: cartItems.map((item) => ({ productId: item._id, quantity: item.quantity, designId: item.designId })),
        address,
        discountCode: discountCode || undefined,
      });
      const { orderId, payment } = res.data;
      if (payment.provider === "razorpay") await payWithRazorpay(orderId, payment);
      finish(orderId);
    } catch (err) {
      console.error("Failed to place order:", err);
      setError(err.response ? errorMessage(err, "Your order could not be placed. You have not been charged.") : err.message);
    } finally {
      setBusy(false);
    }
  };

  if (placedOrderId) {
    return (
      <div className="page page-narrow">
        <div className="card" style={{ textAlign: "center" }}>
          <h1 style={{ marginTop: 0 }}>🎉 Order placed!</h1>
          <p>Your order ID is <b>{placedOrderId}</b>. We've emailed you a confirmation.</p>
          <div className="row" style={{ justifyContent: "center" }}>
            <Link to="/orders" className="btn btn-primary">Track your order</Link>
            <Link to="/products" className="btn btn-secondary">Keep shopping</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Checkout</h1>
          <p>Check your order, then pay securely.</p>
        </div>
      </div>

      {cartItems.length === 0 ? (
        <div className="empty">
          <h3>Your cart is empty</h3>
          <Link to="/products" className="btn btn-primary">Browse products</Link>
        </div>
      ) : (
        <div className="checkout-grid">
          <div className="stack">
            <div className="card">
              <div className="row-between">
                <h2 className="section-title">Delivery address</h2>
                <Link to="/cart" className="small">Change</Link>
              </div>
              {address ? (
                <p style={{ margin: 0 }}>
                  <strong>{address.name}</strong>{address.phone && ` · ${address.phone}`}
                  <br />
                  {formatAddress(address)}
                </p>
              ) : (
                <div className="notice notice-warning">No delivery address yet. <Link to="/cart">Add one in your cart.</Link></div>
              )}
            </div>

            <div className="card">
              <h2 className="section-title">Items</h2>
              {cartItems.map((item) => (
                <div key={item.cartId} className="checkout-line">
                  <img src={item.image} alt="" className="thumb" />
                  <div style={{ flex: 1 }}>
                    <strong>{item.name}</strong>
                    {item.designId && <span className="badge badge-brand" style={{ marginLeft: 8 }}>Your design</span>}
                    <div className="muted small">{item.quantity} × ₹{item.price}</div>
                  </div>
                  <strong>₹{(item.price * item.quantity).toFixed(2)}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="card checkout-summary-card">
            <h2 className="section-title">Payment</h2>
            <div className="summary-row"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
            {discountAmount > 0 && (
              <div className="summary-row"><span>Discount ({discountCode})</span><span>-₹{discountAmount.toFixed(2)}</span></div>
            )}
            <div className="summary-row"><span>Shipping</span><span>Free</span></div>
            <div className="summary-row summary-total"><span>Total</span><span>₹{total.toFixed(2)}</span></div>

            {paymentMode === "test" && (
              <div className="notice notice-warning small">
                Test mode: no real payment is taken. (Add Razorpay keys on the server to take real payments.)
              </div>
            )}
            {error && <div className="notice notice-danger small">{error}</div>}

            <button className="btn btn-primary btn-lg btn-block" onClick={placeOrder} disabled={busy || !address}>
              {busy ? "Processing..." : `Pay ₹${total.toFixed(2)}`}
            </button>
            <p className="muted small" style={{ textAlign: "center", marginBottom: 0 }}>
              UPI, cards, net banking and wallets via Razorpay. We never see your card details.
            </p>
            <div className="pay-logos">
              <img src={gpay} alt="Google Pay" />
              <img src={applepay} alt="Apple Pay" />
              <img src={paypal} alt="PayPal" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
