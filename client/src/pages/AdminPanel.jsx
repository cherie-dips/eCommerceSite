import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { assetUrl, errorMessage } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import StatusBadge from "../components/StatusBadge";

function Overview() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api.get("/admin/stats").then((res) => setStats(res.data)).catch(() => {});
  }, []);
  if (!stats) return <div className="spinner" />;
  const tiles = [
    ["Customers", stats.users],
    ["Sellers", stats.retailers],
    ["Sellers waiting", stats.pendingRetailers],
    ["Products in store", stats.products],
    ["Paid orders", stats.orders],
    ["Items to fulfil", stats.openLines],
    ["Revenue", `₹${Math.round(stats.revenue).toLocaleString("en-IN")}`],
  ];
  return (
    <div className="stats">
      {tiles.map(([label, value]) => (
        <div className="stat" key={label}><div className="stat-label">{label}</div><div className="stat-value">{value}</div></div>
      ))}
    </div>
  );
}

function Users({ pendingOnly }) {
  const { user: me } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");

  const load = () =>
    api
      .get("/admin/users", { params: { pending: pendingOnly ? "true" : undefined, search: search || undefined, role: role || undefined } })
      .then((res) => setUsers(res.data))
      .catch(() => setUsers([]));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingOnly, role]);

  const change = async (user, changes, message) => {
    try {
      await api.patch(`/admin/users/${user._id}`, changes);
      toast.success(message);
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't update this user."));
    }
  };

  return (
    <>
      {!pendingOnly && (
        <form className="row" style={{ marginBottom: "1rem" }} onSubmit={(e) => { e.preventDefault(); load(); }}>
          <input className="input" style={{ maxWidth: 280 }} placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="select" style={{ width: "auto" }} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">All roles</option>
            <option value="user">Customers</option>
            <option value="retailer">Sellers</option>
            <option value="admin">Admins</option>
          </select>
          <button className="btn btn-secondary">Search</button>
        </form>
      )}
      {!users && <div className="spinner" />}
      {users?.length === 0 && <div className="empty"><h3>{pendingOnly ? "No sellers waiting for approval" : "No users found"}</h3></div>}
      {users?.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>{u.username}</td>
                  <td>{u.email} {u.emailVerified ? "" : <span className="badge badge-warning">not confirmed</span>}</td>
                  <td>
                    {u.role}
                    {u.role === "retailer" && !u.approved && <span className="badge badge-warning" style={{ marginLeft: 6 }}>waiting</span>}
                  </td>
                  <td className="small">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="row" style={{ flexWrap: "nowrap" }}>
                      {u.role === "retailer" && !u.approved && (
                        <button className="btn btn-primary btn-sm" onClick={() => change(u, { approved: true }, `${u.username} can now sell.`)}>Approve</button>
                      )}
                      {u.role === "retailer" && u.approved && (
                        <button className="btn btn-danger btn-sm" onClick={() => change(u, { approved: false }, `${u.username} can no longer add products.`)}>Block selling</button>
                      )}
                      {!pendingOnly && String(u._id) !== String(me?.id) && (
                        <select
                          className="select"
                          style={{ width: "auto" }}
                          value={u.role}
                          onChange={(e) => window.confirm(`Make ${u.username} a ${e.target.value}?`) && change(u, { role: e.target.value }, "Role changed.")}
                        >
                          <option value="user">Customer</option>
                          <option value="retailer">Seller</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Products() {
  const toast = useToast();
  const [products, setProducts] = useState(null);
  const load = () => api.get("/admin/products").then((res) => setProducts(res.data)).catch(() => setProducts([]));
  useEffect(() => {
    load();
  }, []);

  const toggle = async (p) => {
    try {
      await api.patch(`/admin/products/${p._id}`, { active: p.active === false });
      toast.success(p.active === false ? "Product is back in the store." : "Product hidden from the store.");
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't change this product."));
    }
  };

  if (!products) return <div className="spinner" />;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th></th><th>Product</th><th>Seller</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {products.map((p) => (
            <tr key={p._id}>
              <td><img className="thumb" src={assetUrl(p.image)} alt="" /></td>
              <td><Link to={`/products/${p._id}`}>{p.name}</Link><div className="muted small">{p.category}</div></td>
              <td className="small">{p.retailerId?.username}<div className="muted">{p.retailerId?.email}</div></td>
              <td>₹{p.price}</td>
              <td>{p.stock}</td>
              <td>{p.active === false ? <span className="badge">Hidden</span> : <span className="badge badge-success">In store</span>}</td>
              <td><button className={`btn btn-sm ${p.active === false ? "btn-secondary" : "btn-danger"}`} onClick={() => toggle(p)}>{p.active === false ? "Show" : "Hide"}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Orders() {
  const [orders, setOrders] = useState(null);
  useEffect(() => {
    api.get("/orders").then((res) => setOrders(res.data)).catch(() => setOrders([]));
  }, []);
  if (!orders) return <div className="spinner" />;
  if (!orders.length) return <div className="empty"><h3>No orders yet</h3></div>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th>Order</th><th>Item</th><th>Customer</th><th>Seller</th><th>Paid</th><th>Status</th></tr></thead>
        <tbody>
          {orders.map((l) => (
            <tr key={l._id}>
              <td className="small"><strong>{l.orderId}</strong><div className="muted">{new Date(l.createdAt).toLocaleString()}</div></td>
              <td>{l.quantity || 1} × {l.productName || l.productId?.name}</td>
              <td className="small">{l.customerId?.username}<div className="muted">{l.customerId?.email}</div></td>
              <td className="small">{l.retailerId?.username}</td>
              <td>₹{((l.unitPrice ?? l.productId?.price ?? 0) * (l.quantity || 1)).toFixed(2)}</td>
              <td><StatusBadge status={l.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TABS = [
  ["overview", "Overview"],
  ["sellers", "Sellers to approve"],
  ["users", "Users"],
  ["products", "Products"],
  ["orders", "Orders"],
];

export default function AdminPanel() {
  const [tab, setTab] = useState("overview");
  return (
    <div className="page" style={{ maxWidth: 1300 }}>
      <div className="page-header">
        <div>
          <h1>Admin Panel</h1>
          <p>Approve sellers, manage users and products, and see every order.</p>
        </div>
      </div>
      <div className="tabs">
        {TABS.map(([key, label]) => (
          <button key={key} className={`tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>
      {tab === "overview" && <Overview />}
      {tab === "sellers" && <Users pendingOnly />}
      {tab === "users" && <Users />}
      {tab === "products" && <Products />}
      {tab === "orders" && <Orders />}
    </div>
  );
}
