import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { assetUrl, errorMessage } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function RetailerProducts() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [products, setProducts] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  const load = () => {
    api
      .get("/retailer-products")
      .then((res) => setProducts(res.data))
      .catch((err) => setError("Failed to fetch products: " + errorMessage(err, err.message)));
    api.get("/retailer/stats").then((res) => setStats(res.data)).catch(() => {});
  };

  useEffect(() => {
    refreshUser();
    load();
  }, [refreshUser]);

  const setActive = async (product, active) => {
    try {
      if (active) await api.put(`/products/${product._id}`, { active: true });
      else await api.delete(`/products/${product._id}`);
      toast.success(active ? "Product is back in the store." : "Product removed from the store.");
      load();
    } catch (err) {
      toast.error(errorMessage(err, "The product couldn't be changed."));
    }
  };

  const saveStock = async (product, stock) => {
    const value = Number(stock);
    if (!Number.isInteger(value) || value < 0 || value === product.stock) return;
    try {
      await api.put(`/products/${product._id}`, { stock: value });
      setProducts((list) => list.map((p) => (p._id === product._id ? { ...p, stock: value } : p)));
      toast.success("Stock updated.");
    } catch (err) {
      toast.error(errorMessage(err, "Stock couldn't be updated."));
    }
  };

  const waiting = user?.role === "retailer" && user?.approved === false;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>My Products</h1>
          <p>Manage what you sell and keep stock up to date.</p>
        </div>
        <div className="row">
          <Link to="/retailer/orders" className="btn btn-secondary">Orders</Link>
          <Link to="/retailer/products/new" className="btn btn-primary" aria-disabled={waiting}>＋ Add product</Link>
        </div>
      </div>

      {waiting && (
        <div className="notice notice-warning">
          Your seller account is waiting for approval by the Flagzen team. You'll be able to add products once it's approved.
        </div>
      )}

      {stats && (
        <div className="stats">
          <div className="stat"><div className="stat-label">Products</div><div className="stat-value">{stats.products}</div></div>
          <div className="stat"><div className="stat-label">Orders</div><div className="stat-value">{stats.orders}</div></div>
          <div className="stat"><div className="stat-label">To fulfil</div><div className="stat-value">{stats.toFulfil}</div></div>
          <div className="stat"><div className="stat-label">Revenue</div><div className="stat-value">₹{Math.round(stats.revenue).toLocaleString("en-IN")}</div></div>
        </div>
      )}

      {error && <div className="notice notice-danger">{error}</div>}
      {!products && !error && <div className="spinner" />}
      {products?.length === 0 && (
        <div className="empty">
          <h3>You haven't added any products yet</h3>
          {!waiting && <Link to="/retailer/products/new" className="btn btn-primary">Add your first product</Link>}
        </div>
      )}
      {products?.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th></th>
                <th>Product</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Sold</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p._id}>
                  <td><img className="thumb" src={assetUrl(p.image)} alt="" /></td>
                  <td>
                    <strong>{p.name}</strong>
                    <div className="muted small">{p.category}{p.customizable !== false ? " · customisable" : ""}</div>
                  </td>
                  <td>₹{p.price}</td>
                  <td>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      defaultValue={p.stock}
                      style={{ width: 90 }}
                      onBlur={(e) => saveStock(p, e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                      aria-label={`Stock for ${p.name}`}
                    />
                    {p.stock === 0 && <div className="small" style={{ color: "#b91c1c" }}>Out of stock</div>}
                  </td>
                  <td>{p.soldCount || 0}</td>
                  <td>{p.active === false ? <span className="badge">Removed</span> : <span className="badge badge-success">In store</span>}</td>
                  <td>
                    <div className="row" style={{ flexWrap: "nowrap" }}>
                      <Link to={`/retailer/products/${p._id}/edit`} className="btn btn-secondary btn-sm">Edit</Link>
                      {p.active === false ? (
                        <button className="btn btn-ghost btn-sm" onClick={() => setActive(p, true)}>Put back</button>
                      ) : (
                        <>
                          <Link to={`/products/${p._id}`} className="btn btn-ghost btn-sm">View</Link>
                          <button className="btn btn-danger btn-sm" onClick={() => window.confirm(`Remove "${p.name}" from the store?`) && setActive(p, false)}>Remove</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
