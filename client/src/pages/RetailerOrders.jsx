import { useEffect, useMemo, useState } from "react";
import api, { assetUrl, errorMessage } from "../utils/api";
import { useToast } from "../context/ToastContext";
import StatusBadge from "../components/StatusBadge";
import { rupees } from "../utils/format";
import { formatAddress } from "../components/AddressForm";

const FILTERS = [
  ["todo", "To do", ["paid", "processing"]],
  ["shipped", "Shipped", ["shipped", "sent_to_delivery"]],
  ["delivered", "Delivered", ["delivered"]],
  ["cancelled", "Cancelled", ["cancelled"]],
  ["all", "All", null],
];

function ShipForm({ line, onSave, onCancel }) {
  const [courier, setCourier] = useState(line.courier || "");
  const [trackingId, setTrackingId] = useState(line.trackingId || "");
  return (
    <form
      className="ship-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ status: "shipped", courier, trackingId });
      }}
    >
      <input className="input" placeholder="Courier (e.g. Delhivery)" value={courier} onChange={(e) => setCourier(e.target.value)} />
      <input className="input" placeholder="Tracking ID" value={trackingId} onChange={(e) => setTrackingId(e.target.value)} required />
      <div className="row">
        <button className="btn btn-primary btn-sm">Mark shipped</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function RetailerOrders() {
  const toast = useToast();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("todo");
  const [shipping, setShipping] = useState(null);

  const load = () =>
    api
      .get("/orders/retailer")
      .then((res) => setOrders(res.data))
      .catch((err) => setError("Failed to fetch orders: " + errorMessage(err, err.message)));

  useEffect(() => {
    load();
  }, []);

  const update = async (line, changes) => {
    if (changes.status === "cancelled" && !window.confirm("Cancel this item? The customer will be refunded for it.")) return;
    try {
      const res = await api.patch(`/orders/lines/${line._id}`, changes);
      setOrders((list) => list.map((l) => (l._id === line._id ? { ...l, ...res.data, productId: l.productId, customerId: l.customerId } : l)));
      setShipping(null);
      toast.success("Order updated.");
    } catch (err) {
      toast.error(errorMessage(err, "The order couldn't be updated."));
    }
  };

  const counts = useMemo(() => {
    const result = {};
    for (const [key, , statuses] of FILTERS) {
      result[key] = (orders || []).filter((l) => !statuses || statuses.includes(l.status)).length;
    }
    return result;
  }, [orders]);

  const statuses = FILTERS.find(([key]) => key === filter)[2];
  const visible = (orders || []).filter((l) => !statuses || statuses.includes(l.status));

  return (
    <div className="page" style={{ maxWidth: 1300 }}>
      <div className="page-header">
        <div>
          <h1>Orders Received</h1>
          <p>Download the print files, make the items, then add the courier tracking ID.</p>
        </div>
      </div>

      <div className="tabs">
        {FILTERS.map(([key, label]) => (
          <button key={key} className={`tab ${filter === key ? "active" : ""}`} onClick={() => setFilter(key)}>
            {label} {orders && <span className="muted">({counts[key]})</span>}
          </button>
        ))}
      </div>

      {error && <div className="notice notice-danger">{error}</div>}
      {!orders && !error && <div className="spinner" />}
      {orders && visible.length === 0 && (
        <div className="empty">
          <h3>Nothing here</h3>
          <p>{filter === "todo" ? "You're all caught up." : "No orders in this list yet."}</p>
        </div>
      )}

      {visible.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Price Paid</th>
                <th>Ship To</th>
                <th>Design</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((line) => {
                // Older orders were saved before quantity/price paid were stored.
                const quantity = line.quantity || 1;
                const unitPrice = line.unitPrice ?? line.productId?.price;
                return (
                  <tr key={line._id}>
                    <td>
                      <strong className="small">{line.orderId || line._id.slice(-8)}</strong>
                      <div className="muted small">{new Date(line.createdAt).toLocaleString()}</div>
                    </td>
                    <td>
                      {line.productName || line.productId?.name || "Product Deleted"}
                    </td>
                    <td>{quantity}</td>
                    <td>
                      {unitPrice != null ? (
                        <>
                          ₹{(unitPrice * quantity).toFixed(2)}
                          {quantity > 1 && <div className="muted small">{rupees(unitPrice)} each</div>}
                        </>
                      ) : "N/A"}
                    </td>
                    <td className="small" style={{ minWidth: 180 }}>
                      {line.address?.line ? (
                        <>
                          <strong>{line.address.name || line.customerId?.username}</strong>
                          {line.address.phone && <div>{line.address.phone}</div>}
                          <div>{formatAddress(line.address)}</div>
                        </>
                      ) : (
                        <span className="muted">Not provided</span>
                      )}
                      {line.customerId?.email && <div className="muted">{line.customerId.email}</div>}
                    </td>
                    <td>
                      {line.imagePath ? (
                        <div className="stack" style={{ gap: 4 }}>
                          <a href={assetUrl(line.imagePath)} target="_blank" rel="noreferrer">
                            <img className="thumb" src={assetUrl(line.imagePath)} alt="Customer design" />
                          </a>
                          {(line.printFiles || []).map((f) => (
                            <a key={f.path} href={assetUrl(f.path)} target="_blank" rel="noreferrer" download className="small">
                              ⬇ Print file ({f.view})
                            </a>
                          ))}
                          {!line.printFiles?.length && (
                            <a href={assetUrl(line.imagePath)} target="_blank" rel="noreferrer" className="small">View Custom Design</a>
                          )}
                        </div>
                      ) : (
                        <span className="muted small">No custom image</span>
                      )}
                    </td>
                    <td style={{ minWidth: 190 }}>
                      <StatusBadge status={line.status} />
                      {line.trackingId && <div className="small">{line.courier} {line.trackingId}</div>}
                      {shipping === line._id ? (
                        <ShipForm line={line} onSave={(changes) => update(line, changes)} onCancel={() => setShipping(null)} />
                      ) : (
                        <div className="row" style={{ marginTop: 6 }}>
                          {line.status === "paid" && <button className="btn btn-secondary btn-sm" onClick={() => update(line, { status: "processing" })}>Start making</button>}
                          {["paid", "processing"].includes(line.status) && <button className="btn btn-primary btn-sm" onClick={() => setShipping(line._id)}>Ship</button>}
                          {["shipped", "sent_to_delivery"].includes(line.status) && <button className="btn btn-primary btn-sm" onClick={() => update(line, { status: "delivered" })}>Mark delivered</button>}
                          {["paid", "processing"].includes(line.status) && <button className="btn btn-ghost btn-sm" onClick={() => update(line, { status: "cancelled" })}>Cancel</button>}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
