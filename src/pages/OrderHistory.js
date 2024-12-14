import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const OrderHistory = () => {
  const [groupedOrders, setGroupedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch order history from the backend
  const fetchOrderHistory = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Token not found. Redirecting to login.");
      navigate("/");
      return;
    }

    try {
      const response = await axios.get(
        "http://localhost/laundry/public/api/driver/orders/processed",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const orders = response.data.orders || [];
      const grouped = groupOrdersByIdAndAssigned(orders);
      setGroupedOrders(grouped);
    } catch (error) {
      console.error("Error fetching order history:", error.message);
      toast.error("Failed to fetch order history. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Group orders by `order_id` and include all statuses with `assigned_for`
  const groupOrdersByIdAndAssigned = (orders) => {
    const grouped = orders.reduce((acc, order) => {
      const { order_id, order_status, assign_for, updated_at, pick_date, pick_hour, delivery_date, delivery_hour } = order;

      if (!acc[order_id]) {
        acc[order_id] = {
          order_id,
          order_code: order.order_code,
          address: order.address,
          pick_date: null,
          pick_hour: null,
          delivery_date: null,
          delivery_hour: null,
          statuses: [],
        };
      }

      // Set pickup details if "Pickup Scheduled"
      if (order_status === "Pickup Scheduled") {
        acc[order_id].pick_date = pick_date;
        acc[order_id].pick_hour = pick_hour;
      }

      // Set delivery details if "Delivery Scheduled"
      if (order_status === "Delivery Scheduled") {
        acc[order_id].delivery_date = delivery_date;
        acc[order_id].delivery_hour = delivery_hour;
      }

      acc[order_id].statuses.push({
        order_status,
        assign_for,
        updated_at,
      });

      return acc;
    }, {});

    return Object.values(grouped);
  };

  useEffect(() => {
    fetchOrderHistory();
  }, []);

  // Format date for better readability
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dateString));
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Order History</h1>
      {loading ? (
        <div style={styles.loadingContainer}>
          <p>Loading...</p>
        </div>
      ) : groupedOrders.length === 0 ? (
        <p>No order history available.</p>
      ) : (
        <ul style={styles.orderList}>
          {groupedOrders.map((order) => (
            <li key={order.order_id} style={styles.orderItem}>
              <p>
                <strong>Order ID:</strong> {order.order_id}
              </p>
              <p>
                <strong>Order Code:</strong> {order.order_code}
              </p>
              <p>
                <strong>Address:</strong> {order.address}
              </p>
              {/* Conditionally Render Pickup/Delivery Details */}
              {order.pick_date && order.pick_hour && (
                <p>
                  <strong>Pick-up Date:</strong> {order.pick_date}{" "}
                  <strong>Time:</strong> {order.pick_hour}
                </p>
              )}
              {order.delivery_date && order.delivery_hour && (
                <p>
                  <strong>Delivery Date:</strong> {order.delivery_date}{" "}
                  <strong>Time:</strong> {order.delivery_hour}
                </p>
              )}
              <p>
                <strong>Status History:</strong>
              </p>
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.statuses.map((status, index) => (
                      <tr key={index}>
                        <td style={styles.td}>{status.assign_for || "N/A"}</td>
                        <td style={styles.td}>{formatDate(status.updated_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </li>
          ))}
        </ul>
      )}
      <button style={styles.backButton} onClick={() => navigate(-1)}>
        Back to Dashboard
      </button>
    </div>
  );
};

const styles = {
  container: {
    padding: "10px",
  },
  title: {
    textAlign: "center",
    marginBottom: "20px",
  },
  orderList: {
    listStyleType: "none",
    padding: 0,
  },
  orderItem: {
    padding: "10px",
    marginBottom: "10px",
    backgroundColor: "#e6e6e6",
    borderRadius: "5px",
  },
  tableContainer: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "10px",
  },
  th: {
    backgroundColor: "#007BFF",
    color: "#fff",
    padding: "10px",
    textAlign: "left",
  },
  td: {
    border: "1px solid #ddd",
    padding: "10px",
    textAlign: "left",
  },
  backButton: {
    marginTop: "20px",
    backgroundColor: "#007BFF",
    color: "#fff",
    padding: "10px 20px",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
};

export default OrderHistory;
