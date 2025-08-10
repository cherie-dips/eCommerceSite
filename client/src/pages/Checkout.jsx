import React, { useState } from "react"; 
import "../styles/CheckoutPage.css";
import gpay from "../assets/gpay.png"; 
import applepay from "../assets/apple-pay.png";
import paypal from "../assets/paypal.png";

const paymentMethods = [
  { id: "google", label: "Google Pay", icon: gpay },
  { id: "apple", label: "Apple Pay", icon: applepay },
  { id: "paypal", label: "PayPal", icon: paypal },
];

export default function Checkout() {
  const [method, setMethod] = useState("card");
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCVV] = useState("");
  const [amount] = useState(354);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const handleAltPayment = (id) => {
    setMethod(id);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 1200);
  };

  function validate() {
    const newErrors = {};
    if (!cardNumber.match(/^\d{4} ?\d{4} ?\d{4} ?\d{4}$/)) {
      newErrors.cardNumber = "Enter a valid 16-digit card number";
    }
    if (!cardHolder.trim()) newErrors.cardHolder = "Name required";
    if (!expiry.match(/^\d{2}\/\d{2}$/)) newErrors.expiry = "MM/YY required";
    if (!cvv.match(/^\d{3}$/)) newErrors.cvv = "3-digit CVV required";
    return newErrors;
  }

  function handlePay(e) {
    e.preventDefault();
    if (method !== "card") return;
    const newErrors = validate();
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      setSuccess(false);
      return;
    }
    setErrors({});
    setSuccess(true);
    setTimeout(() => setSuccess(false), 1200);
  }

  return (
    <div className="checkout-page-content">
      <div className="checkout-layout">
        {/* Left Cards */}
        <div className="checkout-cards">
          <div className="checkout-cards-title">
            <h1>Payments</h1>
          </div>
          <div className="card-stack">
            <div className="credit-card card1">
              <div className="card-type">VISA</div>
              <div className="card-num">4455 5461 6118 6164</div>
              <div className="card-label">Existing Card</div>
            </div>
            <div className="credit-card card2">
              <div className="card-type">VISA</div>
              <div className="card-num">4455 5461 6118 6164</div>
              <div className="card-label">Existing Card</div>
            </div>
            <div className="credit-card card3">
              <div className="card-type">MasterCard</div>
              <div className="card-num">4455 5461 6118 6164</div>
              <div className="card-label">Existing Card</div>
            </div>
          </div>
        </div>

        {/* Right Form */}
        <div className="checkout-form-area">
          <form className="checkout-form" onSubmit={handlePay} autoComplete="off">
            <div className="title-row">
              <h2>Payment details</h2>
              <span className="qr-code">QR code <span style={{ color: "#a384ff" }}>📎</span></span>
            </div>

            {/* Alt payment methods */}
            <div className="alt-options-row">
              {paymentMethods.map(opt => (
                <button
                  type="button"
                  key={opt.id}
                  className={`alt-pay-btn ${method === opt.id ? "selected" : ""}`}
                  onClick={() => handleAltPayment(opt.id)}
                >
                  <img src={opt.icon} alt={opt.label} className="pay-logo" />
                  <span>{opt.label}</span>
                </button>
              ))}
              <span className="alt-or">Or</span>
            </div>

            {/* Card Details */}
            <div className="input-row">
              <label>Card Number</label>
              <input
                type="text"
                maxLength={19}
                placeholder="5678 **** **** 1267"
                value={cardNumber}
                onChange={e => setCardNumber(e.target.value.replace(/[^\d ]/g, ""))}
              />
              {errors.cardNumber && <div className="err">{errors.cardNumber}</div>}
            </div>

            <div className="input-row">
              <label>Card Holder Name</label>
              <input
                type="text"
                placeholder="Cameron Williamson"
                value={cardHolder}
                onChange={e => setCardHolder(e.target.value)}
              />
              {errors.cardHolder && <div className="err">{errors.cardHolder}</div>}
            </div>

            <div className="row-cols-2">
              <div className="input-row">
                <label>Expiry Date</label>
                <input
                  type="text"
                  placeholder="mm/yy"
                  maxLength={5}
                  value={expiry}
                  onChange={e => setExpiry(e.target.value.replace(/[^\d/]/g, ""))}
                />
                {errors.expiry && <div className="err">{errors.expiry}</div>}
              </div>
              <div className="input-row">
                <label>CVV/CVV2</label>
                <input
                  type="password"
                  placeholder="xxx"
                  maxLength={3}
                  value={cvv}
                  onChange={e => setCVV(e.target.value.replace(/[^\d]/g, ""))}
                />
                {errors.cvv && <div className="err">{errors.cvv}</div>}
              </div>
            </div>

            <div className="checkout-summary">
              <div>Total Amount: <b>₹{amount}</b></div>
            </div>

            <button type="submit" className="pay-btn">Pay ₹{amount}</button>
            {success && <div className="pay-success">Payment Successful!</div>}
          </form>
        </div>
      </div>
    </div>
  );
}