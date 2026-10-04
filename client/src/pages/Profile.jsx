import { useEffect, useState } from "react";
import api, { errorMessage } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AddressForm, { formatAddress } from "../components/AddressForm";

export default function Profile() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [username, setUsername] = useState(user?.username || "");
  const [addresses, setAddresses] = useState([]);
  const [editing, setEditing] = useState(null); // address id, "new" or null
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });

  useEffect(() => {
    api.get("/users/me").then((res) => {
      setAddresses(res.data.addresses);
      updateUser(res.data.user);
    }).catch(() => {});
  }, [updateUser]);

  const saveName = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put("/users/me", { username });
      updateUser(res.data.user);
      toast.success("Name updated.");
    } catch (err) {
      toast.error(errorMessage(err, "Your name couldn't be changed."));
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    try {
      await api.put("/users/me/password", passwords);
      setPasswords({ currentPassword: "", newPassword: "" });
      toast.success("Password changed.");
    } catch (err) {
      toast.error(errorMessage(err, "Your password couldn't be changed."));
    }
  };

  const saveAddress = async (address) => {
    try {
      const res = editing === "new"
        ? await api.post("/users/me/addresses", address)
        : await api.put(`/users/me/addresses/${editing}`, address);
      setAddresses(res.data.addresses);
      setEditing(null);
      toast.success("Address saved.");
    } catch (err) {
      toast.error(errorMessage(err, "The address couldn't be saved."));
    }
  };

  const removeAddress = async (id) => {
    const res = await api.delete(`/users/me/addresses/${id}`);
    setAddresses(res.data.addresses);
  };

  const resend = async () => {
    try {
      const res = await api.post("/auth/resend-verification");
      toast.success(res.data.message);
    } catch (err) {
      toast.error(errorMessage(err, "We couldn't send the email."));
    }
  };

  return (
    <div className="page page-narrow">
      <div className="page-header">
        <div>
          <h1>Profile</h1>
          <p>{user?.email}</p>
        </div>
      </div>

      {!user?.emailVerified && (
        <div className="notice notice-warning row-between">
          <span>Please confirm your email address. We sent you a link when you signed up.</span>
          <button className="btn btn-secondary btn-sm" onClick={resend}>Send the link again</button>
        </div>
      )}
      {user?.role === "retailer" && !user?.approved && (
        <div className="notice notice-info">Your seller account is waiting for approval by the Flagzen team.</div>
      )}

      <div className="card">
        <h2 className="section-title">Your name</h2>
        <form className="row" onSubmit={saveName}>
          <input className="input" style={{ flex: 1, minWidth: 200 }} value={username} onChange={(e) => setUsername(e.target.value)} maxLength={60} />
          <button className="btn btn-primary">Save</button>
        </form>
      </div>

      <div className="card">
        <div className="row-between">
          <h2 className="section-title">Saved addresses</h2>
          {editing === null && <button className="btn btn-secondary btn-sm" onClick={() => setEditing("new")}>Add address</button>}
        </div>
        {editing === "new" && <AddressForm onSave={saveAddress} onCancel={() => setEditing(null)} showDefault />}
        {addresses.length === 0 && editing === null && <p className="muted">No saved addresses yet.</p>}
        {addresses.map((a) =>
          editing === a._id ? (
            <AddressForm key={a._id} initial={a} onSave={saveAddress} onCancel={() => setEditing(null)} showDefault />
          ) : (
            <div key={a._id} className="row-between" style={{ padding: "0.6rem 0", borderBottom: "1px solid #edf2f7" }}>
              <div>
                <strong>{a.name || a.label}</strong> {a.isDefault && <span className="badge badge-success">Default</span>}
                <div className="small">{formatAddress(a)}{a.phone && ` · ${a.phone}`}</div>
              </div>
              <div className="row">
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(a._id)}>Edit</button>
                <button className="btn btn-ghost btn-sm" onClick={() => removeAddress(a._id)}>Delete</button>
              </div>
            </div>
          )
        )}
      </div>

      <div className="card">
        <h2 className="section-title">Change password</h2>
        <form onSubmit={savePassword}>
          <div className="grid-2">
            <div className="field">
              <label>Current password</label>
              <input className="input" type="password" value={passwords.currentPassword} onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))} />
              <span className="hint">Leave empty if you signed up with Google.</span>
            </div>
            <div className="field">
              <label>New password</label>
              <input className="input" type="password" minLength={6} required value={passwords.newPassword} onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))} />
            </div>
          </div>
          <button className="btn btn-primary">Change password</button>
        </form>
      </div>
    </div>
  );
}
