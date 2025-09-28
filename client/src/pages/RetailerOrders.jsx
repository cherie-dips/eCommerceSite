import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

export default function RetailerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { token, user } = useAuth();

  useEffect(() => {
    const fetchRetailerOrders = async () => {
      try {
        setLoading(true);
        const response = await axios.get("http://localhost:5050/api/orders/retailer", {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setOrders(response.data);
      } catch (err) {
        setError("Failed to fetch orders: " + (err.response?.data?.error || err.message));
      } finally {
        setLoading(false);
      }
    };

    if (token && user?.role === 'retailer') {
      fetchRetailerOrders();
    }
  }, [token, user]);

  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Retailer: Orders Received</h2>
        <p>Loading your orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Retailer: Orders Received</h2>
        <p style={{ color: 'red' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Retailer: Orders Received</h2>
      
      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>You haven't received any orders yet.</p>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Orders will appear here when customers purchase and customize your products.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Order ID</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Product</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Customer</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Price</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Custom Image</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id}>
                  <td style={{ padding: 8 }}>{order.orderId || order._id.slice(-8)}</td>
                  <td style={{ padding: 8 }}>
                    {order.productId ? order.productId.name : 'Product Deleted'}
                  </td>
                  <td style={{ padding: 8 }}>
                    {order.customerId ? (
                      <div>
                        <div>{order.customerId.username}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{order.customerId.email}</div>
                      </div>
                    ) : 'Customer Deleted'}
                  </td>
                  <td style={{ padding: 8 }}>
                    ₹{order.productId ? order.productId.price : 'N/A'}
                  </td>
                  <td style={{ padding: 8 }}>
                    {order.imagePath ? (
                      <a 
                        href={`http://localhost:5050/${order.imagePath}`} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ color: '#007bff', textDecoration: 'underline' }}
                      >
                        View Custom Design
                      </a>
                    ) : (
                      <span style={{ color: '#999' }}>No custom image</span>
                    )}
                  </td>
                  <td style={{ padding: 8 }}>{new Date(order.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


