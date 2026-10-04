import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { assetUrl, errorMessage } from "../utils/api";
import { useToast } from "../context/ToastContext";
import StatusBadge from "../components/StatusBadge";
import { rupees } from "../utils/format";
import { formatAddress } from "../components/AddressForm";

const STEPS = ["paid", "processing", "shipped", "delivered"];

function Progress({ status }) {
  if (status === "cancelled" || status === "pending_payment") return null;
  const current = STEPS.indexOf(status === "sent_to_delivery" ? "shipped" : status);
  return (
    <div className="progress-steps">
      {["Paid", "Being made", "Shipped", "Delivered"].map((label, i) => (
        <span key={label} className={i <= current ? "done" : ""}>{label}</span>
      ))}
    </div>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");
  const toast = useToast();

  const load = () =>
    api
      .get("/orders/customer")
      .then((res) => setOrders(res.data))
      .catch((err) => setError(errorMessage(err, "Couldn't load your orders.")));

  useEffect(() => {
    load();
  }, []);

  const cancel = async (orderId) => {
    if (!window.confirm("Cancel this order?")) return;
    try {
      const res = await api.post(`/orders/${orderId}/cancel`);
      toast.success(res.data.message);
      load();
    } catch (err) {
      toast.error(errorMessage(err, "This order couldn't be cancelled."));
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>My Orders</h1>
          <p>Track your orders and their delivery.</p>
        </div>
      </div>

      {error && <div className="notice notice-danger">{error}</div>}
      {!orders && !error && <div className="spinner" />}
      {orders && orders.length === 0 && (
        <div className="empty">
          <h3>No orders yet</h3>
          <p>When you place an order, it will show up here.</p>
          <Link to="/customize" className="btn btn-primary">Design something</Link>
        </div>
      )}

      {orders?.map((order) => {
        const canCancel =
          order.paymentStatus === "pending" ||
          (order.paymentStatus === "paid" && order.lines.every((l) => ["paid", "cancelled"].includes(l.status)) && order.lines.some((l) => l.status === "paid"));
        return (
          <div className="card order-card" key={order.orderId}>
            <div className="row-between">
              <div>
                <strong>{order.orderId}</strong>
                <div className="muted small">
                  {new Date(order.createdAt).toLocaleString()} · Total ₹{Number(order.amount).toFixed(2)}
                  {order.discount > 0 && ` (saved ₹${order.discount.toFixed(2)})`}
                </div>
              </div>
              {canCancel && <button className="btn btn-danger btn-sm" onClick={() => cancel(order.orderId)}>Cancel order</button>}
            </div>
            {order.address?.line && <p className="muted small" style={{ margin: "0.5rem 0 0" }}>Delivering to {order.address.name ? `${order.address.name}, ` : ""}{formatAddress(order.address)}</p>}

            {order.lines.map((line) => (
              <div className="order-line" key={line._id}>
                <img className="thumb" src={assetUrl(line.imagePath || line.productId?.image)} alt="" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row">
                    <strong>{line.productName || line.productId?.name || "Product"}</strong>
                    <StatusBadge status={line.status} />
                  </div>
                  <div className="muted small">
                    {line.quantity} × {rupees(line.unitPrice ?? line.productId?.price)}
                    {line.retailerId?.username && ` · sold by ${line.retailerId.username}`}
                  </div>
                  <Progress status={line.status} />
                  {line.trackingId && (
                    <div className="small">Courier: {line.courier || "-"} · Tracking ID: <b>{line.trackingId}</b></div>
                  )}
                  <div className="row small" style={{ marginTop: "0.35rem" }}>
                    {line.productId?._id && line.designId && (
                      <Link to={`/products/${line.productId._id}?design=${line.designId}`}>Order this design again</Link>
                    )}
                    {line.productId?._id && ["delivered", "shipped", "paid", "processing", "sent_to_delivery"].includes(line.status) && (
                      <Link to={`/products/${line.productId._id}`}>Write a review</Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
