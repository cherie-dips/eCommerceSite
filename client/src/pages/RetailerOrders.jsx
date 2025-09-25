import { useEffect, useState } from "react";
import axios from "axios";

export default function RetailerOrders() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:5050/api/orders").then((res) => setOrders(res.data));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Retailer: Orders Received</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Order ID</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Product</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Customer</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Image</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Date</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o._id}>
              <td style={{ padding: 8 }}>{o.orderId}</td>
              <td style={{ padding: 8 }}>{o.productId}</td>
              <td style={{ padding: 8 }}>{o.customerId}</td>
              <td style={{ padding: 8 }}>
                {o.imagePath ? (
                  <a href={`/${o.imagePath}`} target="_blank" rel="noreferrer">View</a>
                ) : (
                  "-"
                )}
              </td>
              <td style={{ padding: 8 }}>{new Date(o.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


