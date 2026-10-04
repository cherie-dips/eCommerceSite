import { useState } from "react";

export const EMPTY_ADDRESS = { label: "Home", name: "", phone: "", line: "", city: "", state: "", pincode: "" };

export const formatAddress = (a) => [a.line, a.city, a.state, a.pincode].filter(Boolean).join(", ");

// Delivery address form. onSave gets the cleaned address.
export default function AddressForm({ initial, onSave, onCancel, saveLabel = "Save address", showDefault = false }) {
  const [address, setAddress] = useState({ ...EMPTY_ADDRESS, ...(initial || {}) });
  const [error, setError] = useState("");
  const set = (key) => (e) => setAddress((a) => ({ ...a, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const cleaned = Object.fromEntries(Object.entries(address).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v]));
    if (!cleaned.name || !cleaned.line || !cleaned.pincode) {
      setError("Please fill in the name, address and pincode.");
      return;
    }
    if (!/^[0-9+\-\s]{7,15}$/.test(cleaned.phone)) {
      setError("Please enter a phone number the courier can call.");
      return;
    }
    if (!/^\d{6}$/.test(cleaned.pincode)) {
      setError("Pincode should be 6 digits.");
      return;
    }
    setError("");
    onSave(cleaned);
  };

  return (
    <form onSubmit={submit} className="address-form">
      <div className="grid-2">
        <div className="field">
          <label>Full name</label>
          <input className="input" value={address.name} onChange={set("name")} autoComplete="name" />
        </div>
        <div className="field">
          <label>Phone</label>
          <input className="input" value={address.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" />
        </div>
      </div>
      <div className="field">
        <label>Address</label>
        <textarea className="textarea" rows={2} value={address.line} onChange={set("line")} placeholder="House / flat, street, area" autoComplete="street-address" />
      </div>
      <div className="grid-3">
        <div className="field">
          <label>City</label>
          <input className="input" value={address.city} onChange={set("city")} autoComplete="address-level2" />
        </div>
        <div className="field">
          <label>State</label>
          <input className="input" value={address.state} onChange={set("state")} autoComplete="address-level1" />
        </div>
        <div className="field">
          <label>Pincode</label>
          <input className="input" value={address.pincode} onChange={set("pincode")} inputMode="numeric" maxLength={6} autoComplete="postal-code" />
        </div>
      </div>
      {showDefault && (
        <label className="checkbox" style={{ marginBottom: "0.75rem" }}>
          <input type="checkbox" checked={Boolean(address.isDefault)} onChange={set("isDefault")} /> Use as my default address
        </label>
      )}
      {error && <div className="form-error">{error}</div>}
      <div className="row">
        <button className="btn btn-primary" type="submit">{saveLabel}</button>
        {onCancel && <button className="btn btn-secondary" type="button" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
